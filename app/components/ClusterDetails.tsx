'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';
import NodesTable from './NodesTable';
import PodsTable from './PodsTable';
import SecretsTable from './secrets/SecretsTable';
import HelmReleasesTable from './helm/HelmReleasesTable';
import DeploymentsTable from './workloads/DeploymentsTable';
import IngressesTable from './workloads/IngressesTable';
import HpaTable from './workloads/HpaTable';
import PanelState from './shared/PanelState';
import ScopePicker from './shared/ScopePicker';
import ReconnectBanner from './shared/ReconnectBanner';
import { Cluster, Node, Pod, NodeGroupInfo, ActiveView, PodsScope } from '../types/kubernetes';
import { useFetch } from '../hooks/useFetch';

const TAB_LABELS: Record<ActiveView, string> = {
  nodeGroups: 'Node Groups',
  nodes: 'Nodes',
  pods: 'Pods',
  helm: 'Helm',
  secrets: 'Secrets',
  ingresses: 'Ingresses',
  hpa: 'HPA',
  deployments: 'Deployments',
};

interface ClusterDetailsProps {
  cluster: Cluster;
  openTabs: ActiveView[];
  activeTab: ActiveView | null;
  onNavigate: (view: ActiveView) => void;
  onCloseTab: (view: ActiveView) => void;
}

