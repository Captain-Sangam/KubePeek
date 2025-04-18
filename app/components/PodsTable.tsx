'use client';

import { useState, useMemo } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Chip, TextField, InputAdornment, TableSortLabel, Box, Tooltip,
  FormControl, Select, MenuItem, InputLabel, Grid
} from '@mui/material';
import { 
  Search as SearchIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { Pod } from '../types/kubernetes';

type Order = 'asc' | 'desc';

interface HeadCell {
  id: keyof Pod;
  label: string;
  sortable: boolean;
}

const headCells: HeadCell[] = [
  { id: 'name', label: 'Name', sortable: true },
  { id: 'namespace', label: 'Namespace', sortable: true },
  { id: 'status', label: 'Status', sortable: true },
  { id: 'helmChart', label: 'Helm Chart', sortable: true },
  { id: 'helmVersion', label: 'Version', sortable: true },
  { id: 'cpuUsage', label: 'CPU Usage', sortable: true },
  { id: 'memoryUsage', label: 'Memory Usage', sortable: true },
  { id: 'nodeName', label: 'Node', sortable: true },
  { id: 'creationTimestamp', label: 'Age', sortable: true },
];

interface PodsTableProps {
  pods: Pod[];
}

export default function PodsTable({ pods }: PodsTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof Pod>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all');

  // Extract unique namespaces for the filter dropdown
  const namespaces = useMemo(() => {
    const uniqueNamespaces = new Set(pods.map(pod => pod.namespace));
    return ['all', ...Array.from(uniqueNamespaces)].sort();
  }, [pods]);

  const handleRequestSort = (property: keyof Pod) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return <SuccessIcon fontSize="small" color="success" />;
      case 'pending':
        return <InfoIcon fontSize="small" color="info" />;
      case 'failed':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'terminating':
        return <WarningIcon fontSize="small" color="warning" />;
      default:
        return <InfoIcon fontSize="small" color="disabled" />;
    }
  };

  // Filter pods based on search query and namespace
  const filteredPods = pods.filter(pod => {
    // Filter by namespace first
    if (namespaceFilter !== 'all' && pod.namespace !== namespaceFilter) {
      return false;
    }
    
    // Then filter by search query
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      pod.name.toLowerCase().includes(query) ||
      pod.namespace.toLowerCase().includes(query) ||
      pod.status.toLowerCase().includes(query) ||
      (pod.helmChart && pod.helmChart.toLowerCase().includes(query)) ||
      (pod.helmVersion && pod.helmVersion.toLowerCase().includes(query)) ||
      pod.nodeName.toLowerCase().includes(query)
    );
  });

  // Sort pods based on orderBy and order
  const sortedPods = [...filteredPods].sort((a, b) => {
    let aValue: any = a[orderBy];
    let bValue: any = b[orderBy];

    // Handle undefined values
    if (aValue === undefined) aValue = '';
    if (bValue === undefined) bValue = '';

    // Special handling for CPU and memory usage to sort numerically
    if (orderBy === 'cpuUsage' || orderBy === 'memoryUsage') {
      // Extract numeric value (removing units like 'm' for millicores or 'Mi' for memory)
      const aNum = parseFloat(aValue);
      const bNum = parseFloat(bValue);
      
      if (order === 'desc') {
        return bNum - aNum;
      } else {
        return aNum - bNum;
      }
    }

    // Default string comparison
    if (order === 'desc') {
      return bValue.localeCompare(aValue);
    } else {
      return aValue.localeCompare(bValue);
    }
  });

  return (
    <>
      <Grid container spacing={1} sx={{ mb: 1 }}>
        <Grid item xs={8}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search pods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              style: { fontSize: '0.8rem' }
            }}
            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
          />
        </Grid>
        <Grid item xs={4}>
          <FormControl fullWidth size="small" sx={{ '& .MuiInputBase-root': { height: '32px', fontSize: '0.8rem' } }}>
            <InputLabel id="namespace-filter-label" sx={{ fontSize: '0.8rem' }}>Namespace</InputLabel>
            <Select
              labelId="namespace-filter-label"
              id="namespace-filter"
              value={namespaceFilter}
              label="Namespace"
              onChange={(e) => setNamespaceFilter(e.target.value)}
            >
              {namespaces.map((namespace) => (
                <MenuItem key={namespace} value={namespace} sx={{ fontSize: '0.8rem' }}>
                  {namespace === 'all' ? 'All Namespaces' : namespace}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 250px)' }}>
        <Table stickyHeader size="small" aria-label="pods table">
          <TableHead>
            <TableRow>
              {headCells.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  sortDirection={orderBy === headCell.id ? order : false}
                  sx={{ 
                    backgroundColor: 'background.paper',
                    py: 0.75,
                    px: 1,
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}
                >
                  {headCell.sortable ? (
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={() => handleRequestSort(headCell.id)}
                    >
                      {headCell.label}
                    </TableSortLabel>
                  ) : (
                    headCell.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPods.map((pod) => (
              <TableRow key={`${pod.namespace}-${pod.name}`} hover>
                <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>
                  <Tooltip title={pod.name}>
                    <Box sx={{ 
                      maxWidth: 200, 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {pod.name}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>{pod.namespace}</TableCell>
                <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getStatusIcon(pod.status)}
                    <Box component="span" sx={{ ml: 0.5 }}>{pod.status}</Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>{pod.helmChart || '-'}</TableCell>
                <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>{pod.helmVersion || '-'}</TableCell>
                <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>{pod.cpuUsage}</TableCell>
                <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>{pod.memoryUsage}</TableCell>
                <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>{pod.nodeName}</TableCell>
                <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>{pod.creationTimestamp}</TableCell>
              </TableRow>
            ))}
            {sortedPods.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No pods found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
} 