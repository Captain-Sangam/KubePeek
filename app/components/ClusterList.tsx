'use client';

import { List, ListItem, ListItemButton, ListItemText, Typography, Divider, CircularProgress, Box } from '@mui/material';
import { Cluster } from '../types/kubernetes';
import { CloudCircle as CloudIcon } from '@mui/icons-material';

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
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (clusters.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No Kubernetes clusters found
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Clusters
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <List sx={{ p: 0 }}>
        {clusters.map((cluster) => (
          <ListItem key={cluster.name} disablePadding>
            <ListItemButton
              selected={selectedCluster?.name === cluster.name}
              onClick={() => onSelectCluster(cluster)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
            >
              <CloudIcon sx={{ mr: 1, color: 'primary.main' }} fontSize="small" />
              <ListItemText 
                primary={cluster.name} 
                secondary={cluster.server}
                primaryTypographyProps={{
                  variant: 'body1',
                  fontWeight: selectedCluster?.name === cluster.name ? 'bold' : 'normal',
                }}
                secondaryTypographyProps={{
                  noWrap: true,
                  variant: 'body2',
                  fontSize: '0.75rem',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
} 