export default function ClusterDetails({ cluster, openTabs, activeTab, onNavigate, onCloseTab }: ClusterDetailsProps) {
  const [podsScope, setPodsScope] = useState<PodsScope | null>(null);
  const [helmNamespace, setHelmNamespace] = useState<string | null>(null);
  const [secretsNamespace, setSecretsNamespace] = useState<string | null>(null);
  const [ingressesNamespace, setIngressesNamespace] = useState<string | null>(null);
  const [hpaNamespace, setHpaNamespace] = useState<string | null>(null);
  const [deploymentsNamespace, setDeploymentsNamespace] = useState<string | null>(null);
  const [lastNamespace, setLastNamespace] = useState<string | null>(null);
  const [authExpired, setAuthExpired] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const base = `/api/clusters/${encodeURIComponent(cluster.name)}`;

  // Every namespace-scoped view except pods (which uses a scope object).
  const nsViews: [ActiveView, string | null, (ns: string | null) => void][] = [
    ['helm', helmNamespace, setHelmNamespace],
    ['secrets', secretsNamespace, setSecretsNamespace],
    ['ingresses', ingressesNamespace, setIngressesNamespace],
    ['hpa', hpaNamespace, setHpaNamespace],
    ['deployments', deploymentsNamespace, setDeploymentsNamespace],
  ];

  // Reset per-cluster scope when the cluster changes.
  useEffect(() => {
    setPodsScope(null);
    setHelmNamespace(null);
    setSecretsNamespace(null);
    setIngressesNamespace(null);
    setHpaNamespace(null);
    setDeploymentsNamespace(null);
    setLastNamespace(null);
    setAuthExpired(false);
  }, [cluster.name]);

  // Tab lifecycle: closed tabs drop their scope (so reopening re-seeds);
  // newly opened tabs with no scope yet default to the last selected namespace.
  const prevTabsRef = useRef<ActiveView[]>(openTabs);
  useEffect(() => {
    const prev = prevTabsRef.current;
    prevTabsRef.current = openTabs;
    if (prev.includes('pods') && !openTabs.includes('pods')) setPodsScope(null);
    else if (lastNamespace && !prev.includes('pods') && openTabs.includes('pods') && !podsScope)
      setPodsScope({ type: 'namespace', value: lastNamespace });
    for (const [view, ns, setNs] of nsViews) {
      if (prev.includes(view) && !openTabs.includes(view)) setNs(null);
      else if (lastNamespace && !prev.includes(view) && openTabs.includes(view) && !ns)
        setNs(lastNamespace);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTabs]);

  const needsNamespaces = openTabs.some((v) => v !== 'nodes' && v !== 'nodeGroups');
  const needsNodes = openTabs.some((v) => v === 'nodes' || v === 'nodeGroups' || v === 'pods');

  const nodesQ = useFetch<Node[]>(needsNodes ? `${base}/nodes` : null);
  const nodeGroupsQ = useFetch<NodeGroupInfo[]>(openTabs.includes('nodeGroups') ? `${base}/nodegroups` : null);
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

  const renderView = (view: ActiveView) => {
    switch (view) {
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
              onSelectNamespace={(ns) => {
                setPodsScope({ type: 'namespace', value: ns });
                setLastNamespace(ns);
              }}
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
              onScopeChange={(s) => {
                setPodsScope(s);
                if (s?.type === 'namespace') setLastNamespace(s.value);
              }}
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
            onNamespaceChange={(ns) => {
              setSecretsNamespace(ns);
              setLastNamespace(ns);
            }}
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
            onNamespaceChange={(ns) => {
              setHelmNamespace(ns);
              setLastNamespace(ns);
            }}
            onRetryNamespaces={namespacesQ.refetch}
            onAuthError={handleAuthError}
          />
        );
      case 'ingresses':
        return (
          <IngressesTable
            key={`ingresses-${reloadNonce}`}
            cluster={cluster}
            namespace={ingressesNamespace}
            namespaces={namespaces}
            namespacesLoading={namespacesQ.loading}
            namespacesError={namespacesQ.error}
            onNamespaceChange={(ns) => {
              setIngressesNamespace(ns);
              setLastNamespace(ns);
            }}
            onRetryNamespaces={namespacesQ.refetch}
            onAuthError={handleAuthError}
          />
        );
      case 'hpa':
        return (
          <HpaTable
            key={`hpa-${reloadNonce}`}
            cluster={cluster}
            namespace={hpaNamespace}
            namespaces={namespaces}
            namespacesLoading={namespacesQ.loading}
            namespacesError={namespacesQ.error}
            onNamespaceChange={(ns) => {
              setHpaNamespace(ns);
              setLastNamespace(ns);
            }}
            onRetryNamespaces={namespacesQ.refetch}
            onAuthError={handleAuthError}
          />
        );
      case 'deployments':
        return (
          <DeploymentsTable
            key={`deployments-${reloadNonce}`}
            cluster={cluster}
            namespace={deploymentsNamespace}
            namespaces={namespaces}
            namespacesLoading={namespacesQ.loading}
            namespacesError={namespacesQ.error}
            onNamespaceChange={(ns) => {
              setDeploymentsNamespace(ns);
              setLastNamespace(ns);
            }}
            onRetryNamespaces={namespacesQ.refetch}
            onAuthError={handleAuthError}
          />
        );
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {authExpired && <ReconnectBanner cluster={cluster} onReconnect={handleReconnect} />}

      {openTabs.length > 0 && (
        <TabList value={activeTab ?? ''} onChange={(v) => onNavigate(v as ActiveView)} size="sm" hasDivider>
          {openTabs.map((view) => (
            <Tab
              key={view}
              value={view}
              label={TAB_LABELS[view]}
              endContent={
                // Plain clickable span, not IconButton — a button can't nest inside Tab's button.
                <span
                  role="button"
                  aria-label={`Close ${TAB_LABELS[view]}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(view);
                  }}
                  style={{ display: 'inline-flex', cursor: 'pointer' }}
                >
                  <Icon icon="close" size="xsm" color="secondary" />
                </span>
              }
            />
          ))}
        </TabList>
      )}

      <div style={{ paddingTop: 'var(--spacing-2)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {openTabs.map((view) => (
          <div
            key={view}
            style={
              view === activeTab
                ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }
                : { display: 'none' }
            }
          >
            {renderView(view)}
          </div>
        ))}
        {openTabs.length === 0 && (
          <VStack align="center" paddingBlock={10}>
            <Text type="body" color="secondary">
              Pick a view from the sidebar
            </Text>
          </VStack>
        )}
      </div>
    </div>
  );
}
