'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, TextField, InputAdornment, TableSortLabel, Box,
  FormControl, Select, MenuItem, InputLabel, FormControlLabel, Checkbox, Typography,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { SecretSummary, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from '../shared/PanelState';
import ScopePicker from '../shared/ScopePicker';
import SecretDetailDialog from './SecretDetailDialog';

type Order = 'asc' | 'desc';
type SortKey = 'name' | 'namespace' | 'type' | 'keyCount' | 'createdAt';

interface SecretsTableProps {
  cluster: Cluster;
  namespace: string | null;
  namespaces: string[];
  namespacesLoading: boolean;
  namespacesError: string | null;
  onNamespaceChange: (ns: string) => void;
  onRetryNamespaces: () => void;
  onAuthError: () => void;
}

export default function SecretsTable({
  cluster, namespace, namespaces, namespacesLoading, namespacesError,
  onNamespaceChange, onRetryNamespaces, onAuthError,
}: SecretsTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<SortKey>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTls, setShowTls] = useState(false);
  const [selected, setSelected] = useState<SecretSummary | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const { data, loading, error, authError, refetch } = useFetch<SecretSummary[]>(
    namespace
      ? `/api/clusters/${encodeURIComponent(cluster.name)}/secrets?namespace=${encodeURIComponent(namespace)}`
      : null
  );
  const secrets = useMemo(() => data || [], [data]);

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
        resourceLabel="secrets"
        namespaces={namespaces}
        loading={namespacesLoading}
        error={namespacesError}
        onRetry={onRetryNamespaces}
        onSelectNamespace={onNamespaceChange}
      />
    );
  }

  const filtered = secrets.filter((s) => {
    if (!showTls && s.type === 'kubernetes.io/tls') return false;
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
    <>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search secrets..."
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
        <FormControlLabel
          control={<Checkbox size="small" checked={showTls} onChange={(e) => setShowTls(e.target.checked)} />}
          label={<Typography variant="caption">Show TLS</Typography>}
          sx={{ ml: 0, mr: 0 }}
        />
      </Box>

      <PanelState loading={loading} error={error} empty={!loading && !error && secrets.length === 0} emptyMessage={`No secrets in namespace "${namespace}"`} onRetry={refetch}>
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
      </PanelState>

      <SecretDetailDialog
        cluster={cluster}
        secret={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onDeleted={() => {
          setSelected(null);
          refetch();
        }}
      />
    </>
  );
}
