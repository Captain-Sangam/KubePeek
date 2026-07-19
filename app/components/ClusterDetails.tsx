'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Alert } from '@mui/material';
import NodesTable from './NodesTable';
import PodsTable from './PodsTable';
import SecretsTable from './secrets/SecretsTable';
import HelmReleasesTable from './helm/HelmReleasesTable';
import TabPanel from './shared/TabPanel';
import PanelState from './shared/PanelState';
import { Cluster, Node, Pod, NodeGroupInfo } from '../types/kubernetes';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../lib/ThemeProvider';

interface ClusterDetailsProps {
  cluster: Cluster;
}

const TABS = ['Node Groups', 'Pods', 'Secrets', 'Helm'];

export default function ClusterDetails({ cluster }: ClusterDetailsProps) {
  const [tabValue, setTabValue] = useState(0);
  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(new Set([0]));
  const [nodeFilter, setNodeFilter] = useState<string>('');
  const [nodeGroupFilter, setNodeGroupFilter] = useState<string>('');
  const { mode } = useTheme();

  const base = `/api/clusters/${encodeURIComponent(cluster.name)}`;

  // Parallel fetch for the primary tabs. Secrets/Helm fetch lazily in their own components.
  const nodesQ = useFetch<Node[]>(`${base}/nodes`);
  const podsQ = useFetch<Pod[]>(`${base}/pods`);
  const nodeGroupsQ = useFetch<NodeGroupInfo[]>(`${base}/nodegroups`);

  // Reset per-cluster state when the cluster changes.
  useEffect(() => {
    setTabValue(0);
    setVisitedTabs(new Set([0]));
    setNodeFilter('');
    setNodeGroupFilter('');
  }, [cluster.name]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setVisitedTabs((prev) => new Set(prev).add(newValue));
  };

  const handleNodeSelect = (nodeName: string) => {
    setNodeFilter(nodeName);
    setNodeGroupFilter('');
    setTabValue(1);
    setVisitedTabs((prev) => new Set(prev).add(1));
  };

  const handleNodeGroupSelect = (nodeGroupName: string) => {
    setNodeGroupFilter(nodeGroupName);
    setNodeFilter('');
    setTabValue(1);
    setVisitedTabs((prev) => new Set(prev).add(1));
  };

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontSize: '1rem', fontWeight: 600 }}>
        {cluster.displayName || cluster.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.75rem' }}>
        {cluster.server}
        {cluster.displayName && (
          <Box component="span" sx={{ ml: 1, color: 'text.disabled' }}>
            (Original name: {cluster.name})
          </Box>
        )}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            minHeight: '36px',
            '& .MuiTab-root': { minHeight: '36px', fontSize: '0.75rem', padding: '6px 12px' },
          }}
        >
          {TABS.map((label, i) => (
            <Tab key={label} label={label} id={`tab-${i}`} disableRipple />
          ))}
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0} keepMounted sx={{ p: 1, pt: 2 }}>
        <PanelState
          loading={nodesQ.loading || nodeGroupsQ.loading}
          error={nodesQ.error || nodeGroupsQ.error}
          onRetry={() => {
            nodesQ.refetch();
            nodeGroupsQ.refetch();
          }}
        >
          <NodesTable
            nodes={nodesQ.data || []}
            nodeGroups={nodeGroupsQ.data || []}
            onNodeSelect={handleNodeSelect}
            onNodeGroupSelect={handleNodeGroupSelect}
          />
        </PanelState>
      </TabPanel>

      <TabPanel value={tabValue} index={1} keepMounted sx={{ p: 1, pt: 2 }}>
        <PanelState loading={podsQ.loading} error={podsQ.error} onRetry={podsQ.refetch}>
          <PodsTable
            pods={podsQ.data || []}
            cluster={cluster}
            nodeFilter={nodeFilter}
            nodeGroupFilter={nodeGroupFilter}
            onNodeFilterChange={setNodeFilter}
            onNodeGroupFilterChange={setNodeGroupFilter}
          />
        </PanelState>
      </TabPanel>

      <TabPanel value={tabValue} index={2} keepMounted sx={{ p: 1, pt: 2 }}>
        {visitedTabs.has(2) && <SecretsTable cluster={cluster} />}
      </TabPanel>

      <TabPanel value={tabValue} index={3} keepMounted sx={{ p: 1, pt: 2 }}>
        {visitedTabs.has(3) && <HelmReleasesTable cluster={cluster} />}
      </TabPanel>
    </Box>
  );
}
