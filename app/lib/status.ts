export type StatusColor = 'green' | 'yellow' | 'red' | 'gray';

export function statusColor(value: string): StatusColor {
  const v = value.toLowerCase();
  if (['running', 'ready', 'deployed', 'active', 'succeeded', 'normal', 'true'].includes(v)) return 'green';
  if (['pending', 'containercreating', 'waiting', 'pending-install', 'pending-upgrade', 'pending-rollback', 'uninstalling', 'terminating', 'warning'].includes(v)) return 'yellow';
  if (['failed', 'error', 'crashloopbackoff', 'imagepullbackoff', 'errimagepull', 'evicted', 'oomkilled'].includes(v)) return 'red';
  return 'gray';
}
