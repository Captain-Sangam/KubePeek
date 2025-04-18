'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, CircularProgress, Alert } from '@mui/material';
import NodesTable from './NodesTable';
import PodsTable from './PodsTable';
import { Cluster, Node, Pod, NodeGroupInfo } from '../types/kubernetes';

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
      sx={{ p: 2, pt: 3 }}
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
  const [tabValue, setTabValue] = useState(0);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [nodeGroups, setNodeGroups] = useState<NodeGroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedNodeGroup, setSelectedNodeGroup] = useState<string | null>(null);

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
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {cluster.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {cluster.server}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Nodes" />
          <Tab label="Pods" />
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
        <Box sx={{ mb: 2 }}>
          {(selectedNode || selectedNodeGroup) && (
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
              action={
                <Typography 
                  variant="body2" 
                  sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={clearFilters}
                >
                  Clear filters
                </Typography>
              }
            >
              {selectedNode && `Showing pods on node: ${selectedNode}`}
              {selectedNodeGroup && `Showing pods in node group: ${selectedNodeGroup}`}
            </Alert>
          )}
        </Box>
        <PodsTable pods={filteredPods} />
      </TabPanel>
    </Box>
  );
} 