'use client';

import { useState, useEffect } from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  Divider, 
  Button,
  Grid,
  Paper,
  CircularProgress,
  TextField,
  Tabs,
  Tab
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Terminal as TerminalIcon,
  Article as ArticleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Pod, Cluster } from '../types/kubernetes';
import { useTheme } from '../lib/ThemeProvider';

interface PodDetailPanelProps {
  pod: Pod | null;
  cluster: Cluster;
  open: boolean;
  onClose: () => void;
  onDeletePod: (pod: Pod) => void;
  onViewLogs: (pod: Pod) => void;
  onOpenShell: (pod: Pod) => void;
}

export default function PodDetailPanel({
  pod,
  cluster,
  open,
  onClose,
  onDeletePod,
  onViewLogs,
  onOpenShell
}: PodDetailPanelProps) {
  const { mode } = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [podDetails, setPodDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // If switching to logs tab, fetch logs
    if (newValue === 1 && pod && !logs) {
      fetchPodLogs();
    }
  };

  const fetchPodDetails = async () => {
    if (!pod) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/clusters/${cluster.name}/pods/${pod.namespace}/${pod.name}/details`);
      const data = await response.json();
      
      if (data.success) {
        setPodDetails(data.details);
      } else {
        setError(data.message || 'Failed to fetch pod details');
      }
    } catch (err) {
      setError('Failed to fetch pod details');
      console.error('Error fetching pod details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPodLogs = async () => {
    if (!pod) return;
    
    setLogsLoading(true);
    setLogsError(null);
    
    try {
      const response = await fetch(`/api/clusters/${cluster.name}/pods/${pod.namespace}/${pod.name}/logs`);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs || 'No logs available');
      } else {
        setLogsError(data.message || 'Failed to fetch logs');
        setLogs('No logs available');
      }
    } catch (err) {
      console.error('Error fetching pod logs:', err);
      setLogsError('Failed to fetch logs');
      setLogs(null);
    } finally {
      setLogsLoading(false);
    }
  };

  // Fetch pod details when panel opens
  useEffect(() => {
    if (open && pod) {
      fetchPodDetails();
      if (tabValue === 1) {
        fetchPodLogs();
      }
    } else {
      // Reset state when closing
      setPodDetails(null);
      setError(null);
      setLogs(null);
      setLogsError(null);
      setTabValue(0);
    }
  }, [open, pod, tabValue]);

  if (!pod) return null;

  const backgroundColor = mode === 'light' ? '#fff' : '#1e1e1e';
  const textColor = mode === 'light' ? '#000' : '#e0e0e0';
  const secondaryTextColor = mode === 'light' ? '#757575' : '#9e9e9e';
  const borderColor = mode === 'light' ? '#e0e0e0' : '#333';
  const panelBackground = mode === 'light' ? '#f8f8f8' : '#121212';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': { 
          width: '50%', 
          minWidth: '500px',
          maxWidth: '800px',
          boxSizing: 'border-box',
          backgroundColor: panelBackground,
          color: textColor,
        },
      }}
    >
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden' 
      }}>
        {/* Header with pod name and close button */}
        <Box sx={{ 
          p: 3, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: `1px solid ${borderColor}`
        }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 500 }}>
            {pod.name}
          </Typography>
          <IconButton onClick={onClose} size="medium" sx={{ color: textColor }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Pod info section */}
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={4}>
              <Typography variant="body2" color={secondaryTextColor}>Namespace:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{pod.namespace}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color={secondaryTextColor}>Status:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{pod.status}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color={secondaryTextColor}>Node:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{pod.nodeName}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color={secondaryTextColor}>Age:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{pod.creationTimestamp}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color={secondaryTextColor}>CPU Usage:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{pod.cpuUsage || '-'}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color={secondaryTextColor}>Memory Usage:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{pod.memoryUsage || '-'}</Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Action buttons */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-start', 
          gap: 2,
          px: 3,
          pb: 3
        }}>
          <Button 
            variant="contained" 
            color="error" 
            disableElevation
            startIcon={<DeleteIcon />}
            onClick={() => onDeletePod(pod)}
            size="small"
            sx={{ 
              textTransform: 'none',
              borderRadius: '4px',
              px: 2
            }}
          >
            Delete
          </Button>
          <Button 
            variant="contained"
            disableElevation
            startIcon={<ArticleIcon />}
            onClick={() => onViewLogs(pod)}
            size="small"
            sx={{ 
              textTransform: 'none',
              borderRadius: '4px',
              px: 2,
              backgroundColor: mode === 'light' ? '#2196f3' : '#1565c0',
              '&:hover': {
                backgroundColor: mode === 'light' ? '#1976d2' : '#0d47a1',
              }
            }}
          >
            Logs
          </Button>
          <Button 
            variant="contained"
            disableElevation
            startIcon={<TerminalIcon />}
            onClick={() => onOpenShell(pod)}
            size="small"
            sx={{ 
              textTransform: 'none',
              borderRadius: '4px',
              px: 2,
              backgroundColor: mode === 'light' ? '#4caf50' : '#2e7d32',
              '&:hover': {
                backgroundColor: mode === 'light' ? '#388e3c' : '#1b5e20',
              }
            }}
          >
            Shell
          </Button>
        </Box>

        <Divider />

        {/* Tabs for DETAILS and LOGS */}
        <Box sx={{ px: 3, borderBottom: `1px solid ${borderColor}` }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="pod details tabs"
            textColor="inherit"
            sx={{ 
              '& .MuiTabs-indicator': {
                backgroundColor: mode === 'light' ? '#2196f3' : '#90caf9',
              }
            }}
          >
            <Tab 
              label="DETAILS" 
              id="pod-tab-0" 
              aria-controls="pod-tabpanel-0" 
              sx={{ 
                fontWeight: 500,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                minWidth: '120px'
              }}
            />
            <Tab 
              label="LOGS" 
              id="pod-tab-1" 
              aria-controls="pod-tabpanel-1" 
              sx={{ 
                fontWeight: 500,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                minWidth: '120px'
              }}
            />
          </Tabs>
        </Box>

        {/* DETAILS tab content */}
        <Box 
          role="tabpanel"
          hidden={tabValue !== 0}
          id="pod-tabpanel-0"
          aria-labelledby="pod-tab-0"
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: 3,
            display: tabValue === 0 ? 'block' : 'none'
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress size={24} sx={{ color: mode === 'light' ? '#2196f3' : '#90caf9' }} />
            </Box>
          ) : error ? (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          ) : (
            <Paper 
              elevation={0} 
              sx={{ 
                height: '100%', 
                overflowY: 'auto',
                backgroundColor: 'transparent'
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2 
              }}>
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.875rem'
                }}>
                  Pod Details
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={fetchPodDetails}
                  aria-label="Refresh pod details"
                  sx={{ color: textColor }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography 
                variant="body2" 
                component="pre" 
                sx={{ 
                  whiteSpace: 'pre-wrap', 
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  backgroundColor: mode === 'light' ? '#f5f5f5' : '#242424',
                  p: 2,
                  borderRadius: 1,
                  overflowX: 'auto',
                  color: textColor,
                  border: `1px solid ${borderColor}`
                }}
              >
                {podDetails ? formatPodDetails(podDetails, pod) : 'Loading pod details...'}
              </Typography>
            </Paper>
          )}
        </Box>

        {/* LOGS tab content */}
        <Box 
          role="tabpanel"
          hidden={tabValue !== 1}
          id="pod-tabpanel-1"
          aria-labelledby="pod-tab-1"
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: 3,
            display: tabValue === 1 ? 'flex' : 'none',
            flexDirection: 'column'
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            mb: 2 
          }}>
            <Button
              variant="text"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchPodLogs}
              disabled={logsLoading}
              sx={{ 
                textTransform: 'none',
                color: mode === 'light' ? '#2196f3' : '#90caf9',
              }}
            >
              Refresh Logs
            </Button>
          </Box>
          
          <Box sx={{ 
            flexGrow: 1, 
            backgroundColor: mode === 'light' ? '#f5f5f5' : '#242424',
            borderRadius: 1,
            border: `1px solid ${borderColor}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {logsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
                <CircularProgress size={24} sx={{ color: mode === 'light' ? '#2196f3' : '#90caf9' }} />
              </Box>
            ) : logsError ? (
              <Box sx={{ p: 2, fontFamily: 'monospace', fontSize: '0.75rem', color: 'error.main' }}>
                Error: {logsError}
              </Box>
            ) : (
              <Box 
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  flexGrow: 1,
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: textColor,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5
                }}
              >
                {logs || 'No logs available'}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

// Helper function to format pod details
function formatPodDetails(podDetails: any, pod: Pod): string {
  if (!podDetails) return 'Loading pod details...';

  const labels = podDetails.metadata?.labels ? 
    Object.entries(podDetails.metadata.labels)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n  ') : 
    'none';

  const annotations = podDetails.metadata?.annotations ? 
    Object.entries(podDetails.metadata.annotations)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n  ') : 
    'none';

  const containers = podDetails.spec?.containers.map((container: any) => {
    return `${container.name}:
  Image:   ${container.image}
  Ports:   ${container.ports?.map((p: any) => `${p.containerPort}/${p.protocol || 'TCP'}`).join(', ') || 'none'}
  Command: ${container.command ? container.command.join(' ') : 'none'}`;
  }).join('\n\n') || 'None';

  const volumes = podDetails.spec?.volumes?.map((volume: any) => {
    let volumeDetails = `- ${volume.name}:`;
    if (volume.configMap) volumeDetails += `\n  ConfigMap: ${volume.configMap.name}`;
    if (volume.secret) volumeDetails += `\n  Secret: ${volume.secret.secretName}`;
    if (volume.persistentVolumeClaim) volumeDetails += `\n  PVC: ${volume.persistentVolumeClaim.claimName}`;
    if (volume.emptyDir) volumeDetails += `\n  EmptyDir: {}`;
    return volumeDetails;
  }).join('\n') || 'None';

  // Get IP address
  const podIP = podDetails.status?.podIP || 'pending';

  return `Name:         ${pod.name}
Namespace:    ${pod.namespace}
Node:         ${pod.nodeName}
Status:       ${pod.status}
IP:           ${podIP}
Created:      ${pod.creationTimestamp}
Labels:       
  ${labels}
Annotations:  
  ${annotations}

Containers:
${containers}

Volumes:
${volumes}`;
} 