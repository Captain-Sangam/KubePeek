'use client';

import { Token } from '@astryxdesign/core/Token';

type TokenColor = 'green' | 'yellow' | 'red' | 'gray';

// Map a status/phase/type string to a token color. Covers pod phases,
// container states, event types, and helm release statuses.
const colorFor = (value: string): TokenColor => {
  const v = value.toLowerCase();
  if (['running', 'ready', 'deployed', 'active', 'succeeded', 'normal', 'true'].includes(v)) {
    return 'green';
  }
  if (['pending', 'containercreating', 'waiting', 'pending-install', 'pending-upgrade', 'pending-rollback', 'uninstalling', 'terminating', 'warning'].includes(v)) {
    return 'yellow';
  }
  if (['failed', 'error', 'crashloopbackoff', 'imagepullbackoff', 'errimagepull', 'evicted', 'oomkilled'].includes(v)) {
    return 'red';
  }
  return 'gray';
};

interface StatusChipProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusChip({ status, size = 'sm' }: StatusChipProps) {
  return <Token label={status} size={size} color={colorFor(status)} />;
}
