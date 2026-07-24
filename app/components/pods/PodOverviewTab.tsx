'use client';

import { HStack, VStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { Divider } from '@astryxdesign/core/Divider';
import { PodDetail, ContainerDetail } from '../../types/kubernetes';
import { basisLabel, formatAge, formatFullTimestamp } from '../../lib/format';
import UsageBar from '../shared/UsageBar';
import StatusChip from '../shared/StatusChip';
import CopyButton from '../shared/CopyButton';

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <Text
    type="label"
    size="2xs"
    color="secondary"
    weight="semibold"
    as="p"
    style={{ textTransform: 'uppercase', letterSpacing: '0.5px', margin: 'var(--spacing-4) 0 var(--spacing-1)' }}
  >
    {children}
  </Text>
);

const KeyValue = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <HStack gap={2} paddingBlock={0.5}>
    <Text type="supporting" size="2xs" as="div" style={{ minWidth: 130, flexShrink: 0 }}>
      {label}
    </Text>
    <Text type="body" size="2xs" as="div" style={{ wordBreak: 'break-word' }}>
      {value ?? '—'}
    </Text>
  </HStack>
);

function ContainerCard({ c }: { c: ContainerDetail }) {
  return (
    <VStack
      gap={1}
      padding={3}
      style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-element)', marginBottom: 'var(--spacing-2)' }}
    >
      <HStack gap={1} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <HStack gap={1} vAlign="center">
            <Text type="body" size="2xs" weight="semibold">{c.name}</Text>
            {c.isInit && <Token label="init" size="sm" />}
            <StatusChip status={c.state.reason || c.state.type} />
          </HStack>
        </StackItem>
        <Text type="supporting" size="2xs">
          {c.restartCount} restart{c.restartCount === 1 ? '' : 's'}
        </Text>
      </HStack>

      <HStack gap={0.5} vAlign="center">
        <StackItem size="fill">
          <Text type="code" size="2xs" maxLines={1}>{c.image}</Text>
        </StackItem>
        <CopyButton value={c.image} title="Copy image" />
      </HStack>

      {c.state.type === 'terminated' && c.state.exitCode != null && (
        <Text type="supporting" size="2xs" as="p">
          Exit code {c.state.exitCode}{c.state.reason ? ` (${c.state.reason})` : ''}
        </Text>
      )}

      <HStack gap={4} wrap="wrap">
        <VStack>
          <Text type="supporting" size="2xs" as="p">Requests</Text>
          <Text type="body" size="2xs" as="p">
            CPU {c.requests.cpu || '—'} · Mem {c.requests.memory || '—'}
          </Text>
        </VStack>
        <VStack>
          <Text type="supporting" size="2xs" as="p">Limits</Text>
          <Text type="body" size="2xs" as="p">
            CPU {c.limits.cpu || '—'} · Mem {c.limits.memory || '—'}
          </Text>
        </VStack>
        {c.usage && (
          <VStack>
            <Text type="supporting" size="2xs" as="p">Live usage</Text>
            <Text type="body" size="2xs" as="p">
              CPU {c.usage.cpu} · Mem {c.usage.memory}
            </Text>
          </VStack>
        )}
      </HStack>
    </VStack>
  );
}

export default function PodOverviewTab({ detail }: { detail: PodDetail }) {
  const cpuDenom =
    detail.cpuBasis === 'limit' ? 'limit' : detail.cpuBasis === 'request' ? 'request' : 'node allocatable';
  const memDenom =
    detail.memoryBasis === 'limit' ? 'limit' : detail.memoryBasis === 'request' ? 'request' : 'node allocatable';

  return (
    <div>
      <SectionHeading>Status</SectionHeading>
      <HStack gap={1} wrap="wrap" style={{ marginBottom: 'var(--spacing-2)' }}>
        <StatusChip status={detail.phase} />
        {detail.qosClass && <Token label={`QoS: ${detail.qosClass}`} size="sm" />}
        {detail.conditions.map((cond) => (
          <Token key={cond.type} label={cond.type} size="sm" color={cond.status === 'True' ? 'green' : 'gray'} />
        ))}
      </HStack>
      <KeyValue label="Node" value={detail.nodeName || '—'} />
      <KeyValue label="Node group" value={detail.nodeGroup || '—'} />
      <KeyValue label="Pod IP" value={detail.podIP} />
      <KeyValue label="Created" value={`${formatFullTimestamp(detail.createdAt)} (${formatAge(detail.createdAt)})`} />
      <KeyValue label="Restart policy" value={detail.restartPolicy} />
      <KeyValue label="Service account" value={detail.serviceAccountName} />

      <SectionHeading>Metrics</SectionHeading>
      <VStack gap={0.5} style={{ marginBottom: 'var(--spacing-2)' }}>
        <Text type="supporting" size="2xs" as="p">CPU</Text>
        <UsageBar
          percent={detail.cpuPercent}
          caption={`${detail.cpuUsage} of ${cpuDenom}`}
          fallbackText={`${detail.cpuUsage} (no ${basisLabel('limit')}/request set)`}
        />
      </VStack>
      <VStack gap={0.5} style={{ marginBottom: 'var(--spacing-2)' }}>
        <Text type="supporting" size="2xs" as="p">Memory</Text>
        <UsageBar
          percent={detail.memoryPercent}
          caption={`${detail.memoryUsage} of ${memDenom}`}
          fallbackText={`${detail.memoryUsage} (no limit/request set)`}
        />
      </VStack>

      <SectionHeading>Containers</SectionHeading>
      {detail.initContainers.map((c) => <ContainerCard key={`init-${c.name}`} c={c} />)}
      {detail.containers.map((c) => <ContainerCard key={c.name} c={c} />)}

      <SectionHeading>Metadata</SectionHeading>
      <Text type="supporting" size="2xs" as="p">Labels</Text>
      <HStack gap={0.5} wrap="wrap" paddingBlock={1}>
        {Object.entries(detail.labels).length > 0 ? (
          Object.entries(detail.labels).map(([k, v]) => (
            <Token key={k} label={`${k}=${v}`} size="sm" />
          ))
        ) : (
          <Text type="supporting" size="2xs">None</Text>
        )}
      </HStack>

      {detail.ownerReferences.length > 0 && (
        <>
          <Divider style={{ margin: 'var(--spacing-2) 0' }} />
          <Text type="supporting" size="2xs" as="p">Owner references</Text>
          <VStack paddingBlock={0.5}>
            {detail.ownerReferences.map((o) => (
              <Text key={`${o.kind}-${o.name}`} type="body" size="2xs" as="p">
                {o.kind}/{o.name}
              </Text>
            ))}
          </VStack>
        </>
      )}

      {detail.volumes.length > 0 && (
        <>
          <Divider style={{ margin: 'var(--spacing-2) 0' }} />
          <Text type="supporting" size="2xs" as="p">Volumes</Text>
          <VStack paddingBlock={0.5}>
            {detail.volumes.map((v) => (
              <Text key={v.name} type="body" size="2xs" as="p">
                {v.name} <Text type="inherit" color="secondary">({v.type})</Text>
              </Text>
            ))}
          </VStack>
        </>
      )}
    </div>
  );
}
