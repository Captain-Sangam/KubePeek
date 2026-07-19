'use client';

import { useState, useEffect } from 'react';
import { Box, Paper, Alert, Typography } from '@mui/material';
import ClusterList from './ClusterList';
import ClusterDetails from './ClusterDetails';
import { Cluster } from '../types/kubernetes';
import {
  getClusterDisplayNames,
  getSidebarCollapsed,
  saveSidebarCollapsed,
} from '../lib/kubernetes-client';
import { useTheme } from '../lib/ThemeProvider';
import { DEFAULT_CONTEXT_NAME } from '../lib/constants';

export default function Dashboard() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { mode } = useTheme();

  // Read collapse preference after mount to avoid a hydration mismatch.
  useEffect(() => {
    setCollapsed(getSidebarCollapsed());
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      saveSidebarCollapsed(next);
      return next;
    });
  };

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        setLoading(true);
        setSelectedCluster(null);
        setError(null);

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

        if (!Array.isArray(data)) {
          throw new Error(`Invalid response data format: expected array, got ${typeof data}`);
        }

        if (data.length === 0) {
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

        const clustersWithDisplayNames = data.map((cluster: Cluster & { isActive?: boolean }) => ({
          ...cluster,
          displayName: displayNames[cluster.name] || ''
        }));

        setClusters(clustersWithDisplayNames);

        // Select the active cluster if available, else the first one.
        const activeCluster = clustersWithDisplayNames.find((c: Cluster & { isActive?: boolean }) => c.isActive === true);
        setSelectedCluster(activeCluster || clustersWithDisplayNames[0] || null);
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
      
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          height: 'calc(100% - 4px)',
        }}
      >
        <Box
          sx={{
            width: { xs: '100%', md: collapsed ? 64 : 240 },
            flexShrink: 0,
            height: '100%',
            transition: 'width 0.2s ease',
          }}
        >
          <Paper
            sx={{
              height: '100%',
              overflow: 'hidden',
              p: collapsed ? 1 : 1.5,
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
              collapsed={collapsed}
              onToggleCollapse={handleToggleCollapse}
            />
          </Paper>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, height: '100%' }}>
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
                      : 'Select a cluster to view details'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
} 