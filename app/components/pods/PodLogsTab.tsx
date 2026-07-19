'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Button, IconButton, Select, MenuItem, FormControl, CircularProgress,
  Typography, Tooltip, Fab, FormControlLabel, Switch,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ViewSidebar as ViewSidebarIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import {
  type ParsedLine, parseLine, formatTimestamp, levelColor,
  discoverKeys, renderLineContent, computeDefaultKeys,
} from '../../lib/log-parsing';
import { Pod, Cluster } from '../../types/kubernetes';
import LogFieldsSidebar from '../logs/LogFieldsSidebar';

const TAIL_OPTIONS = ['100', '500', '1000', '2000'] as const;

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
        {containers && containers.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={container} onChange={(e) => setContainer(e.target.value)} sx={{ height: 30, fontSize: '0.75rem' }}>
              {containers.map((c) => (
                <MenuItem key={c} value={c} sx={{ fontSize: '0.75rem' }}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select value={tailLines} onChange={(e) => setTailLines(e.target.value)} sx={{ height: 30, fontSize: '0.75rem' }}>
            {TAIL_OPTIONS.map((n) => (
              <MenuItem key={n} value={n} sx={{ fontSize: '0.75rem' }}>{n} lines</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant={smartMode ? 'contained' : 'outlined'}
          size="small"
          startIcon={<ViewSidebarIcon sx={{ fontSize: '1rem' }} />}
          onClick={() => setSmartMode(!smartMode)}
          sx={{ height: 30, fontSize: '0.72rem', textTransform: 'none' }}
        >
          Fields
        </Button>
        <FormControlLabel
          control={<Switch size="small" checked={previous} onChange={(e) => setPrevious(e.target.checked)} />}
          label={<Typography variant="caption">Previous</Typography>}
          sx={{ ml: 0 }}
        />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Refresh" arrow>
          <IconButton size="small" onClick={fetchLogs} disabled={loading}>
            {loading ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
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

        <Box sx={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 1, color: 'text.secondary' }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Loading logs…</Typography>
            </Box>
          ) : error ? (
            <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'error.main', px: 2, textAlign: 'center' }}>
              <Typography variant="body2">{error}</Typography>
            </Box>
          ) : lines.length === 0 ? (
            <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">No logs available</Typography>
            </Box>
          ) : (
            <>
              <Box
                ref={scrollRef}
                onScroll={handleScroll}
                sx={{
                  height: '100%',
                  overflow: 'auto',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '0.7rem',
                  bgcolor: (theme) => (theme.palette.mode === 'light' ? 'grey.50' : '#161616'),
                }}
              >
                {lines.map((line, i) => {
                  const color = levelColor(line.level);
                  return (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        px: 1,
                        py: '1px',
                        borderLeft: '3px solid',
                        borderLeftColor: color ?? 'transparent',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      {line.timestamp && (
                        <Box component="span" sx={{ flexShrink: 0, color: 'text.secondary', userSelect: 'all' }}>
                          {formatTimestamp(line.timestamp)}
                        </Box>
                      )}
                      <Box component="span" sx={{ minWidth: 0, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                        {renderLineContent(line, smartMode, selectedKeys)}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
              {showScrollBtn && (
                <Fab
                  size="small"
                  color="default"
                  onClick={scrollToBottom}
                  sx={{ position: 'absolute', bottom: 12, right: 16, boxShadow: 3 }}
                >
                  <ArrowDownIcon />
                </Fab>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
