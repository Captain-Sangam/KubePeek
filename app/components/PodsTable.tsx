'use client';

import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, TextField, InputAdornment, TableSortLabel, Box, Tooltip,
  FormControl, Select, MenuItem, InputLabel, Button,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { Pod, Cluster, PodsScope } from '../types/kubernetes';
import { parseNumericValue, basisLabel } from '../lib/format';
import UsageBar from './shared/UsageBar';
import StatusChip from './shared/StatusChip';
import PodDetailDrawer from './pods/PodDetailDrawer';

type Order = 'asc' | 'desc';
type SortKey = 'name' | 'namespace' | 'status' | 'restarts' | 'cpuUsage' | 'memoryUsage' | 'nodeName' | 'creationTimestamp';

interface HeadCell {
  id: SortKey;
  label: string;
  align?: 'left' | 'right';
  width: string;
}

const headCells: HeadCell[] = [
  { id: 'name', label: 'Name', width: '24%' },
  { id: 'namespace', label: 'Namespace', width: '12%' },
  { id: 'status', label: 'Status', width: '10%' },
  { id: 'restarts', label: 'Restarts', align: 'right', width: '8%' },
  { id: 'cpuUsage', label: 'CPU', width: '14%' },
  { id: 'memoryUsage', label: 'Memory', width: '14%' },
  { id: 'nodeName', label: 'Node', width: '12%' },
  { id: 'creationTimestamp', label: 'Age', width: '6%' },
];

interface PodsTableProps {
  pods: Pod[];
  cluster: Cluster;
  scope: PodsScope;
  onScopeChange: (scope: PodsScope | null) => void;
  namespaces: string[];
  nodeNames: string[];
  onPodDeleted?: () => void;
}

