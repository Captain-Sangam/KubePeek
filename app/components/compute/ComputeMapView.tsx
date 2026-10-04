'use client';

import { memo, useMemo, useRef, useState } from 'react';
import { Box, Clock3, CircleAlert, CircleHelp, Server } from 'lucide-react';
import { Grid } from '@astryxdesign/core/Grid';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Icon } from '@astryxdesign/core/Icon';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { HoverCard } from '@astryxdesign/core/HoverCard';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import type { Cluster, Node, Pod } from '../../types/kubernetes';
import { statusColor, type StatusColor } from '../../lib/status';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import { matchesPodName, selectMapPods } from '../../lib/compute-map';
import PanelState from '../shared/PanelState';
import StatusChip from '../shared/StatusChip';
import CapacityChip from '../nodes/CapacityChip';

const MAX_PODS = 40;
const statusStyles = {
  green: { background: 'var(--color-background-green)', borderColor: 'var(--color-border-green)', color: 'var(--color-text-green)' },
  yellow: { background: 'var(--color-background-yellow)', borderColor: 'var(--color-border-yellow)', color: 'var(--color-text-yellow)' },
  red: { background: 'var(--color-background-red)', borderColor: 'var(--color-border-red)', color: 'var(--color-text-red)' },
  gray: { background: 'var(--color-background-gray)', borderColor: 'var(--color-border-gray)', color: 'var(--color-text-gray)' },
};
const statusGlyph = { green: Box, yellow: Clock3, red: CircleAlert, gray: CircleHelp };
const statusLegend = [
  { color: 'green', label: 'Healthy', variant: 'success' },
  { color: 'yellow', label: 'Waiting', variant: 'warning' },
  { color: 'red', label: 'Failed', variant: 'error' },
  { color: 'gray', label: 'Other', variant: 'neutral' },
] as const;

const PodTile = memo(function PodTile({ pod, searchMatch }: { pod: Pod; searchMatch?: boolean }) {
  const color = statusColor(pod.status);
  const [previewOpen, setPreviewOpen] = useState(false);
  return (
    <HoverCard hasHoverIndication={false} focusTrigger="always" onOpenChange={setPreviewOpen} content={previewOpen ?
      <VStack gap={3} maxWidth="calc(var(--spacing-10) * 10)" style={{ maxHeight: 'calc(100dvh - var(--spacing-10) * 2)' }} isScrollable>
        <Text type="label" style={{ overflowWrap: 'anywhere' }}>{pod.name}</Text>
        <HStack><StatusChip status={pod.status} /></HStack>
        <MetadataList label={{ position: 'start', width: 'calc(var(--spacing-10) * 3)' }}>
          <MetadataListItem label="Namespace"><Text type="body" style={{ overflowWrap: 'anywhere' }}>{pod.namespace}</Text></MetadataListItem>
          <MetadataListItem label="Age"><Tooltip content={`Created: ${formatFullTimestamp(pod.createdAt)}`}><Text type="body">{pod.createdAt ? formatAge(pod.createdAt) : pod.creationTimestamp}</Text></Tooltip></MetadataListItem>
          <MetadataListItem label="Uptime"><Tooltip content={pod.runningSince ? `Oldest currently running container started: ${formatFullTimestamp(pod.runningSince)}` : 'No running container start time available'}><Text type="body">{formatAge(pod.runningSince)}</Text></Tooltip></MetadataListItem>
          <MetadataListItem label="Ready containers">{pod.containerCount !== undefined ? `${pod.readyContainers ?? 0} / ${pod.containerCount}` : '—'}</MetadataListItem>
          <MetadataListItem label="CPU usage">{pod.cpuUsage}</MetadataListItem>
          <MetadataListItem label="RAM usage">{pod.memoryUsage}</MetadataListItem>
          <MetadataListItem label="CPU req / limit">{pod.cpuRequest || '—'} / {pod.cpuLimit || '—'}</MetadataListItem>
          <MetadataListItem label="RAM req / limit">{pod.memoryRequest || '—'} / {pod.memoryLimit || '—'}</MetadataListItem>
          <MetadataListItem label="Restarts">{pod.restarts ?? '—'}</MetadataListItem>
          <MetadataListItem label="QoS">{pod.qosClass || '—'}</MetadataListItem>
          <MetadataListItem label="Pod IP">{pod.podIP || '—'}</MetadataListItem>
          <MetadataListItem label="Owner"><Text type="body" style={{ overflowWrap: 'anywhere' }}>{pod.owner ? `${pod.owner.kind} / ${pod.owner.name}` : '—'}</Text></MetadataListItem>
          <MetadataListItem label="Service account"><Text type="body" style={{ overflowWrap: 'anywhere' }}>{pod.serviceAccountName || '—'}</Text></MetadataListItem>
          <MetadataListItem label="Node"><Text type="body" style={{ overflowWrap: 'anywhere' }}>{pod.nodeName && pod.nodeName !== 'unknown' ? pod.nodeName : 'Unscheduled'}</Text></MetadataListItem>
        </MetadataList>
      </VStack> : null
    }>
      <VStack className="kp-pod-tile" role="img" tabIndex={0}
        data-search-match={searchMatch}
        aria-label={`${pod.namespace}/${pod.name}: ${pod.status}${searchMatch ? ', search match' : ''}`}
        width="100%" height="var(--spacing-10)" hAlign="center" vAlign="center" style={statusStyles[color]}>
        <Icon icon={statusGlyph[color]} size="sm" />
      </VStack>
    </HoverCard>
  );
});

