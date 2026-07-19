'use client';

import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, TextField, InputAdornment, TableSortLabel, Box, Tooltip,
  FormControl, Select, MenuItem, InputLabel,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { Pod, Cluster } from '../types/kubernetes';
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
  nodeFilter: string;
  nodeGroupFilter: string;
  onNodeFilterChange: (value: string) => void;
  onNodeGroupFilterChange: (value: string) => void;
}

export default function PodsTable({
  pods,
  cluster,
  nodeFilter,
  nodeGroupFilter,
  onNodeFilterChange,
  onNodeGroupFilterChange,
}: PodsTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<SortKey>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all');
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);

  const namespaces = useMemo(() => {
    const unique = new Set(pods.map((p) => p.namespace));
    return ['all', ...Array.from(unique).sort()];
  }, [pods]);

  const nodeGroups = useMemo(() => {
    const unique = new Set(pods.map((p) => p.nodeGroup).filter(Boolean) as string[]);
    return ['all', ...Array.from(unique).sort()];
  }, [pods]);

  // Node options, narrowed by the selected node group.
  const nodeOptions = useMemo(() => {
    const relevant = nodeGroupFilter
      ? pods.filter((p) => p.nodeGroup === nodeGroupFilter)
      : pods;
    const unique = new Set(relevant.map((p) => p.nodeName).filter(Boolean));
    return ['all', ...Array.from(unique).sort()];
  }, [pods, nodeGroupFilter]);

  const handleRequestSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const filteredPods = pods.filter((pod) => {
    if (namespaceFilter !== 'all' && pod.namespace !== namespaceFilter) return false;
    if (nodeGroupFilter && pod.nodeGroup !== nodeGroupFilter) return false;
    if (nodeFilter && pod.nodeName !== nodeFilter) return false;

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
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
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
        <FormControl size="small" sx={{ minWidth: 150, ...selectSx }}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>Namespace</InputLabel>
          <Select
            value={namespaceFilter}
            label="Namespace"
            onChange={(e) => setNamespaceFilter(e.target.value)}
          >
            {namespaces.map((ns) => (
              <MenuItem key={ns} value={ns} sx={{ fontSize: '0.8rem' }}>
                {ns === 'all' ? 'All Namespaces' : ns}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150, ...selectSx }}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>Node Group</InputLabel>
          <Select
            value={nodeGroupFilter || 'all'}
            label="Node Group"
            onChange={(e) => {
              const v = e.target.value === 'all' ? '' : e.target.value;
              onNodeGroupFilterChange(v);
              // Clear an incompatible node selection.
              onNodeFilterChange('');
            }}
          >
            {nodeGroups.map((ng) => (
              <MenuItem key={ng} value={ng} sx={{ fontSize: '0.8rem' }}>
                {ng === 'all' ? 'All Node Groups' : ng}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150, ...selectSx }}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>Node</InputLabel>
          <Select
            value={nodeFilter || 'all'}
            label="Node"
            onChange={(e) => onNodeFilterChange(e.target.value === 'all' ? '' : e.target.value)}
          >
            {nodeOptions.map((n) => (
              <MenuItem key={n} value={n} sx={{ fontSize: '0.8rem' }}>
                {n === 'all' ? 'All Nodes' : n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
                  {namespaceFilter !== 'all' && ` in namespace "${namespaceFilter}"`}
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
      />
    </>
  );
}
