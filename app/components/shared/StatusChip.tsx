'use client';

import { Chip, ChipProps } from '@mui/material';

type MuiColor = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

// Map a status/phase/type string to a chip color. Covers pod phases,
// container states, event types, and helm release statuses.
const colorFor = (value: string): MuiColor => {
  const v = value.toLowerCase();
  if (['running', 'ready', 'deployed', 'active', 'succeeded', 'normal', 'true'].includes(v)) {
    return 'success';
  }
  if (['pending', 'containercreating', 'waiting', 'pending-install', 'pending-upgrade', 'pending-rollback', 'uninstalling', 'terminating', 'warning'].includes(v)) {
    return 'warning';
  }
  if (['failed', 'error', 'crashloopbackoff', 'imagepullbackoff', 'errimagepull', 'evicted', 'oomkilled'].includes(v)) {
    return 'error';
  }
  if (['completed', 'terminated', 'superseded', 'uninstalled'].includes(v)) {
    return 'default';
  }
  return 'default';
};

interface StatusChipProps extends Omit<ChipProps, 'color' | 'label'> {
  status: string;
}

export default function StatusChip({ status, size = 'small', ...rest }: StatusChipProps) {
  return (
    <Chip
      label={status}
      size={size}
      color={colorFor(status)}
      variant="outlined"
      sx={{ fontWeight: 500, fontSize: '0.7rem', height: 20, ...(rest.sx || {}) }}
      {...rest}
    />
  );
}