function PodTiles({ pods, query }: { pods: Pod[]; query: string }) {
  const { visible } = useMemo(() => selectMapPods(pods, query, MAX_PODS), [pods, query]);
  const remaining = pods.length - visible.length;
  return (
    <Grid columns={{ minWidth: 40 }} gap={1} align="start">
      {visible.map((pod) => <PodTile key={`${pod.namespace}/${pod.name}`} pod={pod} searchMatch={query ? matchesPodName(pod, query) : undefined} />)}
      {remaining > 0 && (
        <Tooltip content={`${remaining} additional ${query ? 'nonmatching ' : ''}pods in this group`}>
          <VStack height="var(--spacing-10)" hAlign="center" vAlign="center">
            <Text type="supporting">+{remaining}</Text>
          </VStack>
        </Tooltip>
      )}
    </Grid>
  );
}

function NodeCaption({ node, name }: { node?: Node; name: string }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  return (
    <HoverCard hasHoverIndication={false} focusTrigger="always" onOpenChange={setPreviewOpen} content={previewOpen ?
      <VStack gap={3} maxWidth="calc(var(--spacing-10) * 8)">
        <Text type="label" style={{ overflowWrap: 'anywhere' }}>{name}</Text>
        {node ? <>
          <CapacityChip node={node} />
          <MetadataList>
            <MetadataListItem label="Instance">{node.instanceType || 'Unknown'}</MetadataListItem>
            <MetadataListItem label="Group">{node.nodeGroup || 'default'}</MetadataListItem>
            <MetadataListItem label="CPU">{node.metricsAvailable ? `${node.usage.cpu} / ${node.capacity.cpu} cores` : 'n/a'}</MetadataListItem>
            <MetadataListItem label="RAM">{node.metricsAvailable ? `${node.usage.memory} / ${node.capacity.memory}` : 'n/a'}</MetadataListItem>
          </MetadataList>
        </> : <Text type="supporting">Node details unavailable</Text>}
      </VStack> : null
    }>
      <HStack gap={1} vAlign="center" tabIndex={0} aria-label={`Node ${name}`} style={{ minWidth: 0 }}>
        <Icon icon={Server} size="xsm" color="secondary" />
        <Text type="supporting" size="2xs" maxLines={1} hasTruncateTooltip={false}>{name}</Text>
      </HStack>
    </HoverCard>
  );
}

const PodGroup = memo(function PodGroup({ pods, node, name, query }: { pods: Pod[]; node?: Node; name: string; query: string }) {
  const matchCount = query ? pods.filter(pod => matchesPodName(pod, query)).length : 0;
  return (
    <VStack gap={2} paddingBlock={3} style={{ minWidth: 0 }}>
      <Text type="label">{pods.length} {pods.length === 1 ? 'pod' : 'pods'}{query ? ` · ${matchCount} ${matchCount === 1 ? 'match' : 'matches'}` : ''}</Text>
      <PodTiles pods={pods} query={query} />
      <NodeCaption node={node} name={name} />
    </VStack>
  );
});

