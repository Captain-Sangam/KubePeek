'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, CircularProgress, Alert } from '@mui/material';
import NodesTable from './NodesTable';
import PodsTable from './PodsTable';
import { Cluster, Node, Pod, NodeGroupInfo } from '../types/kubernetes';
import { useTheme } from '../lib/ThemeProvider';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      sx={{ p: 1, pt: 2 }}
      {...other}
    >
      {value === index && children}
    </Box>
  );
}

interface ClusterDetailsProps {
  cluster: Cluster;
}

export default function ClusterDetails({ cluster }: ClusterDetailsProps) {
  // Log the received cluster prop on each render
  console.log('[ClusterDetails] Received cluster prop:', cluster);

  const [tabValue, setTabValue] = useState(0);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [nodeGroups, setNodeGroups] = useState<NodeGroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedNodeGroup, setSelectedNodeGroup] = useState<string | null>(null);
  const { mode } = useTheme();

  useEffect(() => {
    const fetchClusterDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch nodes
        const nodesRes = await fetch(`/api/clusters/${encodeURIComponent(cluster.name)}/nodes`);
        if (!nodesRes.ok) {
          let errorMessage = `Failed to fetch nodes: ${nodesRes.statusText}`;
          try {
            const errorData = await nodesRes.json();
            if (errorData.error) errorMessage = errorData.error;
          } catch (e) {
            // JSON parsing failed, use default error message
          }
          throw new Error(errorMessage);
        }
        
        let nodesData;
        try {
          nodesData = await nodesRes.json();
          setNodes(nodesData);
        } catch (parseError) {
          throw new Error('Failed to parse nodes response: Invalid JSON data');
        }
        
        // Fetch pods
        const podsRes = await fetch(`/api/clusters/${encodeURIComponent(cluster.name)}/pods`);
        if (!podsRes.ok) {
          let errorMessage = `Failed to fetch pods: ${podsRes.statusText}`;
          try {
            const errorData = await podsRes.json();
            if (errorData.error) errorMessage = errorData.error;
          } catch (e) {
            // JSON parsing failed, use default error message
          }
          throw new Error(errorMessage);
        }
        
        let podsData;
        try {
          podsData = await podsRes.json();
          setPods(podsData);
        } catch (parseError) {
          throw new Error('Failed to parse pods response: Invalid JSON data');
        }
        
        // Fetch node groups
        const nodeGroupsRes = await fetch(`/api/clusters/${encodeURIComponent(cluster.name)}/nodegroups`);
        if (!nodeGroupsRes.ok) {
          let errorMessage = `Failed to fetch node groups: ${nodeGroupsRes.statusText}`;
          try {
            const errorData = await nodeGroupsRes.json();
            if (errorData.error) errorMessage = errorData.error;
          } catch (e) {
            // JSON parsing failed, use default error message
          }
          throw new Error(errorMessage);
        }
        
        let nodeGroupsData;
        try {
          nodeGroupsData = await nodeGroupsRes.json();
          setNodeGroups(nodeGroupsData);
        } catch (parseError) {
          throw new Error('Failed to parse node groups response: Invalid JSON data');
        }
        
      } catch (err: any) {
        console.error('Error fetching cluster details:', err);
        setError(err.message || 'Failed to fetch cluster details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClusterDetails();
    // Reset selections when cluster changes
    setSelectedNode(null);
    setSelectedNodeGroup(null);
    setTabValue(0);
  }, [cluster]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleNodeSelect = (nodeName: string) => {
    setSelectedNode(nodeName);
    setTabValue(1); // Switch to pods tab
  };

  const handleNodeGroupSelect = (nodeGroupName: string) => {
    setSelectedNodeGroup(nodeGroupName);
    setTabValue(1); // Switch to pods tab
  };

  // Filter pods based on selection
  const filteredPods = pods.filter(pod => {
    if (selectedNode) {
      return pod.nodeName === selectedNode;
    }
    if (selectedNodeGroup) {
      const nodeGroup = nodeGroups.find(ng => ng.name === selectedNodeGroup);
      return nodeGroup?.nodes.some(node => node.name === pod.nodeName) || false;
    }
    return true;
  });

  const clearFilters = () => {
    setSelectedNode(null);
    setSelectedNodeGroup(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          m: 1, 
          py: 0.5, 
          fontSize: '0.8rem',
          color: mode === 'light' ? undefined : '#fff' 
        }}
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Typography 
        variant="subtitle1" 
        sx={{ 
          mb: 1, 
          fontSize: '1rem', 
          fontWeight: 600,
          color: mode === 'light' ? '#212121' : '#e0e0e0'
        }}
      >
        {cluster.displayName || cluster.name}
      </Typography>
      <Typography 
        variant="body2" 
        color={mode === 'light' ? 'text.secondary' : '#b0b0b0'} 
        sx={{ mb: 1.5, fontSize: '0.75rem' }}
      >
        {cluster.server}
        {cluster.displayName && (
          <Box 
            component="span" 
            sx={{ 
              ml: 1, 
              color: mode === 'light' ? 'text.disabled' : '#909090'
            }}
          >
            (Original name: {cluster.name})
          </Box>
        )}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: mode === 'light' ? 'divider' : 'rgba(255,255,255,0.12)' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{ 
            minHeight: '36px',
            '& .MuiTab-root': {
              minHeight: '36px',
              fontSize: '0.75rem',
              padding: '6px 12px',
              color: mode === 'light' ? 'text.primary' : '#b0b0b0',
              '&.Mui-selected': {
                color: mode === 'light' ? 'primary.main' : '#fff',
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: mode === 'light' ? 'primary.main' : '#fff',
            }
          }}
        >
          <Tab label="Nodes" id="simple-tab-0" aria-controls="simple-tabpanel-0" disableRipple />
          <Tab label="Pods" id="simple-tab-1" aria-controls="simple-tabpanel-1" disableRipple />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <NodesTable 
          nodes={nodes}
          nodeGroups={nodeGroups}
          onNodeSelect={handleNodeSelect}
          onNodeGroupSelect={handleNodeGroupSelect}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ height: '100%' }}>
          {(selectedNode || selectedNodeGroup) && (
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <Typography 
                variant="body2" 
                sx={{ mr: 1, fontSize: '0.8rem', color: mode === 'light' ? 'text.secondary' : '#b0b0b0' }}
              >
                {selectedNode 
                  ? `Showing pods on node: ${selectedNode}` 
                  : `Showing pods in node group: ${selectedNodeGroup}`}
              </Typography>
              <Box 
                component="span" 
                onClick={clearFilters}
                sx={{ 
                  fontSize: '0.8rem', 
                  color: 'primary.main', 
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  '&:hover': { 
                    color: mode === 'light' ? 'primary.dark' : 'primary.light',
                  }
                }}
              >
                (Clear filter)
              </Box>
            </Box>
          )}
          <PodsTable pods={filteredPods} cluster={cluster} />
        </Box>
      </TabPanel>
    </Box>
  );
} 