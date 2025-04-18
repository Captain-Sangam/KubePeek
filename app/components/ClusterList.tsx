'use client';

import { useState } from 'react';
import { List, ListItem, ListItemButton, ListItemText, Typography, Divider, CircularProgress, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { Cluster } from '../types/kubernetes';
import { CloudCircle as CloudIcon, Edit as EditIcon } from '@mui/icons-material';
import { saveClusterDisplayName } from '../lib/kubernetes-client';
import { useTheme } from '../lib/ThemeProvider';

interface ClusterListProps {
  clusters: Cluster[];
  selectedCluster: Cluster | null;
  onSelectCluster: (cluster: Cluster) => void;
  loading: boolean;
}

export default function ClusterList({ 
  clusters, 
  selectedCluster, 
  onSelectCluster,
  loading 
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

  return (
    <>
      <Typography 
        variant="subtitle1" 
        sx={{ 
          mb: 1.5, 
          fontSize: '0.9rem', 
          fontWeight: 600,
          px: 1
        }}
      >
        Clusters
      </Typography>
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
                primary={cluster.displayName || cluster.name} 
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