export default function ComputeMapView({ cluster, nodes }: { cluster: Cluster; nodes: Node[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);
  const query = searchQuery.trim().toLowerCase();
  const podsQ = useFetch<Pod[]>(`/api/clusters/${encodeURIComponent(cluster.name)}/pods`);
  const podCount = podsQ.data?.length ?? 0;
  const matchCount = useMemo(() => query ? (podsQ.data || []).filter(pod => matchesPodName(pod, query)).length : 0, [podsQ.data, query]);
  const { groups, unscheduled, counts, emptyNodeCount } = useMemo(() => {
    const byNode = new Map<string, Pod[]>();
    const unscheduled: Pod[] = [];
    const counts: Record<StatusColor, number> = { green: 0, yellow: 0, red: 0, gray: 0 };
    for (const pod of podsQ.data || []) {
      counts[statusColor(pod.status)]++;
      if (!pod.nodeName || pod.nodeName === 'unknown') { unscheduled.push(pod); continue; }
      const members = byNode.get(pod.nodeName) || [];
      members.push(pod);
      byNode.set(pod.nodeName, members);
    }
    const nodeByName = new Map(nodes.map((node) => [node.name, node]));
    // Pods lead the map: occupied nodes only, busiest first. Keep pods whose
    // node is missing from the nodes response instead of silently dropping them.
    const groups = Array.from(byNode, ([name, pods]) => ({ name, pods, node: nodeByName.get(name) }))
      .sort((a, b) => b.pods.length - a.pods.length || a.name.localeCompare(b.name));
    return { groups, unscheduled, counts, emptyNodeCount: nodes.filter((node) => !byNode.has(node.name)).length };
  }, [podsQ.data, nodes]);

  return (
    <PanelState loading={podsQ.loading} error={podsQ.error} onRetry={podsQ.refetch}
      empty={!podsQ.data?.length && !podsQ.loading && !podsQ.error} emptyMessage="No pods in this cluster">
      <VStack gap={4} isScrollable style={{ flex: 1, minHeight: 0 }} paddingBlock={2}>
        <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
          <HStack gap={2} vAlign="center">
            <Text type="label" size="lg">{podCount} {podCount === 1 ? 'pod' : 'pods'}</Text>
            <Text type="supporting">· {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}</Text>
          </HStack>
          <HStack gap={3} vAlign="center" wrap="wrap">
            {statusLegend.map(({ color, label, variant }) => (
              <HStack key={color} gap={1} vAlign="center">
                <StatusDot variant={variant} label={label} />
                <Text type="supporting" size="2xs">{counts[color]} {label}</Text>
              </HStack>
            ))}
          </HStack>
        </HStack>
        <TextInput label="Search pod names" isLabelHidden size="sm" placeholder="Search pod names..." startIcon="search" hasClear
          ref={searchRef} value={searchQuery} onChange={setSearchQuery} />
        {query && <Text type="supporting" role="status" aria-live="polite">{matchCount ? `${matchCount} matching ${matchCount === 1 ? 'pod' : 'pods'} highlighted across all nodes.` : `No pods match “${searchQuery.trim()}”.`}</Text>}
        <Text type="supporting" size="2xs">Each tile is a pod. Hover or focus for details.</Text>
        {unscheduled.length > 0 && (
          <VStack gap={2} maxWidth="calc(var(--spacing-10) * 8)">
            <Text type="label">{unscheduled.length} unscheduled {unscheduled.length === 1 ? 'pod' : 'pods'}</Text>
            <PodTiles pods={unscheduled} query={query} />
          </VStack>
        )}
        <Grid columns={{ minWidth: 280 }} columnGap={6} rowGap={3} align="start">
          {groups.map((group) => <PodGroup key={group.name} {...group} query={query} />)}
        </Grid>
        {emptyNodeCount > 0 && <Text type="supporting" size="2xs">{emptyNodeCount} {emptyNodeCount === 1 ? 'node has' : 'nodes have'} no pods</Text>}
      </VStack>
    </PanelState>
  );
}
