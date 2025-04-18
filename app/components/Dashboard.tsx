'use client';

import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Alert, Typography } from '@mui/material';
import ClusterList from './ClusterList';
import ClusterDetails from './ClusterDetails';
import { Cluster } from '../types/kubernetes';
import { getClusterDisplayNames } from '../lib/kubernetes-client';

export default function Dashboard() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
        <Alert severity="error" sx={{ mb: 1, py: 0.5, fontSize: '0.8rem' }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={1} sx={{ height: 'calc(100% - 4px)' }}>
        <Grid item xs={12} md={3} lg={2} sx={{ height: '100%' }}>
          <Paper sx={{ 
            height: '100%', 
            overflow: 'hidden', 
            p: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <ClusterList 
              clusters={clusters} 
              selectedCluster={selectedCluster} 
              onSelectCluster={handleClusterSelect}
              loading={loading}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={9} lg={10} sx={{ height: '100%' }}>
          <Paper sx={{ height: '100%', overflow: 'auto', p: 1.5 }}>
            {selectedCluster ? (
              <ClusterDetails cluster={selectedCluster} />
            ) : (
              <Box sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="body2" fontSize="0.8rem">
                  {loading ? 'Loading clusters...' : clusters.length === 0 ? 'No clusters found' : 'Select a cluster to view details'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 