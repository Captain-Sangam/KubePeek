'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Selector } from '@astryxdesign/core/Selector';
import { Switch } from '@astryxdesign/core/Switch';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { TextInput } from '@astryxdesign/core/TextInput';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { Spinner } from '@astryxdesign/core/Spinner';
import { RefreshCw, PanelRight } from 'lucide-react';
import {
  type ParsedLine, parseLine, formatTimestamp, levelColor,
  discoverKeys, renderLineContent, computeDefaultKeys,
} from '../../lib/log-parsing';
import { Pod, Cluster } from '../../types/kubernetes';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import LogFieldsSidebar from '../logs/LogFieldsSidebar';

const TAIL_OPTIONS = ['100', '500', '1000', '2000'] as const;

// levelColor() returns MUI palette names (shared lib); map them to astryx tokens.
const LEVEL_COLORS: Record<string, string> = {
  'error.main': 'var(--color-error)',
  'warning.main': 'var(--color-warning)',
  'success.main': 'var(--color-success)',
  'grey.500': 'var(--color-track)',
};

interface PodLogsTabProps {
  cluster: Cluster;
  pod: Pod;
  containers?: string[];
}

export default function PodLogsTab({ cluster, pod, containers }: PodLogsTabProps) {
  const [container, setContainer] = useState('');
  const [tailLines, setTailLines] = useState('500');
  const [previous, setPrevious] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<ParsedLine[]>([]);

  const [smartMode, setSmartMode] = useState(false);
  const [discoveredKeys, setDiscoveredKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [keySearch, setKeySearch] = useState('');

  const [logSearch, setLogSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Default the container selection once the container list arrives.
  useEffect(() => {
    if (containers && containers.length > 0 && !container) {
      setContainer(containers[0]);
    }
  }, [containers, container]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ tail: tailLines, timestamps: 'true' });
      if (container) params.set('container', container);
      if (previous) params.set('previous', 'true');
      const res = await fetch(
        `/api/clusters/${encodeURIComponent(cluster.name)}/pods/${encodeURIComponent(pod.namespace)}/${encodeURIComponent(pod.name)}/logs?${params}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to fetch logs');
      }
      const data = await res.json();
      const logStr: string = typeof data === 'string' ? data : (data.logs ?? '');
      const parsed = logStr.split('\n').filter((l: string) => l.length > 0).map(parseLine);
      setLines(parsed);
      const keys = discoverKeys(parsed);
      setDiscoveredKeys(keys);
      setSelectedKeys((prev) => (prev.size === 0 ? computeDefaultKeys(keys) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [cluster.name, pod.namespace, pod.name, container, tailLines, previous]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [loading, lines]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleLines = logSearch
    ? lines.filter((l) => l.raw.toLowerCase().includes(logSearch.toLowerCase()))
    : lines;

  const filteredKeys = keySearch
    ? discoveredKeys.filter((k) => k.toLowerCase().includes(keySearch.toLowerCase()))
    : discoveredKeys;

  const selectAllVisible = () =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      filteredKeys.forEach((k) => next.add(k));
      return next;
    });
  const clearAllVisible = () =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      filteredKeys.forEach((k) => next.delete(k));
      return next;
    });

  const centered = (content: React.ReactNode) => (
    <HStack gap={1} hAlign="center" vAlign="center" paddingInline={4} style={{ height: '100%' }}>
      {content}
    </HStack>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Toolbar */}
      <HStack gap={1} vAlign="center" wrap="wrap" padding={2} style={{ borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        {containers && containers.length > 1 && (
          <Selector
            label="Container"
            isLabelHidden
            size="sm"
            options={containers}
            value={container}
            onChange={(value) => value && setContainer(value)}
          />
        )}
        <Selector
          label="Tail lines"
          isLabelHidden
          size="sm"
          options={TAIL_OPTIONS.map((n) => ({ value: n, label: `${n} lines` }))}
          value={tailLines}
          onChange={(value) => value && setTailLines(value)}
        />
        <ToggleButton
          label="Fields"
          size="sm"
          icon={<Icon icon={PanelRight} size="sm" />}
          isPressed={smartMode}
          onPressedChange={(pressed) => setSmartMode(pressed)}
        >
          Fields
        </ToggleButton>
        <Switch label="Previous" value={previous} onChange={(checked) => setPrevious(checked)} />
        <StackItem size="fill" style={{ minWidth: 160 }}>
          <TextInput
            label="Search logs"
            isLabelHidden
            size="sm"
            placeholder="Search logs..."
            startIcon="search"
            ref={searchRef}
            value={logSearch}
            onChange={(value) => setLogSearch(value)}
          />
        </StackItem>
        <IconButton
          label="Refresh"
          tooltip="Refresh"
          variant="ghost"
          size="sm"
          onClick={fetchLogs}
          isDisabled={loading}
          icon={loading ? <Spinner size="sm" /> : <Icon icon={RefreshCw} size="sm" />}
        />
      </HStack>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {smartMode && discoveredKeys.length > 0 && (
          <LogFieldsSidebar
            discoveredKeys={discoveredKeys}
            selectedKeys={selectedKeys}
            keySearch={keySearch}
            onKeySearchChange={setKeySearch}
            onToggle={toggleKey}
            onSelectAll={selectAllVisible}
            onClearAll={clearAllVisible}
            filteredKeys={filteredKeys}
          />
        )}

        <div style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0 }}>
          {loading ? (
            centered(
              <>
                <Spinner size="md" />
                <Text type="supporting">Loading logs…</Text>
              </>
            )
          ) : error ? (
            centered(
              <Text type="body" size="sm" justify="center" style={{ color: 'var(--color-error)' }}>
                {error}
              </Text>
            )
          ) : visibleLines.length === 0 ? (
            centered(
              <Text type="supporting">
                {lines.length === 0 ? 'No logs available' : 'No lines match your search'}
              </Text>
            )
          ) : (
            <>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                style={{
                  height: '100%',
                  overflow: 'auto',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '0.7rem',
                  background: 'var(--color-background-muted)',
                }}
              >
                {visibleLines.map((line, i) => {
                  const color = levelColor(line.level);
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 'var(--spacing-3)',
                        padding: '1px var(--spacing-2)',
                        borderLeft: `3px solid ${(color && LEVEL_COLORS[color]) || 'transparent'}`,
                      }}
                    >
                      {line.timestamp && (
                        <span style={{ flexShrink: 0, color: 'var(--color-text-secondary)', userSelect: 'all' }}>
                          {formatTimestamp(line.timestamp)}
                        </span>
                      )}
                      <span style={{ minWidth: 0, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                        {renderLineContent(line, smartMode, selectedKeys)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {showScrollBtn && (
                <div style={{ position: 'absolute', bottom: 12, right: 16 }}>
                  <IconButton
                    label="Scroll to bottom"
                    tooltip="Scroll to bottom"
                    onClick={scrollToBottom}
                    icon={<Icon icon="arrowDown" />}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
