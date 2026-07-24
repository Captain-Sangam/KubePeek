'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Table, proportional, pixel, useTableSortable, useTableSortableState } from '@astryxdesign/core/Table';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { DeploymentSummary, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from '../shared/PanelState';
import ScopePicker from '../shared/ScopePicker';

type Row = DeploymentSummary & Record<string, unknown>;

interface DeploymentsTableProps {
  cluster: Cluster;
  namespace: string | null;
  namespaces: string[];
  namespacesLoading: boolean;
  namespacesError: string | null;
  onNamespaceChange: (ns: string) => void;
  onRetryNamespaces: () => void;
  onAuthError: () => void;
}

export default function DeploymentsTable({
  cluster, namespace, namespaces, namespacesLoading, namespacesError,
  onNamespaceChange, onRetryNamespaces, onAuthError,
}: DeploymentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const { data, loading, error, authError, refetch } = useFetch<DeploymentSummary[]>(
    namespace
      ? `/api/clusters/${encodeURIComponent(cluster.name)}/deployments?namespace=${encodeURIComponent(namespace)}`
      : null
  );
  const deployments = useMemo(() => data || [], [data]);

  useEffect(() => {
    if (authError) onAuthError();
  }, [authError, onAuthError]);

  const filtered = deployments.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.namespace.toLowerCase().includes(q);
  }) as Row[];

  const { sortedData, sortConfig } = useTableSortableState<Row>({
    data: filtered,
    defaultSort: [{ sortKey: 'name', direction: 'ascending' }],
    comparators: {
      readyCount: (a, b) => a.readyCount - b.readyCount,
      upToDate: (a, b) => a.upToDate - b.upToDate,
      available: (a, b) => a.available - b.available,
    },
  });
  const sortable = useTableSortable<Row>(sortConfig);

  // Gate on namespace: nothing loads until one is picked.
  if (!namespace) {
    return (
      <ScopePicker
        resourceLabel="deployments"
        namespaces={namespaces}
        loading={namespacesLoading}
        error={namespacesError}
        onRetry={onRetryNamespaces}
        onSelectNamespace={onNamespaceChange}
      />
    );
  }

  return (
    <>
      <HStack gap={2} wrap="wrap" paddingBlock={2}>
        <StackItem size="fill">
          <TextInput
            label="Search deployments"
            isLabelHidden
            size="sm"
            placeholder="Search deployments..."
            startIcon="search"
            ref={searchRef}
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
          />
        </StackItem>
        <Selector
          label="Namespace"
          isLabelHidden
          size="sm"
          hasSearch
          options={namespaces}
          value={namespace}
          onChange={(value) => value && onNamespaceChange(value)}
        />
      </HStack>

      <PanelState loading={loading} error={error} empty={!loading && !error && deployments.length === 0} emptyMessage={`No deployments in namespace "${namespace}"`} onRetry={refetch}>
        <div className="kp-table-scroll">
          <Table<Row>
            data={sortedData}
            idKey={(d) => `${d.namespace}-${d.name}`}
            density="compact"
            hasHover
            textOverflow="truncate"
            plugins={{ sortable }}
            columns={[
              { key: 'name', header: 'Name', width: proportional(2), sortable: true },
              {
                key: 'readyCount', header: 'Ready', width: proportional(1), sortable: true,
                renderCell: (d) => (
                  <span style={d.readyCount < d.desired ? { color: 'var(--color-warning)' } : undefined}>{d.ready}</span>
                ),
              },
              { key: 'upToDate', header: 'Up-to-date', width: proportional(1), sortable: true },
              { key: 'available', header: 'Available', width: proportional(1), sortable: true },
              {
                key: 'createdAt', header: 'Age', width: pixel(90), sortable: true,
                renderCell: (d) => <span title={formatFullTimestamp(d.createdAt)}>{formatAge(d.createdAt)}</span>,
              },
            ]}
          />
        </div>
      </PanelState>
    </>
  );
}
