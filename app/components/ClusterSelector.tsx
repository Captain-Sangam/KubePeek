'use client';

import { useState } from 'react';
import {
  Box, Menu, MenuItem, ListItemText, Typography, CircularProgress, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Tooltip, Avatar,
} from '@mui/material';
import { Cluster } from '../types/kubernetes';
import {
  CloudCircle as CloudIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { saveClusterDisplayName } from '../lib/kubernetes-client';
import { useTheme } from '../lib/ThemeProvider';

interface ClusterSelectorProps {
  clusters: Cluster[];
  selectedCluster: Cluster | null;
  onSelectCluster: (cluster: Cluster) => void;
  loading: boolean;
  collapsed?: boolean;
}

// Format cluster name to be more readable.
const formatClusterName = (name: string): string => {
  let formatted = name.replace(/[_-]/g, ' ');
  formatted = formatted.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
  return formatted;
};

const clusterLabel = (c: Cluster): string => c.displayName || formatClusterName(c.name);

// Two-letter initials for the collapsed avatar.
const clusterInitials = (cluster: Cluster): string => {
  const label = clusterLabel(cluster);
  const words = label.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
};

export default function ClusterSelector({
  clusters,
  selectedCluster,
  onSelectCluster,
  loading,
  collapsed = false,
}: ClusterSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mode } = useTheme();

  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const handleEditClick = (e: React.MouseEvent, cluster: Cluster) => {
    e.stopPropagation();
    setEditingCluster(cluster);
    setDisplayName(cluster.displayName || '');
    setDialogOpen(true);
    closeMenu();
  };

  const handleSave = async () => {
    if (!editingCluster) return;
    try {
      saveClusterDisplayName(editingCluster.name, displayName);
      await fetch('/api/clusters/display-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterName: editingCluster.name, displayName }),
      });
      if (selectedCluster && selectedCluster.name === editingCluster.name) {
        onSelectCluster({ ...editingCluster, displayName });
      }
      setDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error saving display name:', error);
    }
  };

  const handleClear = async () => {
    if (!editingCluster) return;
    setDisplayName('');
    saveClusterDisplayName(editingCluster.name, '');
    await fetch('/api/clusters/display-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clusterName: editingCluster.name, displayName: '' }),
    });
    setDialogOpen(false);
    window.location.reload();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
        <CircularProgress size={18} />
      </Box>
    );
  }

  if (clusters.length === 0) {
    return (
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
          No clusters found
        </Typography>
      </Box>
    );
  }

  const menu = (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
      {clusters.map((cluster) => (
        <MenuItem
          key={cluster.name}
          selected={selectedCluster?.name === cluster.name}
          onClick={() => {
            onSelectCluster(cluster);
            closeMenu();
          }}
          sx={{ pr: 5, maxWidth: 360 }}
        >
          <CloudIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
          <ListItemText
            primary={clusterLabel(cluster)}
            secondary={cluster.server}
            primaryTypographyProps={{ variant: 'body2', noWrap: true, fontSize: '0.85rem' }}
            secondaryTypographyProps={{ variant: 'body2', noWrap: true, fontSize: '0.7rem' }}
          />
          <Tooltip title="Rename" arrow>
            <IconButton
              size="small"
              onClick={(e) => handleEditClick(e, cluster)}
              sx={{ position: 'absolute', right: 6, p: 0.5 }}
            >
              <EditIcon sx={{ fontSize: '0.85rem' }} />
            </IconButton>
          </Tooltip>
        </MenuItem>
      ))}
    </Menu>
  );

  const dialog = (
    <Dialog
      open={dialogOpen}
      onClose={() => setDialogOpen(false)}
      PaperProps={{ sx: { borderRadius: 2, width: '400px', maxWidth: '90vw' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>Rename Cluster</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Original name: {editingCluster?.name}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Display Name"
            type="text"
            fullWidth
            variant="outlined"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter a friendly name for this cluster"
            sx={{ mt: 1 }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setDialogOpen(false)} variant="text" sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        {editingCluster?.displayName && (
          <Button onClick={handleClear} color="error" variant="text" sx={{ textTransform: 'none' }}>
            Clear
          </Button>
        )}
        <Button onClick={handleSave} color="primary" variant="contained" sx={{ textTransform: 'none', fontWeight: 500, px: 2 }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Collapsed: a single avatar that opens the cluster menu.
  if (collapsed) {
    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip
            title={selectedCluster ? `${clusterLabel(selectedCluster)}${selectedCluster.server ? ` — ${selectedCluster.server}` : ''}` : 'Select cluster'}
            placement="right"
            arrow
          >
            <Avatar
              onClick={openMenu}
              sx={{
                width: 34, height: 34, fontSize: '0.75rem', cursor: 'pointer',
                bgcolor: 'primary.main', color: 'primary.contrastText',
              }}
            >
              {selectedCluster ? clusterInitials(selectedCluster) : '?'}
            </Avatar>
          </Tooltip>
        </Box>
        {menu}
        {dialog}
      </>
    );
  }

  // Expanded: a compact button showing the active cluster; click to open menu.
  return (
    <>
      <Box
        onClick={openMenu}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.75,
          borderRadius: 1.5, cursor: 'pointer', minHeight: 44,
          border: '1px solid',
          borderColor: mode === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
          '&:hover': { bgcolor: mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)' },
        }}
      >
        <CloudIcon sx={{ fontSize: '1.1rem', color: 'primary.main', flexShrink: 0 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.85rem' }}>
            {selectedCluster ? clusterLabel(selectedCluster) : 'Select cluster'}
          </Typography>
          {selectedCluster?.server && (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
              {selectedCluster.server}
            </Typography>
          )}
        </Box>
        <ExpandMoreIcon sx={{ fontSize: '1.1rem', color: 'text.secondary', flexShrink: 0 }} />
      </Box>
      {menu}
      {dialog}
    </>
  );
}
