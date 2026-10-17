'use client';

// Column configs for the namespace-scoped list views. Each export is a
// NamespacedResourceTable whose `resource` is a key in the
// app/api/clusters/[cluster]/resources/[resource] LISTERS map; ClusterDetails
// registers them in NS_TABLES. Plain number/string/null columns sort with the
// Table's default comparator; only non-scalar keys need a custom one.

import { proportional, pixel, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import type {
  DeploymentSummary,
  StatefulSetSummary,
  DaemonSetSummary,
  JobSummary,
  CronJobSummary,
  HpaSummary,
  PdbSummary,
  IngressSummary,
} from '../../types/kubernetes';
import { formatAge, formatDuration, formatFullTimestamp } from '../../lib/format';
import NamespacedResourceTable, { type NsTableProps } from '../shared/NamespacedResourceTable';
import StatusChip from '../shared/StatusChip';

type Columns<T> = TableColumn<T & Record<string, unknown>>[];

const WARN = { color: 'var(--color-warning)' };
const code = (value: string) => <Text type="code" size="2xs">{value || '—'}</Text>;
const ago = (iso: string) => <span title={iso ? formatFullTimestamp(iso) : undefined}>{formatAge(iso)}</span>;

// Deployments and StatefulSets report the same replica counts.
const REPLICA_COLUMNS: Columns<DeploymentSummary> = [
  {
    key: 'readyCount', header: 'Ready', width: proportional(1), sortable: true,
    renderCell: (d) => <span style={d.readyCount < d.desired ? WARN : undefined}>{d.ready}</span>,
  },
  { key: 'upToDate', header: 'Up-to-date', width: proportional(1), sortable: true },
  { key: 'available', header: 'Available', width: proportional(1), sortable: true },
];

export const DeploymentsTable = (p: NsTableProps) => (
  <NamespacedResourceTable<DeploymentSummary> {...p} resource="deployments" label="deployments" columns={REPLICA_COLUMNS} />
);

export const StatefulSetsTable = (p: NsTableProps) => (
  <NamespacedResourceTable<StatefulSetSummary> {...p} resource="statefulsets" label="stateful sets" columns={REPLICA_COLUMNS} />
);

const DAEMONSET_COLUMNS: Columns<DaemonSetSummary> = [
  { key: 'desired', header: 'Desired', width: pixel(80), sortable: true },
  { key: 'current', header: 'Current', width: pixel(80), sortable: true },
  {
    key: 'ready', header: 'Ready', width: pixel(80), sortable: true,
    renderCell: (d) => <span style={d.ready < d.desired ? WARN : undefined}>{d.ready}</span>,
  },
  { key: 'upToDate', header: 'Up-to-date', width: pixel(100), sortable: true },
  { key: 'available', header: 'Available', width: pixel(90), sortable: true },
  {
    key: 'nodeSelector', header: 'Node selector', width: proportional(1.5), sortable: true,
    renderCell: (d) => <span title={d.nodeSelector}>{code(d.nodeSelector)}</span>,
  },
];

export const DaemonSetsTable = (p: NsTableProps) => (
  <NamespacedResourceTable<DaemonSetSummary>
    {...p} resource="daemonsets" label="daemon sets" columns={DAEMONSET_COLUMNS}
    searchText={(d) => `${d.name} ${d.nodeSelector}`}
  />
);

const JOB_COLUMNS: Columns<JobSummary> = [
  { key: 'status', header: 'Status', width: pixel(110), sortable: true, renderCell: (j) => <StatusChip status={j.status} /> },
  { key: 'completions', header: 'Completions', width: pixel(110), sortable: true },
  { key: 'durationMs', header: 'Duration', width: pixel(90), sortable: true, renderCell: (j) => formatDuration(j.durationMs) },
  { key: 'owner', header: 'CronJob', width: proportional(1.5), sortable: true, renderCell: (j) => j.owner || '—' },
];

export const JobsTable = (p: NsTableProps) => (
  <NamespacedResourceTable<JobSummary>
    {...p} resource="jobs" label="jobs" columns={JOB_COLUMNS}
    searchText={(j) => `${j.name} ${j.status} ${j.owner}`}
  />
);

const CRONJOB_COLUMNS: Columns<CronJobSummary> = [
  {
    key: 'schedule', header: 'Schedule', width: proportional(1.5), sortable: true,
    renderCell: (c) => code(c.timeZone ? `${c.schedule} (${c.timeZone})` : c.schedule),
  },
  {
    key: 'suspend', header: 'Suspended', width: pixel(100), sortable: true,
    renderCell: (c) => (c.suspend ? <StatusChip status="Suspended" /> : '—'),
  },
  { key: 'active', header: 'Active', width: pixel(70), sortable: true },
  { key: 'lastScheduleTime', header: 'Last schedule', width: pixel(110), sortable: true, renderCell: (c) => ago(c.lastScheduleTime) },
  { key: 'lastSuccessfulTime', header: 'Last success', width: pixel(110), sortable: true, renderCell: (c) => ago(c.lastSuccessfulTime) },
];

export const CronJobsTable = (p: NsTableProps) => (
  <NamespacedResourceTable<CronJobSummary>
    {...p} resource="cronjobs" label="cron jobs" columns={CRONJOB_COLUMNS}
    searchText={(c) => `${c.name} ${c.schedule}`}
  />
);

const HPA_COLUMNS: Columns<HpaSummary> = [
  { key: 'reference', header: 'Reference', width: proportional(1.5), sortable: true, renderCell: (h) => code(h.reference) },
  { key: 'minReplicas', header: 'Min', width: pixel(60), sortable: true },
  { key: 'maxReplicas', header: 'Max', width: pixel(60), sortable: true },
  { key: 'currentReplicas', header: 'Replicas', width: pixel(80), sortable: true },
  { key: 'targets', header: 'Targets', width: proportional(1), renderCell: (h) => code(h.targets) },
];

export const HpaTable = (p: NsTableProps) => (
  <NamespacedResourceTable<HpaSummary>
    {...p} resource="hpa" label="autoscalers" columns={HPA_COLUMNS}
    searchText={(h) => `${h.name} ${h.reference}`}
  />
);

const PDB_COLUMNS: Columns<PdbSummary> = [
  { key: 'minAvailable', header: 'Min available', width: pixel(110), sortable: true, renderCell: (p) => p.minAvailable || '—' },
  { key: 'maxUnavailable', header: 'Max unavailable', width: pixel(120), sortable: true, renderCell: (p) => p.maxUnavailable || '—' },
  {
    key: 'allowedDisruptions', header: 'Allowed disruptions', width: pixel(150), sortable: true,
    // 0 with pods present blocks voluntary evictions, e.g. node drains.
    renderCell: (p) => <span style={p.allowedDisruptions === 0 && p.expectedPods > 0 ? WARN : undefined}>{p.allowedDisruptions}</span>,
  },
  { key: 'currentHealthy', header: 'Healthy', width: pixel(90), sortable: true, renderCell: (p) => `${p.currentHealthy}/${p.desiredHealthy}` },
  {
    key: 'selector', header: 'Selector', width: proportional(2), sortable: true,
    renderCell: (p) => <span title={p.selector}>{code(p.selector)}</span>,
  },
];

export const PdbsTable = (p: NsTableProps) => (
  <NamespacedResourceTable<PdbSummary>
    {...p} resource="pdbs" label="disruption budgets" columns={PDB_COLUMNS}
    searchText={(d) => `${d.name} ${d.selector}`}
  />
);

const INGRESS_COLUMNS: Columns<IngressSummary> = [
  { key: 'className', header: 'Class', width: proportional(1), sortable: true, renderCell: (i) => code(i.className) },
  {
    key: 'hosts', header: 'Hosts', width: proportional(2), sortable: true,
    renderCell: (i) => <span title={i.hosts.join(', ')}>{i.hosts.join(', ') || '—'}</span>,
  },
  {
    key: 'address', header: 'Address', width: proportional(1.5), sortable: true,
    renderCell: (i) => <span title={i.address}>{i.address || '—'}</span>,
  },
];

export const IngressesTable = (p: NsTableProps) => (
  <NamespacedResourceTable<IngressSummary>
    {...p} resource="ingresses" label="ingresses" columns={INGRESS_COLUMNS}
    searchText={(i) => [i.name, i.className, i.address, ...i.hosts].join(' ')}
    // Arrays don't sort with the default comparator.
    comparators={{ hosts: (a, b) => a.hosts.join(',').toLowerCase().localeCompare(b.hosts.join(',').toLowerCase()) }}
  />
);
