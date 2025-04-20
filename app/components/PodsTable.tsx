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
import { Pod, Cluster } from '../types/kubernetes';
import { useTheme } from '../lib/ThemeProvider';

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

// Define column widths for consistent alignment
const columnWidths = {
  name: '20%',
  namespace: '10%',
  status: '10%',
  helmChart: '12%',
  helmVersion: '8%',
  cpuUsage: '10%',
  memoryUsage: '10%',
  nodeName: '12%',
  age: '8%'
};

interface PodsTableProps {
  pods: Pod[];
  cluster: Cluster;
}

export default function PodsTable({ pods, cluster }: PodsTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof Pod>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { mode } = useTheme();

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
                  <SearchIcon fontSize="small" sx={{ color: mode === 'light' ? 'inherit' : '#b0b0b0' }} />
                </InputAdornment>
              ),
              style: { fontSize: '0.8rem' }
            }}
            sx={{ 
              '& .MuiInputBase-root': { 
                height: '32px',
                color: mode === 'light' ? 'inherit' : '#e0e0e0',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)',
              },
              '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
              }
            }}
          />
        </Grid>
        <Grid item xs={4}>
          <FormControl 
            fullWidth 
            size="small" 
            sx={{ 
              '& .MuiInputBase-root': { 
                height: '32px', 
                fontSize: '0.8rem',
                color: mode === 'light' ? 'inherit' : '#e0e0e0',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)',
              },
              '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
              }
            }}
          >
            <InputLabel 
              id="namespace-filter-label" 
              sx={{ 
                fontSize: '0.8rem',
                color: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                '&.Mui-focused': {
                  color: mode === 'light' ? 'primary.main' : 'primary.light'
                }
              }}
            >
              Namespace
            </InputLabel>
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
        <Table stickyHeader size="small" aria-label="pods table" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {headCells.map((headCell, index) => {
                let width = columnWidths.name;
                let align: "left" | "right" | "center" = "left";
                
                // Set width based on column type
                if (headCell.id === 'name') width = columnWidths.name;
                else if (headCell.id === 'namespace') width = columnWidths.namespace;
                else if (headCell.id === 'status') width = columnWidths.status;
                else if (headCell.id === 'helmChart') width = columnWidths.helmChart;
                else if (headCell.id === 'helmVersion') width = columnWidths.helmVersion;
                else if (headCell.id === 'cpuUsage') {
                  width = columnWidths.cpuUsage;
                  align = "right";
                }
                else if (headCell.id === 'memoryUsage') {
                  width = columnWidths.memoryUsage;
                  align = "right";
                }
                else if (headCell.id === 'nodeName') width = columnWidths.nodeName;
                else if (headCell.id === 'creationTimestamp') width = columnWidths.age;
                
                return (
                  <TableCell
                    align={align}
                    key={`${headCell.id}-${index}`}
                    sortDirection={orderBy === headCell.id ? order : false}
                    sx={{ 
                      backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                      py: 0.75,
                      px: 1,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: mode === 'light' ? '#212121' : '#e0e0e0',
                      width: width,
                      maxWidth: width
                    }}
                  >
                    {headCell.sortable ? (
                      <TableSortLabel
                        active={orderBy === headCell.id}
                        direction={orderBy === headCell.id ? order : 'asc'}
                        onClick={() => handleRequestSort(headCell.id)}
                        sx={{
                          color: mode === 'light' ? 'inherit' : '#e0e0e0',
                          '& .MuiTableSortLabel-icon': {
                            color: mode === 'light' ? 'inherit !important' : '#e0e0e0 !important'
                          }
                        }}
                      >
                        {headCell.label}
                      </TableSortLabel>
                    ) : (
                      headCell.label
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPods.map((pod) => (
              <TableRow 
                key={`${pod.namespace}-${pod.name}`}
                hover
                sx={{ cursor: 'default' }}
              >
                <TableCell 
                  sx={{ 
                    py: 0.5, 
                    px: 1, 
                    fontSize: '0.75rem', 
                    color: mode === 'light' ? 'inherit' : '#e0e0e0',
                    width: columnWidths.name,
                    maxWidth: columnWidths.name,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={pod.name}
                >
                  {pod.name}
                </TableCell>
                <TableCell 
                  sx={{ 
                    py: 0.5, 
                    px: 1, 
                    fontSize: '0.75rem', 
                    color: mode === 'light' ? 'inherit' : '#e0e0e0',
                    width: columnWidths.namespace,
                    maxWidth: columnWidths.namespace
                  }}
                >
                  <Chip 
                    label={pod.namespace} 
                    size="small" 
                    sx={{ 
                      height: 20, 
                      fontSize: '0.65rem',
                      backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
                      color: mode === 'light' ? 'inherit' : '#e0e0e0'
                    }} 
                  />
                </TableCell>
                <TableCell 
                  sx={{ 
                    py: 0.5, 
                    px: 1, 
                    fontSize: '0.75rem', 
                    color: mode === 'light' ? 'inherit' : '#e0e0e0',
                    width: columnWidths.status,
                    maxWidth: columnWidths.status
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getStatusIcon(pod.status)}
                    <Box component="span" sx={{ ml: 0.5 }}>
                      {pod.status}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell 
                  sx={{ 
                    py: 0.5, 
                    px: 1, 
                    fontSize: '0.75rem', 
                    color: mode === 'light' ? 'inherit' : '#e0e0e0',
                    width: columnWidths.helmChart,
                    maxWidth: columnWidths.helmChart,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={pod.helmChart || '-'}
                >
                  {pod.helmChart || '-'}
                </TableCell>
                <TableCell 
                  sx={{ 
                    py: 0.5, 
                    px: 1, 
                    fontSize: '0.75rem', 
                    color: mode === 'light' ? 'inherit' : '#e0e0e0',
                    width: columnWidths.helmVersion,
                    maxWidth: columnWidths.helmVersion
                  }}
                >
                  {pod.helmVersion || '-'}
                </TableCell>
                <TableCell 
                  align="right"
                  sx={{ 
                    py: 0.5, 
                    px: 1, 
                    fontSize: '0.75rem', 
                    color: mode === 'light' ? 'inherit' : '#e0e0e0',
                    width: columnWidths.cpuUsage,
                    maxWidth: columnWidths.cpuUsage
                  }}
                >
                  {pod.cpuUsage || '-'}
                </TableCell>
                <TableCell 
                  align="right"
                  sx={{ 
                    py: 0.5, 
                    px: 1, 
                    fontSize: '0.75rem', 
                    color: mode === 'light' ? 'inherit' : '#e0e0e0',
                    width: columnWidths.memoryUsage,
                    maxWidth: columnWidths.memoryUsage
                  }}
                >
                  {pod.memoryUsage || '-'}
                </TableCell>
                <TableCell 
                  sx={{ 
                    py: 0.5, 
                    px: 1, 
                    fontSize: '0.75rem', 
                    color: mode === 'light' ? 'inherit' : '#e0e0e0',
                    width: columnWidths.nodeName,
                    maxWidth: columnWidths.nodeName,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={pod.nodeName}
                >
                  {pod.nodeName}
                </TableCell>
                <TableCell 
                  sx={{ 
                    py: 0.5, 
                    px: 1, 
                    fontSize: '0.75rem', 
                    color: mode === 'light' ? 'inherit' : '#e0e0e0',
                    width: columnWidths.age,
                    maxWidth: columnWidths.age
                  }}
                >
                  {pod.creationTimestamp}
                </TableCell>
              </TableRow>
            ))}
            {sortedPods.length === 0 && (
              <TableRow>
                <TableCell 
                  colSpan={9} 
                  align="center" 
                  sx={{ 
                    py: 2,
                    color: mode === 'light' ? 'text.secondary' : '#a0a0a0'
                  }}
                >
                  No pods found
                  {searchQuery && ` matching "${searchQuery}"`}
                  {namespaceFilter !== 'all' && ` in namespace "${namespaceFilter}"`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
} 