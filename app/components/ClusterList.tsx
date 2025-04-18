'use client';

import { useState } from 'react';
import { List, ListItem, ListItemButton, ListItemText, Typography, Divider, CircularProgress, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { Cluster } from '../types/kubernetes';
import { CloudCircle as CloudIcon, Edit as EditIcon } from '@mui/icons-material';
import { saveClusterDisplayName } from '../lib/kubernetes-client';

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (clusters.length === 0) {
    return (
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
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
      <Typography variant="subtitle1" sx={{ mb: 1, fontSize: '0.9rem', fontWeight: 'bold' }}>
        Clusters
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <List sx={{ p: 0 }} dense>
        {clusters.map((cluster) => (
          <ListItem 
            key={cluster.name} 
            disablePadding
            sx={{ 
              pr: 0,  // Remove right padding so selection color extends fully
              '&:hover': {
                '& .MuiIconButton-root': { 
                  visibility: 'visible'
                }
              }
            }}
          >
            <ListItemButton
              selected={selectedCluster?.name === cluster.name}
              onClick={() => onSelectCluster(cluster)}
              sx={{
                borderRadius: 1,
                py: 0.5,
                px: 1,
                minHeight: '36px',
                mb: 0.2,
                width: '100%',
                pr: 6, // Add right padding to make room for the button
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.12)',
                  },
                },
              }}
            >
              <CloudIcon 
                sx={{ 
                  mr: 0.5, 
                  color: selectedCluster?.name === cluster.name ? 'primary.main' : 'primary.light',
                  fontSize: '0.85rem'
                }} 
              />
              <ListItemText 
                primary={cluster.displayName || cluster.name} 
                secondary={cluster.server}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: selectedCluster?.name === cluster.name ? 'bold' : 'normal',
                  noWrap: true,
                  fontSize: '0.8rem',
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
                  fontSize: '0.65rem',
                  sx: { maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }
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
                  padding: '2px',
                  position: 'absolute',
                  right: 8,
                  visibility: selectedCluster?.name === cluster.name ? 'visible' : 'hidden'
                }}
              >
                <EditIcon fontSize="inherit" sx={{ fontSize: '0.85rem' }} />
              </IconButton>
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Dialog for editing cluster display name */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Rename Cluster</DialogTitle>
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
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          {editingCluster?.displayName && (
            <Button onClick={handleClear} color="error">Clear</Button>
          )}
          <Button onClick={handleSave} color="primary">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 