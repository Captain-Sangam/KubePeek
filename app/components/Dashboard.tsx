'use client';

import { useState, useEffect } from 'react';
import { HStack, VStack, StackItem } from '@astryxdesign/core/Stack';
import { Card } from '@astryxdesign/core/Card';
import { Banner } from '@astryxdesign/core/Banner';
import { Center } from '@astryxdesign/core/Center';
import { Text } from '@astryxdesign/core/Text';
import Sidebar from './Sidebar';
import Header from './Header';
import type { ViewStatus } from '../lib/RefreshContext';
import ClusterDetails from './ClusterDetails';
import { Cluster, ActiveView } from '../types/kubernetes';
import {
  getClusterDisplayNames,
  getSidebarCollapsed,
  saveSidebarCollapsed,
} from '../lib/kubernetes-client';
import { DEFAULT_CONTEXT_NAME } from '../lib/constants';

export default function Dashboard() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [openTabs, setOpenTabs] = useState<ActiveView[]>(['pods']);
  const [activeTab, setActiveTab] = useState<ActiveView | null>('pods');

  const [viewStatus, setViewStatus] = useState<ViewStatus>({ scope: null, lastUpdated: null, isRefreshing: false, refreshError: null });

  // Open-if-absent + focus; max one tab per view.
  const handleNavigate = (view: ActiveView) => {
    setOpenTabs((prev) => (prev.includes(view) ? prev : [...prev, view]));
    setActiveTab(view);
  };

  const handleCloseTab = (view: ActiveView) => {
    const idx = openTabs.indexOf(view);
    const next = openTabs.filter((v) => v !== view);
    setOpenTabs(next);
    // Focus the right neighbor (slides into the closed slot), else left, else none.
    if (activeTab === view) setActiveTab(next[Math.min(idx, next.length - 1)] ?? null);
  };

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
          throw new Error(`Failed to fetch clusters: ${res.status}`);
        }
        const data = await res.json();

        if (!Array.isArray(data)) {
          throw new Error(`Invalid response data format: expected array, got ${typeof data}`);
        }

        const displayNames = getClusterDisplayNames();
        const clustersWithDisplayNames = data.map((c: Cluster) => ({
          ...c,
          displayName:
            displayNames[c.name] || (c.name === DEFAULT_CONTEXT_NAME ? 'Default Cluster' : undefined),
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
    setViewStatus({ scope: null, lastUpdated: null, isRefreshing: false, refreshError: null });
    setSelectedCluster(cluster);
  };

  return (
    <VStack height="100vh" style={{ overflow: 'hidden' }}>
      <Header cluster={selectedCluster} activeView={activeTab} status={viewStatus} />
      <VStack padding={4} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {error && (
          <VStack style={{ marginBottom: 'var(--spacing-4)' }}>
            <Banner status="error" title={error} />
          </VStack>
        )}

        <HStack gap={4} height="100%" style={{ minHeight: 0 }}>
          {/* Sidebar panel; width animates on collapse. */}
          <VStack
            style={{
              width: collapsed ? 64 : 240,
              flexShrink: 0,
              height: '100%',
              transition: 'width 0.2s ease',
            }}
          >
            <Card height="100%" padding={collapsed ? 2 : 3}>
              <Sidebar
                clusters={clusters}
                selectedCluster={selectedCluster}
                onSelectCluster={handleClusterSelect}
                loading={loading}
                collapsed={collapsed}
                onToggleCollapse={handleToggleCollapse}
                activeView={activeTab}
                onNavigate={handleNavigate}
              />
            </Card>
          </VStack>

          <StackItem size="fill">
            <VStack style={{ minWidth: 0, height: '100%' }}>
              <Card height="100%" padding={4}>
                <VStack height="100%" style={{ overflow: 'hidden' }}>
                  {selectedCluster ? (
                    <ClusterDetails
                      key={selectedCluster.name}
                      cluster={selectedCluster}
                      onViewStatusChange={setViewStatus}
                      openTabs={openTabs}
                      activeTab={activeTab}
                      onNavigate={handleNavigate}
                      onCloseTab={handleCloseTab}
                    />
                  ) : (
                    <Center>
                      <Text type="body" color="secondary">
                        {loading
                          ? 'Loading clusters...'
                          : clusters.length === 0
                            ? 'No clusters found'
                            : 'Select a cluster to view details'}
                      </Text>
                    </Center>
                  )}
                </VStack>
              </Card>
            </VStack>
          </StackItem>
        </HStack>
      </VStack>
    </VStack>
  );
}
