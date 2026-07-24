'use client';

import { useState, useRef } from 'react';
import { Table, proportional, pixel, useTableSortable, useTableSortableState } from '@astryxdesign/core/Table';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Token } from '@astryxdesign/core/Token';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Pod, Cluster, PodsScope } from '../types/kubernetes';
import { parseNumericValue, basisLabel } from '../lib/format';
import { useFindShortcut } from '../hooks/useFindShortcut';
import UsageBar from './shared/UsageBar';
import StatusChip from './shared/StatusChip';
import { tableRowClick } from './shared/tableRowClick';
import PodDetailDrawer from './pods/PodDetailDrawer';

type Row = Pod & Record<string, unknown>;

interface PodsTableProps {
  pods: Pod[];
  cluster: Cluster;
  scope: PodsScope;
  onScopeChange: (scope: PodsScope | null) => void;
  namespaces: string[];
  nodeNames: string[];
  onPodDeleted?: () => void;
}

const cpuTooltip = (pod: Pod): string => {
  const denom = pod.cpuBasis === 'limit' ? pod.cpuLimit : pod.cpuBasis === 'request' ? pod.cpuRequest : undefined;
  if (pod.cpuPercent == null) return `CPU ${pod.cpuUsage}`;
  return `${pod.cpuUsage} of ${denom || 'node allocatable'} ${basisLabel(pod.cpuBasis)} (${pod.cpuPercent}%)`;
};
const memTooltip = (pod: Pod): string => {
  const denom = pod.memoryBasis === 'limit' ? pod.memoryLimit : pod.memoryBasis === 'request' ? pod.memoryRequest : undefined;
  if (pod.memoryPercent == null) return `Memory ${pod.memoryUsage}`;
  return `${pod.memoryUsage} of ${denom || 'node allocatable'} ${basisLabel(pod.memoryBasis)} (${pod.memoryPercent}%)`;
};

export default function PodsTable({
  pods,
  cluster,
  scope,
  onScopeChange,
  namespaces,
  nodeNames,
  onPodDeleted,
}: PodsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  // Server already scoped the pods; only search filters client-side.
  const filteredPods = pods.filter((pod) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      pod.name.toLowerCase().includes(q) ||
      pod.namespace.toLowerCase().includes(q) ||
      pod.status.toLowerCase().includes(q) ||
      (pod.helmChart && pod.helmChart.toLowerCase().includes(q)) ||
      pod.nodeName.toLowerCase().includes(q)
    );
  }) as Row[];

  const { sortedData, sortConfig } = useTableSortableState<Row>({
    data: filteredPods,
    defaultSort: [{ sortKey: 'name', direction: 'ascending' }],
    comparators: {
      restarts: (a, b) => (a.restarts || 0) - (b.restarts || 0),
      cpuUsage: (a, b) => parseNumericValue(a.cpuUsage) - parseNumericValue(b.cpuUsage),
      memoryUsage: (a, b) => parseNumericValue(a.memoryUsage) - parseNumericValue(b.memoryUsage),
      creationTimestamp: (a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''),
    },
  });
  const sortable = useTableSortable<Row>(sortConfig);

  const emptyMessage = [
    'No pods found',
    searchQuery && ` matching "${searchQuery}"`,
    scope.type === 'namespace' && ` in namespace "${scope.value}"`,
    scope.type === 'node' && ` on node "${scope.value}"`,
    scope.type === 'nodeGroup' && ` in node group "${scope.value}"`,
  ].filter(Boolean).join('');

  return (
    <>
      <HStack gap={2} wrap="wrap" paddingBlock={2}>
        <StackItem size="fill">
          <TextInput
            label="Search pods"
            isLabelHidden
            size="sm"
            placeholder="Search pods..."
            startIcon="search"
            ref={searchRef}
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
          />
        </StackItem>
        {/* Scope control: a dropdown to change the value within the current
            scope type (namespace/node), plus a chip label. Deleting returns to
            the picker to pick a different scope type. */}
        {scope.type === 'nodeGroup' ? (
          <Token
            label={`Node group: ${scope.value}`}
            size="sm"
            onRemove={() => onScopeChange(null)}
          />
        ) : (
          <>
            <Selector
              label={scope.type === 'namespace' ? 'Namespace' : 'Node'}
              isLabelHidden
              size="sm"
              hasSearch
              options={scope.type === 'namespace' ? namespaces : nodeNames}
              value={scope.value}
              onChange={(value) => value && onScopeChange({ type: scope.type, value })}
            />
            <Button
              label="Change"
              variant="ghost"
              size="sm"
              tooltip="Change scope"
              onClick={() => onScopeChange(null)}
            />
          </>
        )}
      </HStack>

      {sortedData.length === 0 ? (
        <Text type="supporting" color="secondary">{emptyMessage}</Text>
      ) : (
        <div className="kp-table-scroll">
          <Table<Row>
            data={sortedData}
            idKey={(pod) => `${pod.namespace}-${pod.name}`}
            density="compact"
            hasHover
            textOverflow="truncate"
            plugins={{ sortable, rowClick: tableRowClick<Row>((pod) => setSelectedPod(pod)) }}
            columns={[
              { key: 'name', header: 'Name', width: proportional(2.5), sortable: true },
              {
                key: 'namespace', header: 'Namespace', width: proportional(1), sortable: true,
                renderCell: (pod) => <Token label={pod.namespace} size="sm" />,
              },
              {
                key: 'status', header: 'Status', width: proportional(1), sortable: true,
                renderCell: (pod) => <StatusChip status={pod.status} />,
              },
              {
                key: 'restarts', header: 'Restarts', width: pixel(80), align: 'end', sortable: true,
                renderCell: (pod) => (
                  <span
                    title="Restarts across containers"
                    style={{
                      fontWeight: (pod.restarts || 0) > 0 ? 600 : undefined,
                      color:
                        (pod.restarts || 0) > 10
                          ? 'var(--color-error)'
                          : (pod.restarts || 0) > 0
                            ? 'var(--color-warning)'
                            : undefined,
                    }}
                  >
                    {pod.restarts ?? 0}
                  </span>
                ),
              },
              {
                key: 'cpuUsage', header: 'CPU', width: proportional(1.5), sortable: true,
                renderCell: (pod) => (
                  <UsageBar percent={pod.cpuPercent} caption={pod.cpuUsage} tooltip={cpuTooltip(pod)} fallbackText={pod.cpuUsage} />
                ),
              },
              {
                key: 'memoryUsage', header: 'Memory', width: proportional(1.5), sortable: true,
                renderCell: (pod) => (
                  <UsageBar percent={pod.memoryPercent} caption={pod.memoryUsage} tooltip={memTooltip(pod)} fallbackText={pod.memoryUsage} />
                ),
              },
              { key: 'nodeName', header: 'Node', width: proportional(1.5), sortable: true },
              { key: 'creationTimestamp', header: 'Age', width: pixel(70), sortable: true },
            ]}
          />
        </div>
      )}

      <PodDetailDrawer
        pod={selectedPod}
        cluster={cluster}
        open={!!selectedPod}
        onClose={() => setSelectedPod(null)}
        onDeleted={() => {
          setSelectedPod(null);
          onPodDeleted?.();
        }}
      />
    </>
  );
}
