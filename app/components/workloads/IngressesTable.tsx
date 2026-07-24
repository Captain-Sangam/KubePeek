'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, InputAdornment, TableSortLabel, Box,
  FormControl, Select, MenuItem, InputLabel,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { IngressSummary, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from '../shared/PanelState';
import ScopePicker from '../shared/ScopePicker';

type Order = 'asc' | 'desc';
type SortKey = 'name' | 'className' | 'hosts' | 'address' | 'createdAt';

interface IngressesTableProps {
  cluster: Cluster;
  namespace: string | null;
  namespaces: string[];
  namespacesLoading: boolean;
  namespacesError: string | null;
  onNamespaceChange: (ns: string) => void;
  onRetryNamespaces: () => void;
  onAuthError: () => void;
}

export default function IngressesTable({
  cluster, namespace, namespaces, namespacesLoading, namespacesError,
  onNamespaceChange, onRetryNamespaces, onAuthError,
}: IngressesTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<SortKey>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const { data, loading, error, authError, refetch } = useFetch<IngressSummary[]>(
    namespace
      ? `/api/clusters/${encodeURIComponent(cluster.name)}/ingresses?namespace=${encodeURIComponent(namespace)}`
      : null
  );
  const ingresses = useMemo(() => data || [], [data]);

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
        resourceLabel="ingresses"
        namespaces={namespaces}
        loading={namespacesLoading}
        error={namespacesError}
        onRetry={onRetryNamespaces}
        onSelectNamespace={onNamespaceChange}
      />
    );
  }

  const filtered = ingresses.filter((ing) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ing.name.toLowerCase().includes(q) ||
      ing.className.toLowerCase().includes(q) ||
      ing.address.toLowerCase().includes(q) ||
      ing.hosts.some((h) => h.toLowerCase().includes(q))
    );
  });

  const cmp = (a: number | string, b: number | string) =>
    order === 'desc' ? (b < a ? -1 : b > a ? 1 : 0) : a < b ? -1 : a > b ? 1 : 0;

  const sorted = [...filtered].sort((a, b) => {
    switch (orderBy) {
      case 'hosts':
        return cmp(a.hosts.join(',').toLowerCase(), b.hosts.join(',').toLowerCase());
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
          placeholder="Search ingresses..."
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

      <PanelState loading={loading} error={error} empty={!loading && !error && ingresses.length === 0} emptyMessage={`No ingresses in namespace "${namespace}"`} onRetry={refetch}>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 250px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {([['name', 'Name'], ['className', 'Class'], ['hosts', 'Hosts'], ['address', 'Address'], ['createdAt', 'Age']] as [SortKey, string][]).map(([id, label]) => (
                  <TableCell key={id} sx={headSx} sortDirection={orderBy === id ? order : false}>
                    <TableSortLabel active={orderBy === id} direction={orderBy === id ? order : 'asc'} onClick={() => handleSort(id)}>
                      {label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((ing) => (
                <TableRow key={`${ing.namespace}-${ing.name}`} hover>
                  <TableCell sx={{ ...cellSx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ing.name}>{ing.name}</TableCell>
                  <TableCell sx={{ ...cellSx, fontFamily: 'monospace', fontSize: '0.7rem' }}>{ing.className || '—'}</TableCell>
                  <TableCell sx={{ ...cellSx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }} title={ing.hosts.join(', ')}>
                    {ing.hosts.join(', ') || '—'}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }} title={ing.address}>
                    {ing.address || '—'}
                  </TableCell>
                  <TableCell sx={cellSx} title={formatFullTimestamp(ing.createdAt)}>{formatAge(ing.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </PanelState>
    </>
  );
}
