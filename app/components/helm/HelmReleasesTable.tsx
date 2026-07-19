'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, TextField, InputAdornment, TableSortLabel, Box,
  FormControl, Select, MenuItem, InputLabel,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { HelmReleaseSummary, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from '../shared/PanelState';
import ScopePicker from '../shared/ScopePicker';
import StatusChip from '../shared/StatusChip';
import HelmReleaseDrawer from './HelmReleaseDrawer';

type Order = 'asc' | 'desc';
type SortKey = 'name' | 'namespace' | 'chart' | 'appVersion' | 'revision' | 'status' | 'updated';

interface HelmReleasesTableProps {
  cluster: Cluster;
  namespace: string | null;
  namespaces: string[];
  namespacesLoading: boolean;
  namespacesError: string | null;
  onNamespaceChange: (ns: string) => void;
  onRetryNamespaces: () => void;
  onAuthError: () => void;
}

export default function HelmReleasesTable({
  cluster, namespace, namespaces, namespacesLoading, namespacesError,
  onNamespaceChange, onRetryNamespaces, onAuthError,
}: HelmReleasesTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<SortKey>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<HelmReleaseSummary | null>(null);

  const { data, loading, error, authError, refetch } = useFetch<HelmReleaseSummary[]>(
    namespace
      ? `/api/clusters/${encodeURIComponent(cluster.name)}/helm?namespace=${encodeURIComponent(namespace)}`
      : null
  );
  const releases = useMemo(() => data || [], [data]);

  useEffect(() => {
    if (authError) onAuthError();
  }, [authError, onAuthError]);

  const handleSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Gate on namespace: nothing loads until one is picked.
  if (!namespace) {
    return (
      <ScopePicker
        resourceLabel="Helm releases"
        namespaces={namespaces}
        loading={namespacesLoading}
        error={namespacesError}
        onRetry={onRetryNamespaces}
        onSelectNamespace={onNamespaceChange}
      />
    );
  }

  const filtered = releases.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.namespace.toLowerCase().includes(q) || r.chart.toLowerCase().includes(q);
  });

  const cmp = (a: number | string, b: number | string) =>
    order === 'desc' ? (b < a ? -1 : b > a ? 1 : 0) : a < b ? -1 : a > b ? 1 : 0;

  const sorted = [...filtered].sort((a, b) => {
    switch (orderBy) {
      case 'revision':
        return cmp(a.revision, b.revision);
      case 'updated':
        return cmp(a.updated || '', b.updated || '');
      default:
        return cmp(String(a[orderBy]).toLowerCase(), String(b[orderBy]).toLowerCase());
    }
  });

  const cellSx = { py: 0.5, px: 1, fontSize: '0.75rem' };
  const headSx = { backgroundColor: 'action.hover', py: 0.75, px: 1, fontSize: '0.75rem', fontWeight: 600 };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search releases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 180, '& .MuiInputBase-root': { height: 32 } }}
          InputProps={{
            startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>),
            style: { fontSize: '0.8rem' },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150, '& .MuiInputBase-root': { height: 32, fontSize: '0.8rem' } }}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>Namespace</InputLabel>
          <Select value={namespace} label="Namespace" onChange={(e) => onNamespaceChange(e.target.value)}>
            {namespaces.map((ns) => (
              <MenuItem key={ns} value={ns} sx={{ fontSize: '0.8rem' }}>{ns}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <PanelState loading={loading} error={error} empty={!loading && !error && releases.length === 0} emptyMessage={`No Helm releases in namespace "${namespace}"`} onRetry={refetch}>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 250px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {([['name', 'Release'], ['namespace', 'Namespace'], ['chart', 'Chart'], ['appVersion', 'App Version'], ['revision', 'Rev'], ['status', 'Status'], ['updated', 'Updated']] as [SortKey, string][]).map(([id, label]) => (
                  <TableCell key={id} sx={headSx} sortDirection={orderBy === id ? order : false}>
                    <TableSortLabel active={orderBy === id} direction={orderBy === id ? order : 'asc'} onClick={() => handleSort(id)}>
                      {label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={`${r.namespace}-${r.name}`} hover onClick={() => setSelected(r)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ ...cellSx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name}</TableCell>
                  <TableCell sx={cellSx}><Chip label={r.namespace} size="small" sx={{ height: 20, fontSize: '0.65rem' }} /></TableCell>
                  <TableCell sx={cellSx}>{r.chart}{r.chartVersion ? `-${r.chartVersion}` : ''}</TableCell>
                  <TableCell sx={cellSx}>{r.appVersion || '—'}</TableCell>
                  <TableCell sx={cellSx}>{r.revision}</TableCell>
                  <TableCell sx={cellSx}><StatusChip status={r.status} /></TableCell>
                  <TableCell sx={cellSx} title={formatFullTimestamp(r.updated)}>{formatAge(r.updated)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </PanelState>

      <HelmReleaseDrawer cluster={cluster} release={selected} open={!!selected} onClose={() => setSelected(null)} />
    </>
  );
}
