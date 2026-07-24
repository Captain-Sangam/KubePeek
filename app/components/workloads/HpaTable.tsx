'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Table, proportional, pixel, useTableSortable, useTableSortableState } from '@astryxdesign/core/Table';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { HpaSummary, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from '../shared/PanelState';
import ScopePicker from '../shared/ScopePicker';

type Row = HpaSummary & Record<string, unknown>;

interface HpaTableProps {
  cluster: Cluster;
  namespace: string | null;
  namespaces: string[];
  namespacesLoading: boolean;
  namespacesError: string | null;
  onNamespaceChange: (ns: string) => void;
  onRetryNamespaces: () => void;
  onAuthError: () => void;
}

export default function HpaTable({
  cluster, namespace, namespaces, namespacesLoading, namespacesError,
  onNamespaceChange, onRetryNamespaces, onAuthError,
}: HpaTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const { data, loading, error, authError, refetch } = useFetch<HpaSummary[]>(
    namespace
      ? `/api/clusters/${encodeURIComponent(cluster.name)}/hpa?namespace=${encodeURIComponent(namespace)}`
      : null
  );
  const hpas = useMemo(() => data || [], [data]);

  useEffect(() => {
    if (authError) onAuthError();
  }, [authError, onAuthError]);

  const filtered = hpas.filter((h) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return h.name.toLowerCase().includes(q) || h.reference.toLowerCase().includes(q);
  }) as Row[];

  const { sortedData, sortConfig } = useTableSortableState<Row>({
    data: filtered,
    defaultSort: [{ sortKey: 'name', direction: 'ascending' }],
    comparators: {
      minReplicas: (a, b) => a.minReplicas - b.minReplicas,
      maxReplicas: (a, b) => a.maxReplicas - b.maxReplicas,
      currentReplicas: (a, b) => a.currentReplicas - b.currentReplicas,
    },
  });
  const sortable = useTableSortable<Row>(sortConfig);

  // Gate on namespace: nothing loads until one is picked.
  if (!namespace) {
    return (
      <ScopePicker
        resourceLabel="autoscalers"
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
            label="Search autoscalers"
            isLabelHidden
            size="sm"
            placeholder="Search autoscalers..."
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

      <PanelState loading={loading} error={error} empty={!loading && !error && hpas.length === 0} emptyMessage={`No autoscalers in namespace "${namespace}"`} onRetry={refetch}>
        <div className="kp-table-scroll">
          <Table<Row>
            data={sortedData}
            idKey={(h) => `${h.namespace}-${h.name}`}
            density="compact"
            hasHover
            textOverflow="truncate"
            plugins={{ sortable }}
            columns={[
              { key: 'name', header: 'Name', width: proportional(2), sortable: true },
              {
                key: 'reference', header: 'Reference', width: proportional(1.5), sortable: true,
                renderCell: (h) => <Text type="code" size="2xs">{h.reference}</Text>,
              },
              { key: 'minReplicas', header: 'Min', width: pixel(60), sortable: true },
              { key: 'maxReplicas', header: 'Max', width: pixel(60), sortable: true },
              { key: 'currentReplicas', header: 'Replicas', width: pixel(80), sortable: true },
              {
                key: 'createdAt', header: 'Age', width: pixel(90), sortable: true,
                renderCell: (h) => <span title={formatFullTimestamp(h.createdAt)}>{formatAge(h.createdAt)}</span>,
              },
              {
                key: 'targets', header: 'Targets', width: proportional(1),
                renderCell: (h) => <Text type="code" size="2xs">{h.targets || '—'}</Text>,
              },
            ]}
          />
        </div>
      </PanelState>
    </>
  );
}
