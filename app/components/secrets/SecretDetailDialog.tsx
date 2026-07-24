'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
  Box, Typography, Chip, IconButton, CircularProgress, Tooltip, TextField, InputAdornment,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { SecretSummary, SecretDetail, Cluster } from '../../types/kubernetes';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import CopyButton from '../shared/CopyButton';

interface SecretDetailDialogProps {
  cluster: Cluster;
  secret: SecretSummary | null;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function SecretDetailDialog({ cluster, secret, open, onClose, onDeleted }: SecretDetailDialogProps) {
  const [detail, setDetail] = useState<SecretDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [keyQuery, setKeyQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  // Reset when the dialog target changes.
  useEffect(() => {
    setDetail(null);
    setRevealed(false);
    setError(null);
    setKeyQuery('');
  }, [secret?.name, secret?.namespace]);

  // Fetch decoded values on first reveal (cached afterward).
  const ensureDetail = async () => {
    if (detail || loading || !secret) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/clusters/${encodeURIComponent(cluster.name)}/secrets/${encodeURIComponent(secret.namespace)}/${encodeURIComponent(secret.name)}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load secret');
      setDetail(data.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load secret');
    } finally {
      setLoading(false);
    }
  };

  const toggleRevealAll = async () => {
    if (!revealed) await ensureDetail();
    setRevealed((prev) => !prev);
  };

  const handleDelete = async () => {
    if (!secret) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/clusters/${encodeURIComponent(cluster.name)}/secrets/${encodeURIComponent(secret.namespace)}/${encodeURIComponent(secret.name)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete secret');
      setDeleteOpen(false);
      onClose();
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete secret');
    } finally {
      setDeleting(false);
    }
  };

  if (!secret) return null;

  const q = keyQuery.toLowerCase();
  const visibleKeys = keyQuery
    ? secret.keys.filter(
        (k) =>
          k.toLowerCase().includes(q) ||
          (revealed && (detail?.data[k]?.value ?? '').toLowerCase().includes(q))
      )
    : secret.keys;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all', flex: 1 }}>{secret.name}</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {secret.keys.length > 0 && (
              <Button
                size="small"
                startIcon={
                  loading && !detail ? (
                    <CircularProgress size={14} />
                  ) : revealed ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )
                }
                onClick={toggleRevealAll}
                disabled={loading && !detail}
                sx={{ textTransform: 'none', mr: 0.5 }}
              >
                {revealed ? 'Hide all' : 'Reveal all'}
              </Button>
            )}
            <Tooltip title="Delete secret" arrow>
              <IconButton size="small" color="error" onClick={() => setDeleteOpen(true)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          <Chip label={secret.namespace} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
          <Chip label={secret.type} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
        </Box>
        {secret.keys.length > 0 && (
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            placeholder="Search keys..."
            inputRef={searchRef}
            value={keyQuery}
            onChange={(e) => setKeyQuery(e.target.value)}
            sx={{ mt: 1, '& .MuiInputBase-root': { height: 32 } }}
            InputProps={{
              startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>),
              style: { fontSize: '0.8rem' },
            }}
          />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Typography variant="body2" color="error" sx={{ mb: 1 }}>{error}</Typography>}
        {secret.keys.length === 0 && (
          <Typography variant="body2" color="text.secondary">This secret has no data keys.</Typography>
        )}
        {secret.keys.length > 0 && visibleKeys.length === 0 && (
          <Typography variant="body2" color="text.secondary">No keys match</Typography>
        )}
        {/* Responsive grid: one column on narrow, up to three on wide screens.
            Long-valued secrets (30+ keys) fill horizontal space instead of one tall list. */}
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          {visibleKeys.map((key) => {
            const entry = detail?.data[key];
            return (
              <Box key={key} sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.78rem', flex: 1, wordBreak: 'break-all' }}>
                    {key}
                  </Typography>
                  {entry?.encoding === 'base64' && (
                    <Chip label="binary" size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                  )}
                  <CopyButton value={entry?.value ?? ''} disabled={!entry} title="Copy value" />
                </Box>
                <Box
                  sx={{
                    mt: 0.25,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: 160,
                    overflow: 'auto',
                  }}
                >
                  {revealed && entry ? entry.value : '••••••••'}
                </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete secret?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete <strong>{secret.name}</strong> in namespace{' '}
            <strong>{secret.namespace}</strong>. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
