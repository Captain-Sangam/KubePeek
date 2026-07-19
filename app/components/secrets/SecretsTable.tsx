'use client';

import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, TextField, InputAdornment, TableSortLabel, Box,
  FormControl, Select, MenuItem, InputLabel,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { SecretSummary, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from '../shared/PanelState';
import SecretDetailDialog from './SecretDetailDialog';

type Order = 'asc' | 'desc';
type SortKey = 'name' | 'namespace' | 'type' | 'keyCount' | 'createdAt';

export default function SecretsTable({ cluster }: { cluster: Cluster }) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<SortKey>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState('all');
  const [selected, setSelected] = useState<SecretSummary | null>(null);

  const { data, loading, error, refetch } = useFetch<SecretSummary[]>(
    `/api/clusters/${encodeURIComponent(cluster.name)}/secrets`
  );
  const secrets = useMemo(() => data || [], [data]);

  const namespaces = useMemo(() => {
    const unique = new Set(secrets.map((s) => s.namespace));
    return ['all', ...Array.from(unique).sort()];
  }, [secrets]);

  const handleSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const filtered = secrets.filter((s) => {
    if (namespaceFilter !== 'all' && s.namespace !== namespaceFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.namespace.toLowerCase().includes(q) || s.type.toLowerCase().includes(q);
  });

  const cmp = (a: number | string, b: number | string) =>
    order === 'desc' ? (b < a ? -1 : b > a ? 1 : 0) : a < b ? -1 : a > b ? 1 : 0;

  const sorted = [...filtered].sort((a, b) => {
    switch (orderBy) {
      case 'keyCount':
        return cmp(a.keyCount, b.keyCount);
      case 'createdAt':
        return cmp(a.createdAt || '', b.createdAt || '');
      default:
        return cmp(String(a[orderBy]).toLowerCase(), String(b[orderBy]).toLowerCase());
    }
  });

  const cellSx = { py: 0.5, px: 1, fontSize: '0.75rem' };
  const headSx = { backgroundColor: 'action.hover', py: 0.75, px: 1, fontSize: '0.75rem', fontWeight: 600 };

  return (
    <PanelState loading={loading} error={error} empty={!loading && secrets.length === 0} emptyMessage="No secrets found" onRetry={refetch}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search secrets..."
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
          <Select value={namespaceFilter} label="Namespace" onChange={(e) => setNamespaceFilter(e.target.value)}>
            {namespaces.map((ns) => (
              <MenuItem key={ns} value={ns} sx={{ fontSize: '0.8rem' }}>{ns === 'all' ? 'All Namespaces' : ns}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 250px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {([['name', 'Name'], ['namespace', 'Namespace'], ['type', 'Type'], ['keyCount', 'Keys'], ['createdAt', 'Age']] as [SortKey, string][]).map(([id, label]) => (
                <TableCell key={id} sx={headSx} sortDirection={orderBy === id ? order : false}>
                  <TableSortLabel active={orderBy === id} direction={orderBy === id ? order : 'asc'} onClick={() => handleSort(id)}>
                    {label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((s) => (
              <TableRow key={`${s.namespace}-${s.name}`} hover onClick={() => setSelected(s)} sx={{ cursor: 'pointer' }}>
                <TableCell sx={{ ...cellSx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.name}>{s.name}</TableCell>
                <TableCell sx={cellSx}><Chip label={s.namespace} size="small" sx={{ height: 20, fontSize: '0.65rem' }} /></TableCell>
                <TableCell sx={{ ...cellSx, fontFamily: 'monospace', fontSize: '0.7rem' }}>{s.type}</TableCell>
                <TableCell sx={cellSx}>{s.keyCount}</TableCell>
                <TableCell sx={cellSx} title={formatFullTimestamp(s.createdAt)}>{formatAge(s.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <SecretDetailDialog
        cluster={cluster}
        secret={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </PanelState>
  );
}
