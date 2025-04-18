'use client';

import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Alert, Typography } from '@mui/material';
import ClusterList from './ClusterList';
import ClusterDetails from './ClusterDetails';
import { Cluster } from '../types/kubernetes';
import { getClusterDisplayNames } from '../lib/kubernetes-client';
import { useTheme } from '../lib/ThemeProvider';

export default function Dashboard() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { mode } = useTheme();

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/clusters');
        if (!res.ok) {
          throw new Error('Failed to fetch clusters');
        }
        
        const data = await res.json();
        
        // Apply display names from localStorage
        const displayNames = getClusterDisplayNames();
        const clustersWithDisplayNames = data.map((cluster: Cluster) => ({
          ...cluster,
          displayName: displayNames[cluster.name] || ''
        }));
        
        setClusters(clustersWithDisplayNames);
        
        // Select the first cluster by default if available
        if (clustersWithDisplayNames.length > 0) {
          setSelectedCluster(clustersWithDisplayNames[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch clusters');
      } finally {
        setLoading(false);
      }
    };

    fetchClusters();
  }, []);

  const handleClusterSelect = (cluster: Cluster) => {
    setSelectedCluster(cluster);
  };

  return (
    <Box sx={{ height: '100%' }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2, 
            py: 0.5, 
            fontSize: '0.8rem',
            borderRadius: '8px',
          }}
        >
          {error}
        </Alert>
      )}
      
      <Grid container spacing={2} sx={{ height: 'calc(100% - 4px)' }}>
        <Grid item xs={12} md={3} lg={2} sx={{ height: '100%' }}>
          <Paper 
            sx={{ 
              height: '100%', 
              overflow: 'hidden', 
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid',
              borderColor: mode === 'light' 
                ? 'rgba(0, 0, 0, 0.06)' 
                : 'rgba(255, 255, 255, 0.06)',
            }}
          >
            <ClusterList 
              clusters={clusters} 
              selectedCluster={selectedCluster} 
              onSelectCluster={handleClusterSelect}
              loading={loading}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={9} lg={10} sx={{ height: '100%' }}>
          <Paper 
            sx={{ 
              height: '100%', 
              overflow: 'auto', 
              p: 2,
              border: '1px solid',
              borderColor: mode === 'light' 
                ? 'rgba(0, 0, 0, 0.06)' 
                : 'rgba(255, 255, 255, 0.06)',
            }}
          >
            {selectedCluster ? (
              <ClusterDetails cluster={selectedCluster} />
            ) : (
              <Box 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="body1" fontSize="0.9rem" color="text.secondary">
                  {loading 
                    ? 'Loading clusters...' 
                    : clusters.length === 0 
                      ? 'No clusters found' 
                      : 'Select a cluster to view details'
                  }
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 