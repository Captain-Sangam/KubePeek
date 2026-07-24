'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, InputAdornment, TableSortLabel, Box,
  FormControl, Select, MenuItem, InputLabel,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { HpaSummary, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from '../shared/PanelState';
import ScopePicker from '../shared/ScopePicker';

type Order = 'asc' | 'desc';
type SortKey = 'name' | 'reference' | 'minReplicas' | 'maxReplicas' | 'currentReplicas' | 'createdAt';

interface HpaTableProps {
  cluster: Cluster;
  namespace: string | null;
  namespaces: string[];
  namespacesLoading: boolean;
  namespacesError: string | null;
  onNamespaceChange: (ns: string) => void;
  onRetryNamespaces: () => void;
  onAuthError: () => void;
}

export default function HpaTable({
  cluster, namespace, namespaces, namespacesLoading, namespacesError,
  onNamespaceChange, onRetryNamespaces, onAuthError,
}: HpaTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<SortKey>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const { data, loading, error, authError, refetch } = useFetch<HpaSummary[]>(
    namespace
      ? `/api/clusters/${encodeURIComponent(cluster.name)}/hpa?namespace=${encodeURIComponent(namespace)}`
      : null
  );
  const hpas = useMemo(() => data || [], [data]);

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
        resourceLabel="autoscalers"
        namespaces={namespaces}
        loading={namespacesLoading}
        error={namespacesError}
        onRetry={onRetryNamespaces}
        onSelectNamespace={onNamespaceChange}
      />
    );
  }

  const filtered = hpas.filter((h) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return h.name.toLowerCase().includes(q) || h.reference.toLowerCase().includes(q);
  });

  const cmp = (a: number | string, b: number | string) =>
    order === 'desc' ? (b < a ? -1 : b > a ? 1 : 0) : a < b ? -1 : a > b ? 1 : 0;

  const sorted = [...filtered].sort((a, b) => {
    switch (orderBy) {
      case 'minReplicas':
      case 'maxReplicas':
      case 'currentReplicas':
        return cmp(a[orderBy], b[orderBy]);
      case 'createdAt':
        return cmp(a.createdAt || '', b.createdAt || '');
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
          placeholder="Search autoscalers..."
          inputRef={searchRef}
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

      <PanelState loading={loading} error={error} empty={!loading && !error && hpas.length === 0} emptyMessage={`No autoscalers in namespace "${namespace}"`} onRetry={refetch}>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 250px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {([['name', 'Name'], ['reference', 'Reference'], ['minReplicas', 'Min'], ['maxReplicas', 'Max'], ['currentReplicas', 'Replicas'], ['createdAt', 'Age']] as [SortKey, string][]).map(([id, label]) => (
                  <TableCell key={id} sx={headSx} sortDirection={orderBy === id ? order : false}>
                    <TableSortLabel active={orderBy === id} direction={orderBy === id ? order : 'asc'} onClick={() => handleSort(id)}>
                      {label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell sx={headSx}>Targets</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((h) => (
                <TableRow key={`${h.namespace}-${h.name}`} hover>
                  <TableCell sx={{ ...cellSx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.name}>{h.name}</TableCell>
                  <TableCell sx={{ ...cellSx, fontFamily: 'monospace', fontSize: '0.7rem' }}>{h.reference}</TableCell>
                  <TableCell sx={cellSx}>{h.minReplicas}</TableCell>
                  <TableCell sx={cellSx}>{h.maxReplicas}</TableCell>
                  <TableCell sx={cellSx}>{h.currentReplicas}</TableCell>
                  <TableCell sx={cellSx} title={formatFullTimestamp(h.createdAt)}>{formatAge(h.createdAt)}</TableCell>
                  <TableCell sx={{ ...cellSx, fontFamily: 'monospace', fontSize: '0.7rem' }}>{h.targets || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </PanelState>
    </>
  );
}
