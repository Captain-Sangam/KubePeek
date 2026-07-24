'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Table, proportional, pixel, useTableSortable, useTableSortableState } from '@astryxdesign/core/Table';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { IngressSummary, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from '../shared/PanelState';
import ScopePicker from '../shared/ScopePicker';

type Row = IngressSummary & Record<string, unknown>;

interface IngressesTableProps {
  cluster: Cluster;
  namespace: string | null;
  namespaces: string[];
  namespacesLoading: boolean;
  namespacesError: string | null;
  onNamespaceChange: (ns: string) => void;
  onRetryNamespaces: () => void;
  onAuthError: () => void;
}

export default function IngressesTable({
  cluster, namespace, namespaces, namespacesLoading, namespacesError,
  onNamespaceChange, onRetryNamespaces, onAuthError,
}: IngressesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const { data, loading, error, authError, refetch } = useFetch<IngressSummary[]>(
    namespace
      ? `/api/clusters/${encodeURIComponent(cluster.name)}/ingresses?namespace=${encodeURIComponent(namespace)}`
      : null
  );
  const ingresses = useMemo(() => data || [], [data]);

  useEffect(() => {
    if (authError) onAuthError();
  }, [authError, onAuthError]);

  const filtered = ingresses.filter((ing) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ing.name.toLowerCase().includes(q) ||
      ing.className.toLowerCase().includes(q) ||
      ing.address.toLowerCase().includes(q) ||
      ing.hosts.some((h) => h.toLowerCase().includes(q))
    );
  }) as Row[];

  const { sortedData, sortConfig } = useTableSortableState<Row>({
    data: filtered,
    defaultSort: [{ sortKey: 'name', direction: 'ascending' }],
    comparators: {
      hosts: (a, b) => a.hosts.join(',').toLowerCase().localeCompare(b.hosts.join(',').toLowerCase()),
    },
  });
  const sortable = useTableSortable<Row>(sortConfig);

  // Gate on namespace: nothing loads until one is picked.
  if (!namespace) {
    return (
      <ScopePicker
        resourceLabel="ingresses"
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
            label="Search ingresses"
            isLabelHidden
            size="sm"
            placeholder="Search ingresses..."
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

      <PanelState loading={loading} error={error} empty={!loading && !error && ingresses.length === 0} emptyMessage={`No ingresses in namespace "${namespace}"`} onRetry={refetch}>
        <div className="kp-table-scroll">
          <Table<Row>
            data={sortedData}
            idKey={(ing) => `${ing.namespace}-${ing.name}`}
            density="compact"
            hasHover
            textOverflow="truncate"
            plugins={{ sortable }}
            columns={[
              { key: 'name', header: 'Name', width: proportional(2), sortable: true },
              {
                key: 'className', header: 'Class', width: proportional(1), sortable: true,
                renderCell: (ing) => <Text type="code" size="2xs">{ing.className || '—'}</Text>,
              },
              {
                key: 'hosts', header: 'Hosts', width: proportional(2), sortable: true,
                renderCell: (ing) => <span title={ing.hosts.join(', ')}>{ing.hosts.join(', ') || '—'}</span>,
              },
              {
                key: 'address', header: 'Address', width: proportional(1.5), sortable: true,
                renderCell: (ing) => <span title={ing.address}>{ing.address || '—'}</span>,
              },
              {
                key: 'createdAt', header: 'Age', width: pixel(90), sortable: true,
                renderCell: (ing) => <span title={formatFullTimestamp(ing.createdAt)}>{formatAge(ing.createdAt)}</span>,
              },
            ]}
          />
        </div>
      </PanelState>
    </>
  );
}
