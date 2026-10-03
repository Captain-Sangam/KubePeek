'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { Spinner } from '@astryxdesign/core/Spinner';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/ThemeProvider';
import { VIEW_LABELS } from '../lib/views';
import type { ViewStatus } from '../lib/RefreshContext';
import type { Cluster, ActiveView } from '../types/kubernetes';

interface HeaderProps {
  cluster: Cluster | null;
  activeView: ActiveView | null;
  status: ViewStatus;
}

export default function Header({ cluster, activeView, status }: HeaderProps) {
  const { mode, toggleTheme } = useTheme();
  const [native, setNative] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { setNative(navigator.userAgent.includes('Electron/')); }, []);
  useEffect(() => {
    if (!status.lastUpdated) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status.lastUpdated]);
  const age = status.lastUpdated ? Math.max(0, Math.floor((now - status.lastUpdated) / 1000)) : null;
  const ageLabel = age === null ? 'Waiting for data' : age < 60 ? `Updated ${age}s ago` : `Updated ${Math.floor(age / 60)}m ago`;

  return (
    <HStack
      as="header" gap={3} vAlign="center" wrap="nowrap" paddingInline={4} paddingBlock={2}
      style={{
        WebkitAppRegion: 'drag', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
        paddingInlineStart: native ? 'calc(var(--spacing-10) * 3)' : undefined,
      } as CSSProperties}
    >
      <Text type="label" weight="semibold" textWrap="nowrap">KubePeek</Text>
      <StackItem size="fill" style={{ minWidth: 0 }}>
        <HStack gap={2} vAlign="center" wrap="nowrap" style={{ minWidth: 0 }}>
          <Text type="body" size="sm" maxLines={1}>{cluster?.displayName || cluster?.name || 'Select a cluster'}</Text>
          {activeView && <Text type="supporting" textWrap="nowrap">/ {VIEW_LABELS[activeView]}</Text>}
          {status.scope && <Text type="supporting" maxLines={1}>/ {status.scope}</Text>}
        </HStack>
      </StackItem>
      <Tooltip content={status.refreshError ? `Refresh failed: ${status.refreshError}. Showing the last successful data.` : ageLabel}>
        <HStack gap={1} vAlign="center" wrap="nowrap">
          {status.isRefreshing ? <Spinner size="sm" aria-label="Refreshing data" /> : <StatusDot variant={status.refreshError ? 'warning' : 'neutral'} label={status.refreshError ? 'Data is stale' : ageLabel} />}
          <Text type="supporting" size="2xs" textWrap="nowrap">{status.refreshError ? `Stale · ${ageLabel}` : ageLabel}</Text>
        </HStack>
      </Tooltip>
      <HStack style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
        <IconButton label="Toggle theme" tooltip={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
          variant="ghost" size="sm" onClick={toggleTheme}
          icon={<Icon icon={mode === 'light' ? Moon : Sun} size="sm" />} />
      </HStack>
    </HStack>
  );
}
