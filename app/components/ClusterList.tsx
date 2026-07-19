'use client';

import { useState } from 'react';
import { List, ListItem, ListItemButton, ListItemText, Typography, Divider, CircularProgress, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Tooltip, Avatar } from '@mui/material';
import { Cluster } from '../types/kubernetes';
import {
  CloudCircle as CloudIcon,
  Edit as EditIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { saveClusterDisplayName } from '../lib/kubernetes-client';
import { useTheme } from '../lib/ThemeProvider';

interface ClusterListProps {
  clusters: Cluster[];
  selectedCluster: Cluster | null;
  onSelectCluster: (cluster: Cluster) => void;
  loading: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Format cluster name to be more readable (module scope so both render paths use it).
const formatClusterName = (name: string): string => {
  let formatted = name.replace(/[_-]/g, ' ');
  formatted = formatted.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
  return formatted;
};

// Two-letter initials for the collapsed icon rail.
const clusterInitials = (cluster: Cluster): string => {
  const label = cluster.displayName || formatClusterName(cluster.name);
  const words = label.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
};

export default function ClusterList({
  clusters,
  selectedCluster,
  onSelectCluster,
  loading,
  collapsed = false,
  onToggleCollapse,
}: ClusterListProps) {
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mode } = useTheme();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (clusters.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary" fontSize="0.875rem">
          No Kubernetes clusters found
        </Typography>
      </Box>
    );
  }

  const handleEditClick = (e: React.MouseEvent, cluster: Cluster) => {
    e.stopPropagation();
    setEditingCluster(cluster);
    setDisplayName(cluster.displayName || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingCluster) {
      try {
        // Save to localStorage
        saveClusterDisplayName(editingCluster.name, displayName);
        
        // Also notify the API (mainly for consistency)
        await fetch('/api/clusters/display-name', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clusterName: editingCluster.name,
            displayName
          }),
        });

        // Update the cluster in the list
        const updatedCluster = {
          ...editingCluster,
          displayName
        };
        
        // If this is the selected cluster, update it
        if (selectedCluster && selectedCluster.name === editingCluster.name) {
          onSelectCluster(updatedCluster);
        }
        
        setDialogOpen(false);
        
        // Force a reload to refresh the cluster list
        window.location.reload();
      } catch (error) {
        console.error('Error saving display name:', error);
      }
    }
  };

  const handleClear = async () => {
    if (editingCluster) {
      setDisplayName('');
      saveClusterDisplayName(editingCluster.name, '');
      
      // Also notify the API (mainly for consistency)
      await fetch('/api/clusters/display-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clusterName: editingCluster.name,
          displayName: ''
        }),
      });
      
      setDialogOpen(false);
      
      // Force a reload to refresh the cluster list
      window.location.reload();
    }
  };

  // Collapsed icon-rail: avatars with tooltips, plus an expand toggle.
  if (collapsed) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
        <Tooltip title="Expand sidebar" placement="right" arrow>
          <IconButton size="small" onClick={onToggleCollapse} sx={{ mb: 1 }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Divider flexItem sx={{ mb: 1 }} />
        <Box sx={{ overflowY: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          {clusters.map((cluster) => {
            const isSelected = selectedCluster?.name === cluster.name;
            return (
              <Tooltip
                key={cluster.name}
                title={`${cluster.displayName || formatClusterName(cluster.name)}${cluster.server ? ` — ${cluster.server}` : ''}`}
                placement="right"
                arrow
              >
                <Avatar
                  onClick={() => onSelectCluster(cluster)}
                  sx={{
                    width: 34,
                    height: 34,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    bgcolor: isSelected ? 'primary.main' : (mode === 'light' ? 'grey.300' : 'grey.700'),
                    color: isSelected ? 'primary.contrastText' : 'text.primary',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {clusterInitials(cluster)}
                </Avatar>
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 1 }}>
        <Typography variant="subtitle1" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
          Clusters
        </Typography>
        {onToggleCollapse && (
          <Tooltip title="Collapse sidebar" arrow>
            <IconButton size="small" onClick={onToggleCollapse} sx={{ p: 0.5 }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Divider sx={{ mb: 1.5 }} />
      <List sx={{ p: 0, overflowY: 'auto' }} dense>
        {clusters.map((cluster) => (
          <ListItem 
            key={cluster.name} 
            disablePadding
            sx={{ 
              px: 1,
              mb: 0.5,
              '&:hover': {
                '& .MuiIconButton-root': { 
                  opacity: 1
                }
              }
            }}
          >
            <ListItemButton
              selected={selectedCluster?.name === cluster.name}
              onClick={() => onSelectCluster(cluster)}
              sx={{
                borderRadius: 1.5,
                py: 1,
                px: 1.5,
                minHeight: '40px',
                width: '100%',
                pr: 6,
                '&.Mui-selected': {
                  backgroundColor: mode === 'light' 
                    ? 'rgba(25, 118, 210, 0.08)'
                    : 'rgba(64, 148, 247, 0.16)',
                  '&:hover': {
                    backgroundColor: mode === 'light'
                      ? 'rgba(25, 118, 210, 0.12)'
                      : 'rgba(64, 148, 247, 0.24)',
                  },
                },
                transition: 'background-color 0.15s ease-in-out',
              }}
            >
              <CloudIcon 
                sx={{ 
                  mr: 1, 
                  color: selectedCluster?.name === cluster.name ? 'primary.main' : 'text.secondary',
                  fontSize: '1rem'
                }} 
              />
              <ListItemText 
                primary={cluster.displayName || formatClusterName(cluster.name)} 
                secondary={cluster.server}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: selectedCluster?.name === cluster.name ? 500 : 400,
                  noWrap: true,
                  fontSize: '0.875rem',
                  sx: { 
                    maxWidth: '100%', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    color: selectedCluster?.name === cluster.name ? 'primary.main' : 'text.primary'
                  }
                }}
                secondaryTypographyProps={{
                  noWrap: true,
                  variant: 'body2',
                  fontSize: '0.75rem',
                  sx: { 
                    maxWidth: '100%', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    color: 'text.secondary'
                  }
                }}
                sx={{ 
                  overflow: 'hidden',
                  margin: 0
                }}
              />
              <IconButton 
                edge="end" 
                aria-label="edit"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(e, cluster);
                }}
                size="small"
                sx={{ 
                  padding: '4px',
                  position: 'absolute',
                  right: 8,
                  opacity: selectedCluster?.name === cluster.name ? 1 : 0,
                  transition: 'opacity 0.2s ease-in-out',
                  bgcolor: mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                  '&:hover': {
                    bgcolor: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
                  }
                }}
              >
                <EditIcon fontSize="inherit" sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Dialog for editing cluster display name */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: '400px',
            maxWidth: '90vw'
          }
        }}
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
              id="name"
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
          <Button 
            onClick={() => setDialogOpen(false)} 
            variant="text"
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          {editingCluster?.displayName && (
            <Button 
              onClick={handleClear} 
              color="error"
              variant="text"
              sx={{ textTransform: 'none' }}
            >
              Clear
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            color="primary"
            variant="contained"
            sx={{ 
              textTransform: 'none',
              fontWeight: 500,
              px: 2
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 