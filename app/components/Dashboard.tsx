'use client';

import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Alert } from '@mui/material';
import ClusterList from './ClusterList';
import ClusterDetails from './ClusterDetails';
import { Cluster } from '../types/kubernetes';

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
        setClusters(data);
        
        // Select the first cluster by default if available
        if (data.length > 0) {
          setSelectedCluster(data[0]);
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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={2} sx={{ height: 'calc(100% - 8px)' }}>
        <Grid item xs={12} md={3} lg={2} sx={{ height: '100%' }}>
          <Paper sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            <ClusterList 
              clusters={clusters} 
              selectedCluster={selectedCluster} 
              onSelectCluster={handleClusterSelect}
              loading={loading}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={9} lg={10} sx={{ height: '100%' }}>
          <Paper sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            {selectedCluster ? (
              <ClusterDetails cluster={selectedCluster} />
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                {loading ? 'Loading clusters...' : clusters.length === 0 ? 'No clusters found' : 'Select a cluster to view details'}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 