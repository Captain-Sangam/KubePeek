'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Drawer, Box, Typography, Chip, IconButton, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, InputAdornment,
} from '@mui/material';
import { Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material';
import { HelmReleaseSummary, HelmReleaseDetail, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import TabPanel from '../shared/TabPanel';
import PanelState from '../shared/PanelState';
import StatusChip from '../shared/StatusChip';
import CopyButton from '../shared/CopyButton';

interface HelmReleaseDrawerProps {
  cluster: Cluster;
  release: HelmReleaseSummary | null;
  open: boolean;
  onClose: () => void;
}

// Render an object as indented YAML-ish text (no dependency).
function toYaml(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map((item) => `${pad}- ${toYaml(item, indent + 1).trimStart()}`).join('\n');
  }
  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) return '{}';
  return entries
    .map(([k, v]) => {
      if (v && typeof v === 'object' && Object.keys(v).length > 0) {
        return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
      }
      return `${pad}${k}: ${toYaml(v, indent + 1)}`;
    })
    .join('\n');
}

function CodeBlock({ text, copyText }: { text: string; copyText?: string }) {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}>
        <CopyButton value={copyText ?? text} title="Copy" />
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0, p: 1.5, borderRadius: 1, bgcolor: 'action.hover',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.72rem', overflow: 'auto', whiteSpace: 'pre',
        }}
      >
        {text || '(empty)'}
      </Box>
    </Box>
  );
}

export default function HelmReleaseDrawer({ cluster, release, open, onClose }: HelmReleaseDrawerProps) {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  useEffect(() => {
    if (open) {
      setTab(0);
      setSearch('');
    }
  }, [open, release?.name]);

  // Grep-style line filter for the Values/Manifest code blocks.
  const filterLines = (text: string) => {
    if (!search) return text;
    const q = search.toLowerCase();
    return text.split('\n').filter((l) => l.toLowerCase().includes(q)).join('\n') || '(no matching lines)';
  };

  const url = open && release
    ? `/api/clusters/${encodeURIComponent(cluster.name)}/helm/${encodeURIComponent(release.namespace)}/${encodeURIComponent(release.name)}`
    : null;
  const { data, loading, error, refetch } = useFetch<{ success: boolean; release: HelmReleaseDetail }>(url);
  const detail = data?.release;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', md: '70vw', lg: 960 }, display: 'flex', flexDirection: 'column' } }}
    >
      {release && (
        <>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>{release.name}</Typography>
              <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Chip label={release.namespace} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
              <StatusChip status={release.status} />
              <Chip label={`rev ${release.revision}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
              <Chip label={`${release.chart}-${release.chartVersion}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
            </Box>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontSize: '0.8rem' } }}>
              <Tab label="Values" disableRipple />
              <Tab label="Manifest" disableRipple />
              <Tab label="History" disableRipple />
            </Tabs>
          </Box>

          {(tab === 0 || tab === 1) && (
            <Box sx={{ px: 2, pt: 1.5, flexShrink: 0 }}>
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                placeholder="Search..."
                inputRef={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ '& .MuiInputBase-root': { height: 32 } }}
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>),
                  style: { fontSize: '0.8rem' },
                }}
              />
            </Box>
          )}

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2 }}>
            <PanelState loading={loading} error={error} onRetry={refetch}>
              {detail && (
                <>
                  <TabPanel value={tab} index={0}>
                    <CodeBlock text={filterLines(toYaml(detail.values))} copyText={toYaml(detail.values)} />
                  </TabPanel>
                  <TabPanel value={tab} index={1}>
                    <CodeBlock text={filterLines(detail.manifest)} copyText={detail.manifest} />
                  </TabPanel>
                  <TabPanel value={tab} index={2}>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Revision</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Updated</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Chart</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>App</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Description</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {detail.history.map((h) => (
                            <TableRow key={h.revision}>
                              <TableCell sx={{ fontSize: '0.72rem' }}>{h.revision}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem' }} title={formatFullTimestamp(h.updated)}>{formatAge(h.updated)}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem' }}><StatusChip status={h.status} /></TableCell>
                              <TableCell sx={{ fontSize: '0.72rem' }}>{h.chartVersion}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem' }}>{h.appVersion}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', whiteSpace: 'normal' }}>{h.description}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </TabPanel>
                </>
              )}
            </PanelState>
          </Box>
        </>
      )}
    </Drawer>
  );
}
