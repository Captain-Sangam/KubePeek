'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Table, proportional, pixel, useTableSortable, useTableSortableState,
  type TableColumn, type TableSortComparator,
} from '@astryxdesign/core/Table';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from './PanelState';
import ScopePicker from './ScopePicker';

// Props every namespace-gated table receives from ClusterDetails (see NS_TABLES).
// Auth expiry needs no prop: useFetch reports it through RefreshContext.
export interface NsTableProps {
  cluster: Cluster;
  namespace: string | null;
  namespaces: string[];
  namespacesLoading: boolean;
  namespacesError: string | null;
  onNamespaceChange: (ns: string) => void;
  onRetryNamespaces: () => void;
}

interface ListRow {
  name: string;
  namespace: string;
  createdAt: string;
}

type Row<T> = T & Record<string, unknown>;

interface NamespacedResourceTableProps<T extends ListRow> extends NsTableProps {
  /** Key in the resources route's LISTERS map, e.g. "cronjobs". */
  resource: string;
  /** Plural, lowercase noun for UI copy, e.g. "cron jobs". */
  label: string;
  /** Columns between the built-in Name (first) and Age (last) columns. */
  columns: TableColumn<Row<T>>[];
  comparators?: Record<string, TableSortComparator<Row<T>>>;
  /** Text the search box matches against; defaults to name + namespace. */
  searchText?: (row: T) => string;
}

// A namespace-gated, searchable, sortable list of one resource kind, fetched
// from /api/clusters/<cluster>/resources/<resource>. Views in
// workloads/WorkloadTables.tsx are column configs for this.
export default function NamespacedResourceTable<T extends ListRow>({
  cluster, namespace, namespaces, namespacesLoading, namespacesError,
  onNamespaceChange, onRetryNamespaces,
  resource, label, columns, comparators, searchText = (r) => `${r.name} ${r.namespace}`,
}: NamespacedResourceTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const { data, loading, error, refetch } = useFetch<T[]>(
    namespace
      ? `/api/clusters/${encodeURIComponent(cluster.name)}/resources/${resource}?namespace=${encodeURIComponent(namespace)}`
      : null
  );
  const rows = useMemo(() => data || [], [data]);

  const q = searchQuery.toLowerCase();
  const filtered = (q ? rows.filter((r) => searchText(r).toLowerCase().includes(q)) : rows) as Row<T>[];

  const { sortedData, sortConfig } = useTableSortableState<Row<T>>({
    data: filtered,
    defaultSort: [{ sortKey: 'name', direction: 'ascending' }],
    comparators,
  });
  const sortable = useTableSortable<Row<T>>(sortConfig);

  // Gate on namespace: nothing loads until one is picked.
  if (!namespace) {
    return (
      <ScopePicker
        resourceLabel={label}
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
            label={`Search ${label}`}
            isLabelHidden
            size="sm"
            placeholder={`Search ${label}...`}
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

      <PanelState loading={loading} error={error} empty={!loading && !error && rows.length === 0} emptyMessage={`No ${label} in namespace "${namespace}"`} onRetry={refetch}>
        <div className="kp-table-scroll">
          <Table<Row<T>>
            data={sortedData}
            idKey={(r) => `${r.namespace}-${r.name}`}
            density="compact"
            hasHover
            textOverflow="truncate"
            plugins={{ sortable }}
            columns={[
              { key: 'name', header: 'Name', width: proportional(2), sortable: true },
              ...columns,
              {
                key: 'createdAt', header: 'Age', width: pixel(90), sortable: true,
                renderCell: (r) => <span title={formatFullTimestamp(r.createdAt)}>{formatAge(r.createdAt)}</span>,
              },
            ]}
          />
        </div>
      </PanelState>
    </>
  );
}
