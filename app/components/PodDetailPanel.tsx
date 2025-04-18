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
  Tab,
  Tabs,
  TextField
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
    
    try {
      const response = await fetch(`/api/clusters/${cluster.name}/pods/${pod.namespace}/${pod.name}/logs`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs || 'No logs available');
      } else {
        setLogs(`Error: ${data.message || 'Failed to fetch logs'}`);
      }
    } catch (err) {
      setLogs('Error: Failed to fetch logs');
      console.error('Error fetching pod logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Fetch pod details when panel opens
  useEffect(() => {
    if (open && pod) {
      fetchPodDetails();
    } else {
      // Reset state when closing
      setPodDetails(null);
      setError(null);
      setLogs(null);
      setTabValue(0);
    }
  }, [open, pod]);

  if (!pod) return null;

  // Format pod details for display
  const formatPodDetails = () => {
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
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': { 
          width: '40%', 
          minWidth: '400px',
          maxWidth: '600px',
          boxSizing: 'border-box',
          backgroundColor: mode === 'light' ? '#fff' : '#121212',
          color: mode === 'light' ? 'inherit' : '#e0e0e0',
        },
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            {pod.name}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Grid container spacing={1}>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">Namespace:</Typography>
              <Typography variant="body1">{pod.namespace}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">Status:</Typography>
              <Typography variant="body1">{pod.status}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">Node:</Typography>
              <Typography variant="body1">{pod.nodeName}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">Age:</Typography>
              <Typography variant="body1">{pod.creationTimestamp}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">CPU Usage:</Typography>
              <Typography variant="body1">{pod.cpuUsage || '-'}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">Memory Usage:</Typography>
              <Typography variant="body1">{pod.memoryUsage || '-'}</Typography>
            </Grid>
            {pod.helmChart && (
              <>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Helm Chart:</Typography>
                  <Typography variant="body1">{pod.helmChart}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Version:</Typography>
                  <Typography variant="body1">{pod.helmVersion || '-'}</Typography>
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteIcon />}
            onClick={() => onDeletePod(pod)}
            size="small"
          >
            Delete
          </Button>
          <Button 
            variant="outlined"
            startIcon={<ArticleIcon />}
            onClick={() => onViewLogs(pod)}
            size="small"
          >
            Logs
          </Button>
          <Button 
            variant="outlined"
            startIcon={<TerminalIcon />}
            onClick={() => onOpenShell(pod)}
            size="small"
          >
            Shell
          </Button>
        </Box>

        <Divider sx={{ mb: 1 }} />

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="pod details tabs"
            sx={{ minHeight: '40px' }}
          >
            <Tab 
              label="Details" 
              id="pod-tab-0" 
              aria-controls="pod-tabpanel-0" 
              sx={{ 
                fontSize: '0.8rem', 
                minHeight: '40px', 
                py: 0.75
              }}
            />
            <Tab 
              label="Logs" 
              id="pod-tab-1" 
              aria-controls="pod-tabpanel-1" 
              sx={{ 
                fontSize: '0.8rem', 
                minHeight: '40px', 
                py: 0.75
              }}
            />
          </Tabs>
        </Box>

        <Box 
          role="tabpanel"
          hidden={tabValue !== 0}
          id="pod-tabpanel-0"
          aria-labelledby="pod-tab-0"
          sx={{ flexGrow: 1, overflow: 'auto', mt: 1 }}
        >
          {tabValue === 0 && (
            <>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Typography color="error" sx={{ mt: 2 }}>
                  {error}
                </Typography>
              ) : (
                <Paper variant="outlined" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">
                      Pod Details
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={fetchPodDetails}
                      aria-label="Refresh pod details"
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" component="pre" sx={{ 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    backgroundColor: mode === 'light' ? '#f5f5f5' : '#1e1e1e',
                    p: 1,
                    borderRadius: 1,
                    overflowX: 'auto'
                  }}>
                    {formatPodDetails()}
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </Box>

        <Box 
          role="tabpanel"
          hidden={tabValue !== 1}
          id="pod-tabpanel-1"
          aria-labelledby="pod-tab-1"
          sx={{ flexGrow: 1, overflow: 'auto', mt: 1 }}
        >
          {tabValue === 1 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={fetchPodLogs}
                  disabled={logsLoading}
                >
                  Refresh Logs
                </Button>
              </Box>
              
              <Paper variant="outlined" sx={{ p: 2, height: 'calc(100% - 40px)' }}>
                {logsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <TextField
                    fullWidth
                    multiline
                    variant="outlined"
                    value={logs || 'Loading logs...'}
                    InputProps={{
                      readOnly: true,
                      sx: {
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                        backgroundColor: mode === 'light' ? '#f5f5f5' : '#1e1e1e',
                      }
                    }}
                    sx={{ height: '100%' }}
                  />
                )}
              </Paper>
            </>
          )}
        </Box>
      </Box>
    </Drawer>
  );
} 