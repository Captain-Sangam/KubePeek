'use client';

import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Alert, Typography } from '@mui/material';
import ClusterList from './ClusterList';
import ClusterDetails from './ClusterDetails';
import { Cluster } from '../types/kubernetes';
import { getClusterDisplayNames } from '../lib/kubernetes-client';
import { useTheme } from '../lib/ThemeProvider';
import { DEFAULT_CONTEXT_NAME } from '../lib/constants';

export default function Dashboard() {
  // Add a log to confirm component rendering
  console.log('[Dashboard] Component rendering...');

  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { mode } = useTheme();

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        setLoading(true);
        setSelectedCluster(null);
        setError(null);
        console.log('[Dashboard] Fetching clusters...');

        const res = await fetch('/api/clusters');
        if (!res.ok) {
          let errorMessage = `Failed to fetch clusters (${res.status})`;
          try {
            const errorData = await res.json();
            if (errorData.error) errorMessage = errorData.error;
          } catch (e) { 
            console.error('[Dashboard] Error parsing error response:', e);
          }
          throw new Error(errorMessage);
        }
        
        const data = await res.json();
        console.log('[Dashboard] Raw API response:', data);
        
        if (!Array.isArray(data)) {
          throw new Error(`Invalid response data format: expected array, got ${typeof data}`);
        }
        
        if (data.length === 0) {
          console.log('[Dashboard] No clusters found in the API response');
          
          // Create a default placeholder cluster if none were found
          const defaultCluster: Cluster = {
            name: DEFAULT_CONTEXT_NAME,
            context: DEFAULT_CONTEXT_NAME,
            server: 'Current active context',
            displayName: 'Current Cluster',
            isActive: true
          };
          
          setClusters([defaultCluster]);
          setSelectedCluster(defaultCluster);
          setLoading(false);
          return;
        }
        
        // Apply display names from localStorage
        const displayNames = getClusterDisplayNames();
        console.log('[Dashboard] Display names from storage:', displayNames);
        
        const clustersWithDisplayNames = data.map((cluster: Cluster & { isActive?: boolean }) => {
          const clusterWithDisplayName = {
            ...cluster,
            displayName: displayNames[cluster.name] || ''
          };
          console.log(`[Dashboard] Processed cluster: name=${cluster.name}, display=${clusterWithDisplayName.displayName}, server=${cluster.server}`);
          return clusterWithDisplayName;
        });

        console.log('[Dashboard] Fetched clusters:', clustersWithDisplayNames);

        setClusters(clustersWithDisplayNames);
        
        // Find and select the active cluster if available
        const activeCluster = clustersWithDisplayNames.find((c: Cluster & { isActive?: boolean }) => c.isActive === true);
        
        if (activeCluster) {
          console.log('[Dashboard] Selecting active cluster:', activeCluster);
          setSelectedCluster(activeCluster);
        } else if (clustersWithDisplayNames.length > 0) {
          // If no active cluster found, select the first one
          console.log('[Dashboard] No active cluster found, selecting first cluster:', clustersWithDisplayNames[0]);
          setSelectedCluster(clustersWithDisplayNames[0]);
        } else {
          console.log('[Dashboard] No clusters found, setting selectedCluster to null');
          setSelectedCluster(null);
        }
      } catch (err: any) {
        console.error('[Dashboard] Error fetching clusters:', err);
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