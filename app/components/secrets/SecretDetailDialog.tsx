'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, Chip, IconButton,
  CircularProgress, Tooltip,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { SecretSummary, SecretDetail, Cluster } from '../../types/kubernetes';
import CopyButton from '../shared/CopyButton';

interface SecretDetailDialogProps {
  cluster: Cluster;
  secret: SecretSummary | null;
  open: boolean;
  onClose: () => void;
}

export default function SecretDetailDialog({ cluster, secret, open, onClose }: SecretDetailDialogProps) {
  const [detail, setDetail] = useState<SecretDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  // Reset when the dialog target changes.
  useEffect(() => {
    setDetail(null);
    setRevealed(new Set());
    setError(null);
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

  const toggleReveal = async (key: string) => {
    await ensureDetail();
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!secret) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all' }}>{secret.name}</Box>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          <Chip label={secret.namespace} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
          <Chip label={secret.type} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Typography variant="body2" color="error" sx={{ mb: 1 }}>{error}</Typography>}
        {secret.keys.length === 0 && (
          <Typography variant="body2" color="text.secondary">This secret has no data keys.</Typography>
        )}
        {secret.keys.map((key) => {
          const isRevealed = revealed.has(key);
          const entry = detail?.data[key];
          return (
            <Box key={key} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.78rem', flex: 1, wordBreak: 'break-all' }}>
                  {key}
                </Typography>
                {entry?.encoding === 'base64' && (
                  <Chip label="binary" size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                )}
                <Tooltip title={isRevealed ? 'Hide' : 'Reveal'} arrow>
                  <IconButton size="small" onClick={() => toggleReveal(key)}>
                    {loading && !detail ? (
                      <CircularProgress size={14} />
                    ) : isRevealed ? (
                      <VisibilityOffIcon fontSize="small" />
                    ) : (
                      <VisibilityIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
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
                {isRevealed && entry ? entry.value : '••••••••'}
              </Box>
            </Box>
          );
        })}
      </DialogContent>
    </Dialog>
  );
}
