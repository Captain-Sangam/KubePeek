'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Table, proportional, pixel, useTableSortable, useTableSortableState } from '@astryxdesign/core/Table';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Token } from '@astryxdesign/core/Token';
import { Text } from '@astryxdesign/core/Text';
import { SecretSummary, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from '../shared/PanelState';
import ScopePicker from '../shared/ScopePicker';
import { tableRowClick } from '../shared/tableRowClick';
import SecretDetailDialog from './SecretDetailDialog';

type SecretRow = SecretSummary & Record<string, unknown>;

interface SecretsTableProps {
  cluster: Cluster;
  namespace: string | null;
  namespaces: string[];
  namespacesLoading: boolean;
  namespacesError: string | null;
  onNamespaceChange: (ns: string) => void;
  onRetryNamespaces: () => void;
  onAuthError: () => void;
}

export default function SecretsTable({
  cluster, namespace, namespaces, namespacesLoading, namespacesError,
  onNamespaceChange, onRetryNamespaces, onAuthError,
}: SecretsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTls, setShowTls] = useState(false);
  const [selected, setSelected] = useState<SecretSummary | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const { data, loading, error, authError, refetch } = useFetch<SecretSummary[]>(
    namespace
      ? `/api/clusters/${encodeURIComponent(cluster.name)}/secrets?namespace=${encodeURIComponent(namespace)}`
      : null
  );
  const secrets = useMemo(() => data || [], [data]);

  useEffect(() => {
    if (authError) onAuthError();
  }, [authError, onAuthError]);

  const filtered = secrets.filter((s) => {
    if (!showTls && s.type === 'kubernetes.io/tls') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.namespace.toLowerCase().includes(q) || s.type.toLowerCase().includes(q);
  }) as SecretRow[];

  const { sortedData, sortConfig } = useTableSortableState<SecretRow>({
    data: filtered,
    defaultSort: [{ sortKey: 'name', direction: 'ascending' }],
    comparators: { keyCount: (a, b) => a.keyCount - b.keyCount },
  });
  const sortable = useTableSortable<SecretRow>(sortConfig);

  // Gate on namespace: nothing loads until one is picked.
  if (!namespace) {
    return (
      <ScopePicker
        resourceLabel="secrets"
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
            label="Search secrets"
            isLabelHidden
            size="sm"
            placeholder="Search secrets..."
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
        <CheckboxInput label="Show TLS" value={showTls} onChange={(checked) => setShowTls(checked)} />
      </HStack>

      <PanelState loading={loading} error={error} empty={!loading && !error && secrets.length === 0} emptyMessage={`No secrets in namespace "${namespace}"`} onRetry={refetch}>
        <div className="kp-table-scroll">
          <Table<SecretRow>
            data={sortedData}
            idKey={(s) => `${s.namespace}-${s.name}`}
            density="compact"
            hasHover
            textOverflow="truncate"
            plugins={{ sortable, rowClick: tableRowClick<SecretRow>((s) => setSelected(s)) }}
            columns={[
              { key: 'name', header: 'Name', width: proportional(2), sortable: true },
              {
                key: 'namespace', header: 'Namespace', width: proportional(1), sortable: true,
                renderCell: (s) => <Token label={s.namespace} size="sm" />,
              },
              {
                key: 'type', header: 'Type', width: proportional(1), sortable: true,
                renderCell: (s) => <Text type="code" size="2xs">{s.type}</Text>,
              },
              { key: 'keyCount', header: 'Keys', width: pixel(70), sortable: true },
              {
                key: 'createdAt', header: 'Age', width: pixel(90), sortable: true,
                renderCell: (s) => <span title={formatFullTimestamp(s.createdAt)}>{formatAge(s.createdAt)}</span>,
              },
            ]}
          />
        </div>
      </PanelState>

      <SecretDetailDialog
        cluster={cluster}
        secret={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onDeleted={() => {
          setSelected(null);
          refetch();
        }}
      />
    </>
  );
}
