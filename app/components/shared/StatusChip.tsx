'use client';

import { Token } from '@astryxdesign/core/Token';

import { statusColor } from '../../lib/status';

interface StatusChipProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusChip({ status, size = 'sm' }: StatusChipProps) {
  return <Token label={status} size={size} color={statusColor(status)} />;
}
