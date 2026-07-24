'use client';

import { CSSProperties, ReactNode } from 'react';

interface TabPanelProps {
  children: ReactNode;
  value: number;
  index: number;
  // Keep the panel mounted (hidden) so it retains state across tab switches.
  keepMounted?: boolean;
  style?: CSSProperties;
}

export default function TabPanel({ children, value, index, keepMounted, style }: TabPanelProps) {
  const active = value === index;
  if (!active && !keepMounted) return null;

  return (
    <div role="tabpanel" hidden={!active} style={{ display: active ? 'block' : 'none', ...style }}>
      {children}
    </div>
  );
}
