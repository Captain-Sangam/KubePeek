'use client';

import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import { HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { RefreshCw } from 'lucide-react';
import { Pod, Cluster, PodEvent } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import StatusChip from '../shared/StatusChip';
import PanelState from '../shared/PanelState';

type EventRow = PodEvent & Record<string, unknown>;

interface PodEventsTabProps {
  cluster: Cluster;
  pod: Pod;
}

export default function PodEventsTab({ cluster, pod }: PodEventsTabProps) {
  const url = `/api/clusters/${encodeURIComponent(cluster.name)}/pods/${encodeURIComponent(pod.namespace)}/${encodeURIComponent(pod.name)}/events`;
  const { data, loading, error, refetch } = useFetch<{ success: boolean; events: PodEvent[] }>(url);
  const events = (data?.events || []) as EventRow[];

  return (
    <div>
      <HStack hAlign="end" paddingBlock={0.5}>
        <IconButton
          label="Refresh events"
          tooltip="Refresh events"
          variant="ghost"
          size="sm"
          onClick={refetch}
          icon={<Icon icon={RefreshCw} size="sm" />}
        />
      </HStack>
      <PanelState loading={loading} error={error} empty={!loading && events.length === 0} emptyMessage="No events for this pod" onRetry={refetch}>
        <Table<EventRow>
          data={events}
          density="compact"
          columns={[
            { key: 'type', header: 'Type', width: pixel(90), renderCell: (e) => <StatusChip status={e.type} /> },
            {
              key: 'reason', header: 'Reason', width: proportional(1),
              renderCell: (e) => <Text type="body" size="2xs" weight="semibold">{e.reason}</Text>,
            },
            { key: 'message', header: 'Message', width: proportional(3) },
            { key: 'count', header: 'Count', width: pixel(60) },
            {
              key: 'lastSeen', header: 'Age', width: pixel(80),
              renderCell: (e) => (
                <span title={`First: ${formatFullTimestamp(e.firstSeen)}\nLast: ${formatFullTimestamp(e.lastSeen)}`}>
                  {formatAge(e.lastSeen)}
                </span>
              ),
            },
          ]}
        />
        {data && !data.success && (
          <Text type="supporting" size="2xs" as="p" style={{ marginTop: 'var(--spacing-2)' }}>
            Could not load events.
          </Text>
        )}
      </PanelState>
    </div>
  );
}
