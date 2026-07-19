'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import NodesTable from './NodesTable';
import PodsTable from './PodsTable';
import SecretsTable from './secrets/SecretsTable';
import HelmReleasesTable from './helm/HelmReleasesTable';
import PanelState from './shared/PanelState';
import ScopePicker from './shared/ScopePicker';
import ReconnectBanner from './shared/ReconnectBanner';
import { Cluster, Node, Pod, NodeGroupInfo, ActiveView, PodsScope } from '../types/kubernetes';
import { useFetch } from '../hooks/useFetch';

interface ClusterDetailsProps {
  cluster: Cluster;
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}

export default function ClusterDetails({ cluster, activeView, onNavigate }: ClusterDetailsProps) {
  const [podsScope, setPodsScope] = useState<PodsScope | null>(null);
  const [helmNamespace, setHelmNamespace] = useState<string | null>(null);
  const [secretsNamespace, setSecretsNamespace] = useState<string | null>(null);
  const [visitedViews, setVisitedViews] = useState<Set<ActiveView>>(new Set([activeView]));
  const [authExpired, setAuthExpired] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const base = `/api/clusters/${encodeURIComponent(cluster.name)}`;

  // Reset per-cluster scope when the cluster changes.
  useEffect(() => {
    setPodsScope(null);
    setHelmNamespace(null);
    setSecretsNamespace(null);
    setVisitedViews(new Set([activeView]));
    setAuthExpired(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster.name]);

  // Track which views have been opened so their data stays available.
  useEffect(() => {
    setVisitedViews((prev) => (prev.has(activeView) ? prev : new Set(prev).add(activeView)));
  }, [activeView]);

  const needsNamespaces = activeView === 'pods' || activeView === 'helm' || activeView === 'secrets';
  const needsNodes =
    visitedViews.has('nodes') || visitedViews.has('nodeGroups') || activeView === 'pods';

  const nodesQ = useFetch<Node[]>(needsNodes ? `${base}/nodes` : null);
  const nodeGroupsQ = useFetch<NodeGroupInfo[]>(visitedViews.has('nodeGroups') ? `${base}/nodegroups` : null);
  const namespacesQ = useFetch<string[]>(needsNamespaces ? `${base}/namespaces` : null);

  const podsUrl = podsScope
    ? `${base}/pods?` +
      new URLSearchParams(
        podsScope.type === 'namespace'
          ? { namespace: podsScope.value }
          : podsScope.type === 'node'
            ? { node: podsScope.value }
            : { nodeGroup: podsScope.value }
      ).toString()
    : null;
  const podsQ = useFetch<Pod[]>(podsUrl);

  // Surface auth expiry from any owned query.
  useEffect(() => {
    if (nodesQ.authError || nodeGroupsQ.authError || namespacesQ.authError || podsQ.authError) {
      setAuthExpired(true);
    }
  }, [nodesQ.authError, nodeGroupsQ.authError, namespacesQ.authError, podsQ.authError]);

  const handleAuthError = useCallback(() => setAuthExpired(true), []);

  // Reconnect: refetch everything (which re-runs `aws eks get-token`) and
  // remount the child tables (via reloadNonce → key) so their own fetches rerun.
  const handleReconnect = () => {
    setAuthExpired(false);
    nodesQ.refetch();
    nodeGroupsQ.refetch();
    namespacesQ.refetch();
    podsQ.refetch();
    setReloadNonce((n) => n + 1);
  };

  const handleNodeSelect = (nodeName: string) => {
    setPodsScope({ type: 'node', value: nodeName });
    onNavigate('pods');
  };
  const handleNodeGroupSelect = (nodeGroupName: string) => {
    setPodsScope({ type: 'nodeGroup', value: nodeGroupName });
    onNavigate('pods');
  };

  const namespaces = useMemo(() => namespacesQ.data || [], [namespacesQ.data]);
  const nodeNames = useMemo(
    () => (nodesQ.data || []).map((n) => n.name).sort(),
    [nodesQ.data]
  );

  const renderView = () => {
    switch (activeView) {
      case 'nodeGroups':
        return (
          <PanelState
            loading={nodeGroupsQ.loading || nodesQ.loading}
            error={nodeGroupsQ.error || nodesQ.error}
            onRetry={() => {
              nodeGroupsQ.refetch();
              nodesQ.refetch();
            }}
          >
            <NodesTable
              nodes={nodesQ.data || []}
              nodeGroups={nodeGroupsQ.data || []}
              viewMode="nodeGroups"
              onNodeSelect={handleNodeSelect}
              onNodeGroupSelect={handleNodeGroupSelect}
            />
          </PanelState>
        );
      case 'nodes':
        return (
          <PanelState loading={nodesQ.loading} error={nodesQ.error} onRetry={nodesQ.refetch}>
            <NodesTable
              nodes={nodesQ.data || []}
              nodeGroups={[]}
              viewMode="nodes"
              onNodeSelect={handleNodeSelect}
              onNodeGroupSelect={handleNodeGroupSelect}
            />
          </PanelState>
        );
      case 'pods':
        if (!podsScope) {
          return (
            <ScopePicker
              resourceLabel="pods"
              namespaces={namespaces}
              loading={namespacesQ.loading}
              error={namespacesQ.error}
              onRetry={namespacesQ.refetch}
              onSelectNamespace={(ns) => setPodsScope({ type: 'namespace', value: ns })}
              nodes={nodeNames}
              onSelectNode={(node) => setPodsScope({ type: 'node', value: node })}
            />
          );
        }
        return (
          <PanelState loading={podsQ.loading} error={podsQ.error} onRetry={podsQ.refetch}>
            <PodsTable
              pods={podsQ.data || []}
              cluster={cluster}
              scope={podsScope}
              onScopeChange={setPodsScope}
              namespaces={namespaces}
              nodeNames={nodeNames}
              onPodDeleted={podsQ.refetch}
            />
          </PanelState>
        );
      case 'secrets':
        return (
          <SecretsTable
            key={`secrets-${reloadNonce}`}
            cluster={cluster}
            namespace={secretsNamespace}
            namespaces={namespaces}
            namespacesLoading={namespacesQ.loading}
            namespacesError={namespacesQ.error}
            onNamespaceChange={setSecretsNamespace}
            onRetryNamespaces={namespacesQ.refetch}
            onAuthError={handleAuthError}
          />
        );
      case 'helm':
        return (
          <HelmReleasesTable
            key={`helm-${reloadNonce}`}
            cluster={cluster}
            namespace={helmNamespace}
            namespaces={namespaces}
            namespacesLoading={namespacesQ.loading}
            namespacesError={namespacesQ.error}
            onNamespaceChange={setHelmNamespace}
            onRetryNamespaces={namespacesQ.refetch}
            onAuthError={handleAuthError}
          />
        );
    }
  };

  return (
    <Box sx={{ height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 0.5, fontSize: '1rem', fontWeight: 600 }}>
            {cluster.displayName || cluster.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {cluster.server}
            {cluster.displayName && (
              <Box component="span" sx={{ ml: 1, color: 'text.disabled' }}>
                (Original name: {cluster.name})
              </Box>
            )}
          </Typography>
        </Box>
        <Tooltip title="Reconnect (refresh credentials)" arrow>
          <IconButton size="small" onClick={handleReconnect} sx={{ p: 0.5 }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {authExpired && <ReconnectBanner cluster={cluster} onReconnect={handleReconnect} />}

      <Box sx={{ pt: 1 }}>{renderView()}</Box>
    </Box>
  );
}
