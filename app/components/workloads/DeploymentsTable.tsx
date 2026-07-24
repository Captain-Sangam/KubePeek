'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, InputAdornment, TableSortLabel, Box,
  FormControl, Select, MenuItem, InputLabel,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { DeploymentSummary, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import PanelState from '../shared/PanelState';
import ScopePicker from '../shared/ScopePicker';

type Order = 'asc' | 'desc';
type SortKey = 'name' | 'readyCount' | 'upToDate' | 'available' | 'createdAt';

interface DeploymentsTableProps {
  cluster: Cluster;
  namespace: string | null;
  namespaces: string[];
  namespacesLoading: boolean;
  namespacesError: string | null;
  onNamespaceChange: (ns: string) => void;
  onRetryNamespaces: () => void;
  onAuthError: () => void;
}

export default function DeploymentsTable({
  cluster, namespace, namespaces, namespacesLoading, namespacesError,
  onNamespaceChange, onRetryNamespaces, onAuthError,
}: DeploymentsTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<SortKey>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const { data, loading, error, authError, refetch } = useFetch<DeploymentSummary[]>(
    namespace
      ? `/api/clusters/${encodeURIComponent(cluster.name)}/deployments?namespace=${encodeURIComponent(namespace)}`
      : null
  );
  const deployments = useMemo(() => data || [], [data]);

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
        resourceLabel="deployments"
        namespaces={namespaces}
        loading={namespacesLoading}
        error={namespacesError}
        onRetry={onRetryNamespaces}
        onSelectNamespace={onNamespaceChange}
      />
    );
  }

  const filtered = deployments.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.namespace.toLowerCase().includes(q);
  });

  const cmp = (a: number | string, b: number | string) =>
    order === 'desc' ? (b < a ? -1 : b > a ? 1 : 0) : a < b ? -1 : a > b ? 1 : 0;

  const sorted = [...filtered].sort((a, b) => {
    switch (orderBy) {
      case 'readyCount':
        return cmp(a.readyCount, b.readyCount);
      case 'upToDate':
        return cmp(a.upToDate, b.upToDate);
      case 'available':
        return cmp(a.available, b.available);
      case 'createdAt':
        return cmp(a.createdAt || '', b.createdAt || '');
      default:
        return cmp(a.name.toLowerCase(), b.name.toLowerCase());
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
          placeholder="Search deployments..."
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

      <PanelState loading={loading} error={error} empty={!loading && !error && deployments.length === 0} emptyMessage={`No deployments in namespace "${namespace}"`} onRetry={refetch}>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 250px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {([['name', 'Name'], ['readyCount', 'Ready'], ['upToDate', 'Up-to-date'], ['available', 'Available'], ['createdAt', 'Age']] as [SortKey, string][]).map(([id, label]) => (
                  <TableCell key={id} sx={headSx} sortDirection={orderBy === id ? order : false}>
                    <TableSortLabel active={orderBy === id} direction={orderBy === id ? order : 'asc'} onClick={() => handleSort(id)}>
                      {label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((d) => (
                <TableRow key={`${d.namespace}-${d.name}`} hover>
                  <TableCell sx={{ ...cellSx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.name}>{d.name}</TableCell>
                  <TableCell sx={{ ...cellSx, color: d.readyCount < d.desired ? 'warning.main' : undefined }}>{d.ready}</TableCell>
                  <TableCell sx={cellSx}>{d.upToDate}</TableCell>
                  <TableCell sx={cellSx}>{d.available}</TableCell>
                  <TableCell sx={cellSx} title={formatFullTimestamp(d.createdAt)}>{formatAge(d.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </PanelState>
    </>
  );
}
