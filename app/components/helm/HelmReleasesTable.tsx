'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Table, proportional, pixel, useTableSortable, useTableSortableState } from '@astryxdesign/core/Table';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Token } from '@astryxdesign/core/Token';
import { HelmReleaseSummary, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from '../shared/PanelState';
import ScopePicker from '../shared/ScopePicker';
import StatusChip from '../shared/StatusChip';
import { tableRowClick } from '../shared/tableRowClick';
import HelmReleaseDrawer from './HelmReleaseDrawer';

type Row = HelmReleaseSummary & Record<string, unknown>;

interface HelmReleasesTableProps {
  cluster: Cluster;
  namespace: string | null;
  namespaces: string[];
  namespacesLoading: boolean;
  namespacesError: string | null;
  onNamespaceChange: (ns: string) => void;
  onRetryNamespaces: () => void;
  onAuthError: () => void;
}

export default function HelmReleasesTable({
  cluster, namespace, namespaces, namespacesLoading, namespacesError,
  onNamespaceChange, onRetryNamespaces, onAuthError,
}: HelmReleasesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<HelmReleaseSummary | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const { data, loading, error, authError, refetch } = useFetch<HelmReleaseSummary[]>(
    namespace
      ? `/api/clusters/${encodeURIComponent(cluster.name)}/helm?namespace=${encodeURIComponent(namespace)}`
      : null
  );
  const releases = useMemo(() => data || [], [data]);

  useEffect(() => {
    if (authError) onAuthError();
  }, [authError, onAuthError]);

  const filtered = releases.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.namespace.toLowerCase().includes(q) || r.chart.toLowerCase().includes(q);
  }) as Row[];

  const { sortedData, sortConfig } = useTableSortableState<Row>({
    data: filtered,
    defaultSort: [{ sortKey: 'name', direction: 'ascending' }],
    comparators: { revision: (a, b) => a.revision - b.revision },
  });
  const sortable = useTableSortable<Row>(sortConfig);

  // Gate on namespace: nothing loads until one is picked.
  if (!namespace) {
    return (
      <ScopePicker
        resourceLabel="Helm releases"
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
            label="Search releases"
            isLabelHidden
            size="sm"
            placeholder="Search releases..."
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

      <PanelState loading={loading} error={error} empty={!loading && !error && releases.length === 0} emptyMessage={`No Helm releases in namespace "${namespace}"`} onRetry={refetch}>
        <div className="kp-table-scroll">
          <Table<Row>
            data={sortedData}
            idKey={(r) => `${r.namespace}-${r.name}`}
            density="compact"
            hasHover
            textOverflow="truncate"
            plugins={{ sortable, rowClick: tableRowClick<Row>((r) => setSelected(r)) }}
            columns={[
              { key: 'name', header: 'Release', width: proportional(2), sortable: true },
              {
                key: 'namespace', header: 'Namespace', width: proportional(1), sortable: true,
                renderCell: (r) => <Token label={r.namespace} size="sm" />,
              },
              {
                key: 'chart', header: 'Chart', width: proportional(1.5), sortable: true,
                renderCell: (r) => `${r.chart}${r.chartVersion ? `-${r.chartVersion}` : ''}`,
              },
              {
                key: 'appVersion', header: 'App Version', width: proportional(1), sortable: true,
                renderCell: (r) => r.appVersion || '—',
              },
              { key: 'revision', header: 'Rev', width: pixel(60), sortable: true },
              {
                key: 'status', header: 'Status', width: proportional(1), sortable: true,
                renderCell: (r) => <StatusChip status={r.status} />,
              },
              {
                key: 'updated', header: 'Updated', width: pixel(90), sortable: true,
                renderCell: (r) => <span title={formatFullTimestamp(r.updated)}>{formatAge(r.updated)}</span>,
              },
            ]}
          />
        </div>
      </PanelState>

      <HelmReleaseDrawer cluster={cluster} release={selected} open={!!selected} onClose={() => setSelected(null)} />
    </>
  );
}
