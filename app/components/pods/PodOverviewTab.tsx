'use client';

import { Box, Typography, Chip, Divider } from '@mui/material';
import { PodDetail, ContainerDetail } from '../../types/kubernetes';
import { basisLabel, formatAge, formatFullTimestamp } from '../../lib/format';
import UsageBar from '../shared/UsageBar';
import StatusChip from '../shared/StatusChip';
import CopyButton from '../shared/CopyButton';

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 0.5, fontWeight: 600 }}>
    {children}
  </Typography>
);

const KeyValue = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Box sx={{ display: 'flex', gap: 1, py: 0.25 }}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontSize: '0.78rem' }}>
      {label}
    </Typography>
    <Typography variant="body2" component="div" sx={{ fontSize: '0.78rem', wordBreak: 'break-word' }}>
      {value ?? '—'}
    </Typography>
  </Box>
);

function ContainerCard({ c }: { c: ContainerDetail }) {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name}</Typography>
          {c.isInit && <Chip label="init" size="small" sx={{ height: 18, fontSize: '0.6rem' }} />}
          <StatusChip status={c.state.reason || c.state.type} />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {c.restartCount} restart{c.restartCount === 1 ? '' : 's'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.image}>
          {c.image}
        </Typography>
        <CopyButton value={c.image} title="Copy image" />
      </Box>

      {c.state.type === 'terminated' && c.state.exitCode != null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Exit code {c.state.exitCode}{c.state.reason ? ` (${c.state.reason})` : ''}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 3, mt: 1, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Requests</Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            CPU {c.requests.cpu || '—'} · Mem {c.requests.memory || '—'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Limits</Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            CPU {c.limits.cpu || '—'} · Mem {c.limits.memory || '—'}
          </Typography>
        </Box>
        {c.usage && (
          <Box>
            <Typography variant="caption" color="text.secondary">Live usage</Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              CPU {c.usage.cpu} · Mem {c.usage.memory}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function PodOverviewTab({ detail }: { detail: PodDetail }) {
  const cpuDenom =
    detail.cpuBasis === 'limit' ? 'limit' : detail.cpuBasis === 'request' ? 'request' : 'node allocatable';
  const memDenom =
    detail.memoryBasis === 'limit' ? 'limit' : detail.memoryBasis === 'request' ? 'request' : 'node allocatable';

  return (
    <Box>
      <SectionHeading>Status</SectionHeading>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <StatusChip status={detail.phase} />
        {detail.qosClass && <Chip label={`QoS: ${detail.qosClass}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />}
        {detail.conditions.map((cond) => (
          <Chip
            key={cond.type}
            label={cond.type}
            size="small"
            color={cond.status === 'True' ? 'success' : 'default'}
            variant="outlined"
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        ))}
      </Box>
      <KeyValue label="Node" value={detail.nodeName || '—'} />
      <KeyValue label="Node group" value={detail.nodeGroup || '—'} />
      <KeyValue label="Pod IP" value={detail.podIP} />
      <KeyValue label="Created" value={`${formatFullTimestamp(detail.createdAt)} (${formatAge(detail.createdAt)})`} />
      <KeyValue label="Restart policy" value={detail.restartPolicy} />
      <KeyValue label="Service account" value={detail.serviceAccountName} />

      <SectionHeading>Metrics</SectionHeading>
      <Box sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">CPU</Typography>
        <UsageBar
          percent={detail.cpuPercent}
          caption={`${detail.cpuUsage} of ${cpuDenom}`}
          fallbackText={`${detail.cpuUsage} (no ${basisLabel('limit')}/request set)`}
          height={8}
        />
      </Box>
      <Box sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">Memory</Typography>
        <UsageBar
          percent={detail.memoryPercent}
          caption={`${detail.memoryUsage} of ${memDenom}`}
          fallbackText={`${detail.memoryUsage} (no limit/request set)`}
          height={8}
        />
      </Box>

      <SectionHeading>Containers</SectionHeading>
      {detail.initContainers.map((c) => <ContainerCard key={`init-${c.name}`} c={c} />)}
      {detail.containers.map((c) => <ContainerCard key={c.name} c={c} />)}

      <SectionHeading>Metadata</SectionHeading>
      <Typography variant="caption" color="text.secondary">Labels</Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1, mt: 0.5 }}>
        {Object.entries(detail.labels).length > 0 ? (
          Object.entries(detail.labels).map(([k, v]) => (
            <Chip key={k} label={`${k}=${v}`} size="small" sx={{ height: 20, fontSize: '0.6rem' }} />
          ))
        ) : (
          <Typography variant="caption" color="text.secondary">None</Typography>
        )}
      </Box>

      {detail.ownerReferences.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">Owner references</Typography>
          <Box sx={{ mt: 0.5 }}>
            {detail.ownerReferences.map((o) => (
              <Typography key={`${o.kind}-${o.name}`} variant="caption" sx={{ display: 'block' }}>
                {o.kind}/{o.name}
              </Typography>
            ))}
          </Box>
        </>
      )}

      {detail.volumes.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">Volumes</Typography>
          <Box sx={{ mt: 0.5 }}>
            {detail.volumes.map((v) => (
              <Typography key={v.name} variant="caption" sx={{ display: 'block' }}>
                {v.name} <Box component="span" sx={{ color: 'text.secondary' }}>({v.type})</Box>
              </Typography>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
