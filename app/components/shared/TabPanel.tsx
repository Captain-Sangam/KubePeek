'use client';

import { Box } from '@mui/material';
import { ReactNode } from 'react';

interface TabPanelProps {
  children: ReactNode;
  value: number;
  index: number;
  // Keep the panel mounted (hidden) so it retains state across tab switches.
  keepMounted?: boolean;
  sx?: object;
}

export default function TabPanel({ children, value, index, keepMounted, sx }: TabPanelProps) {
  const active = value === index;
  if (!active && !keepMounted) return null;

  return (
    <Box
      role="tabpanel"
      hidden={!active}
      sx={{ display: active ? 'block' : 'none', ...sx }}
    >
      {children}
    </Box>
  );
}