export default function PodsTable({
  pods,
  cluster,
  scope,
  onScopeChange,
  namespaces,
  nodeNames,
  onPodDeleted,
}: PodsTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<SortKey>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);

  const handleRequestSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Server already scoped the pods; only search filters client-side.
  const filteredPods = pods.filter((pod) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      pod.name.toLowerCase().includes(q) ||
      pod.namespace.toLowerCase().includes(q) ||
      pod.status.toLowerCase().includes(q) ||
      (pod.helmChart && pod.helmChart.toLowerCase().includes(q)) ||
      pod.nodeName.toLowerCase().includes(q)
    );
  });

  const cmp = (a: number | string, b: number | string) =>
    order === 'desc' ? (b < a ? -1 : b > a ? 1 : 0) : a < b ? -1 : a > b ? 1 : 0;

  const sortedPods = [...filteredPods].sort((a, b) => {
    switch (orderBy) {
      case 'restarts':
        return cmp(a.restarts || 0, b.restarts || 0);
      case 'cpuUsage':
        return cmp(parseNumericValue(a.cpuUsage), parseNumericValue(b.cpuUsage));
      case 'memoryUsage':
        return cmp(parseNumericValue(a.memoryUsage), parseNumericValue(b.memoryUsage));
      case 'creationTimestamp':
        return cmp(a.createdAt || '', b.createdAt || '');
      default:
        return cmp(
          String(a[orderBy] ?? '').toLowerCase(),
          String(b[orderBy] ?? '').toLowerCase()
        );
    }
  });

  const cpuTooltip = (pod: Pod): string => {
    const denom = pod.cpuBasis === 'limit' ? pod.cpuLimit : pod.cpuBasis === 'request' ? pod.cpuRequest : undefined;
    if (pod.cpuPercent == null) return `CPU ${pod.cpuUsage}`;
    return `${pod.cpuUsage} of ${denom || 'node allocatable'} ${basisLabel(pod.cpuBasis)} (${pod.cpuPercent}%)`;
  };
  const memTooltip = (pod: Pod): string => {
    const denom = pod.memoryBasis === 'limit' ? pod.memoryLimit : pod.memoryBasis === 'request' ? pod.memoryRequest : undefined;
    if (pod.memoryPercent == null) return `Memory ${pod.memoryUsage}`;
    return `${pod.memoryUsage} of ${denom || 'node allocatable'} ${basisLabel(pod.memoryBasis)} (${pod.memoryPercent}%)`;
  };

  const selectSx = {
    '& .MuiInputBase-root': { height: '32px', fontSize: '0.8rem' },
  };
  const cellSx = { py: 0.5, px: 1, fontSize: '0.75rem' };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search pods..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 180, '& .MuiInputBase-root': { height: '32px' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            style: { fontSize: '0.8rem' },
          }}
        />
        {/* Scope control: a dropdown to change the value within the current
            scope type (namespace/node), plus a chip label. Deleting returns to
            the picker to pick a different scope type. */}
        {scope.type === 'nodeGroup' ? (
          <Chip
            label={`Node group: ${scope.value}`}
            onDelete={() => onScopeChange(null)}
            size="small"
            color="primary"
            variant="outlined"
          />
        ) : (
          <>
            <FormControl size="small" sx={{ minWidth: 200, ...selectSx }}>
              <InputLabel sx={{ fontSize: '0.8rem' }}>
                {scope.type === 'namespace' ? 'Namespace' : 'Node'}
              </InputLabel>
              <Select
                value={scope.value}
                label={scope.type === 'namespace' ? 'Namespace' : 'Node'}
                onChange={(e) => onScopeChange({ type: scope.type, value: e.target.value })}
              >
                {(scope.type === 'namespace' ? namespaces : nodeNames).map((v) => (
                  <MenuItem key={v} value={v} sx={{ fontSize: '0.8rem' }}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Change scope" arrow>
              <Button size="small" onClick={() => onScopeChange(null)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                Change
              </Button>
            </Tooltip>
          </>
        )}
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 250px)' }}>
        <Table stickyHeader size="small" aria-label="pods table" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {headCells.map((headCell) => (
                <TableCell
                  align={headCell.align || 'left'}
                  key={headCell.id}
                  sortDirection={orderBy === headCell.id ? order : false}
                  sx={{
                    backgroundColor: 'action.hover',
                    py: 0.75, px: 1, fontSize: '0.75rem', fontWeight: 600,
                    width: headCell.width, maxWidth: headCell.width,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === headCell.id}
                    direction={orderBy === headCell.id ? order : 'asc'}
                    onClick={() => handleRequestSort(headCell.id)}
                  >
                    {headCell.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPods.map((pod) => (
              <TableRow
                key={`${pod.namespace}-${pod.name}`}
                hover
                onClick={() => setSelectedPod(pod)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell sx={{ ...cellSx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pod.name}>
                  {pod.name}
                </TableCell>
                <TableCell sx={cellSx}>
                  <Chip label={pod.namespace} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                </TableCell>
                <TableCell sx={cellSx}>
                  <StatusChip status={pod.status} />
                </TableCell>
                <TableCell align="right" sx={cellSx}>
                  <Tooltip title="Restarts across containers" arrow>
                    <Box
                      component="span"
                      sx={{
                        fontWeight: (pod.restarts || 0) > 0 ? 600 : 400,
                        color:
                          (pod.restarts || 0) > 10 ? 'error.main' : (pod.restarts || 0) > 0 ? 'warning.main' : 'text.primary',
                      }}
                    >
                      {pod.restarts ?? 0}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell sx={cellSx}>
                  <UsageBar
                    percent={pod.cpuPercent}
                    caption={pod.cpuUsage}
                    tooltip={cpuTooltip(pod)}
                    fallbackText={pod.cpuUsage}
                    height={4}
                  />
                </TableCell>
                <TableCell sx={cellSx}>
                  <UsageBar
                    percent={pod.memoryPercent}
                    caption={pod.memoryUsage}
                    tooltip={memTooltip(pod)}
                    fallbackText={pod.memoryUsage}
                    height={4}
                  />
                </TableCell>
                <TableCell sx={{ ...cellSx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pod.nodeName}>
                  {pod.nodeName}
                </TableCell>
                <TableCell sx={cellSx}>{pod.creationTimestamp}</TableCell>
              </TableRow>
            ))}
            {sortedPods.length === 0 && (
              <TableRow>
                <TableCell colSpan={headCells.length} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                  No pods found
                  {searchQuery && ` matching "${searchQuery}"`}
                  {scope.type === 'namespace' && ` in namespace "${scope.value}"`}
                  {scope.type === 'node' && ` on node "${scope.value}"`}
                  {scope.type === 'nodeGroup' && ` in node group "${scope.value}"`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <PodDetailDrawer
        pod={selectedPod}
        cluster={cluster}
        open={!!selectedPod}
        onClose={() => setSelectedPod(null)}
        onDeleted={() => {
          setSelectedPod(null);
          onPodDeleted?.();
        }}
      />
    </>
  );
}
