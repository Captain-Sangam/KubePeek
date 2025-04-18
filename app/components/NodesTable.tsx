'use client';

import { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Box, Typography, Collapse, IconButton, Chip, Tooltip, 
  TableSortLabel, LinearProgress
} from '@mui/material';
import { 
  KeyboardArrowDown as ExpandMoreIcon, 
  KeyboardArrowUp as ExpandLessIcon
} from '@mui/icons-material';
import { Node, NodeGroupInfo } from '../types/kubernetes';

type Order = 'asc' | 'desc';

interface HeadCell {
  id: keyof Node | 'actions' | 'utilization';
  label: string;
  sortable: boolean;
}

const headCells: HeadCell[] = [
  { id: 'name', label: 'Name', sortable: true },
  { id: 'instanceType', label: 'Instance Type', sortable: true },
  { id: 'capacity', label: 'CPU', sortable: true },
  { id: 'capacity', label: 'Memory', sortable: true },
  { id: 'utilization', label: 'CPU Util.', sortable: true },
  { id: 'utilization', label: 'Memory Util.', sortable: true },
  { id: 'pods', label: 'Pods', sortable: true },
  { id: 'actions', label: '', sortable: false },
];

interface NodeRowProps {
  node: Node;
  onNodeSelect: (nodeName: string) => void;
}

// Helper function to extract numeric value from formatted strings
const parseNumericValue = (valueStr: string): number => {
  if (!valueStr) return 0;
  
  // Convert to string if it's not already
  valueStr = String(valueStr);
  
  // Try direct parse first
  const directParse = parseFloat(valueStr);
  if (!isNaN(directParse) && !/[a-zA-Z]/.test(valueStr)) {
    return directParse;
  }
  
  // For CPU values with units
  if (/^[\d.]+m$/.test(valueStr)) {
    // Convert millicores to cores (e.g., "100m" -> 0.1)
    return parseFloat(valueStr.replace('m', '')) / 1000;
  }
  
  if (/^[\d.]+n$/.test(valueStr)) {
    // Convert nanocores to cores (e.g., "100n" -> 0.0000001)
    return parseFloat(valueStr.replace('n', '')) / 1000000000;
  }
  
  if (/^[\d.]+µ$/.test(valueStr)) {
    // Convert microcores to cores (e.g., "100µ" -> 0.0001)
    return parseFloat(valueStr.replace('µ', '')) / 1000000;
  }
  
  // For memory values with units - MODIFIED TO MATCH kubernetes.ts
  
  // Ki (kibibytes)
  if (/^[\d.]+Ki$/.test(valueStr)) {
    return parseFloat(valueStr.replace('Ki', '')) * 1024; // To bytes
  }
  
  // Mi (mebibytes)
  if (/^[\d.]+Mi$/.test(valueStr)) {
    return parseFloat(valueStr.replace('Mi', '')) * 1024 * 1024; // To bytes
  }
  
  // Gi (gibibytes)
  if (/^[\d.]+Gi$/.test(valueStr)) {
    return parseFloat(valueStr.replace('Gi', '')) * 1024 * 1024 * 1024; // To bytes
  }
  
  // K, M, G (without i)
  if (/^[\d.]+K$/.test(valueStr)) {
    return parseFloat(valueStr.replace('K', '')) * 1000; // To bytes
  }
  
  if (/^[\d.]+M$/.test(valueStr)) {
    return parseFloat(valueStr.replace('M', '')) * 1000 * 1000; // To bytes
  }
  
  if (/^[\d.]+G$/.test(valueStr)) {
    return parseFloat(valueStr.replace('G', '')) * 1000 * 1000 * 1000; // To bytes
  }
  
  // KB, MB, GB
  if (/^[\d.]+KB$/.test(valueStr)) {
    return parseFloat(valueStr.replace('KB', '')) * 1000; // To bytes
  }
  
  if (/^[\d.]+MB$/.test(valueStr)) {
    return parseFloat(valueStr.replace('MB', '')) * 1000 * 1000; // To bytes
  }
  
  if (/^[\d.]+GB$/.test(valueStr)) {
    return parseFloat(valueStr.replace('GB', '')) * 1000 * 1000 * 1000; // To bytes
  }
  
  // Fallback - just try to get any numbers
  const numMatches = valueStr.match(/[\d.]+/);
  if (numMatches) {
    return parseFloat(numMatches[0]);
  }
  
  return 0;
};

function NodeRow({ node, onNodeSelect }: NodeRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const getCpuUsagePercent = () => {
    try {
      // Always use parseNumericValue to handle formatted strings consistently
      const usageValue = parseNumericValue(node.usage.cpu);
      const capacityValue = parseNumericValue(node.capacity.cpu);
      
      if (capacityValue <= 0) return 0;
      const percent = (usageValue / capacityValue) * 100;
      
      // Cap at 100% for display purposes
      return Math.min(percent, 100);
    } catch (error) {
      console.error('Error calculating CPU usage percent:', error);
      return 0;
    }
  };

  const getMemoryUsagePercent = () => {
    try {
      // Always use parseNumericValue to handle formatted strings consistently
      const usageValue = parseNumericValue(node.usage.memory);
      const capacityValue = parseNumericValue(node.capacity.memory);
      
      if (capacityValue <= 0) return 0;
      const percent = (usageValue / capacityValue) * 100;
      
      // Cap at 100% for display purposes
      return Math.min(percent, 100);
    } catch (error) {
      console.error('Error calculating memory usage percent:', error);
      return 0;
    }
  };

  const cpuUsagePercent = getCpuUsagePercent();
  const memUsagePercent = getMemoryUsagePercent();

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 'medium', cursor: 'pointer' }} onClick={() => onNodeSelect(node.name)}>
              {node.name}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>{node.instanceType || 'Unknown'}</TableCell>
        <TableCell>{node.capacity.cpu}</TableCell>
        <TableCell>{node.capacity.memory}</TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress variant="determinate" value={cpuUsagePercent} 
                sx={{ height: 8, borderRadius: 5 }}
                color={cpuUsagePercent > 80 ? 'error' : cpuUsagePercent > 60 ? 'warning' : 'primary'}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">{`${cpuUsagePercent.toFixed(0)}%`}</Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress variant="determinate" value={memUsagePercent} 
                sx={{ height: 8, borderRadius: 5 }}
                color={memUsagePercent > 80 ? 'error' : memUsagePercent > 60 ? 'warning' : 'primary'}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">{`${memUsagePercent.toFixed(0)}%`}</Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>{node.pods}</TableCell>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={handleExpandClick}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Node Tags
              </Typography>
              <Box sx={{ mb: 2 }}>
                {node.tags && Object.entries(node.tags).length > 0 ? (
                  Object.entries(node.tags).map(([key, value]) => (
                    <Tooltip key={key} title={`${key}: ${value}`}>
                      <Chip 
                        label={`${key}: ${value}`} 
                        size="small" 
                        sx={{ m: 0.5 }}
                      />
                    </Tooltip>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No tags available
                  </Typography>
                )}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

interface NodeGroupRowProps {
  nodeGroup: NodeGroupInfo;
  onNodeSelect: (nodeName: string) => void;
  onNodeGroupSelect: (nodeGroupName: string) => void;
}

function NodeGroupRow({ nodeGroup, onNodeSelect, onNodeGroupSelect }: NodeGroupRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const getCpuUsagePercent = () => {
    try {
      // Use pre-calculated percentage if available
      if (nodeGroup.cpuPercentage !== undefined) {
        return nodeGroup.cpuPercentage;
      }
      
      // Otherwise use the old calculation
      const usageValue = parseNumericValue(nodeGroup.usedCpu);
      const totalValue = parseNumericValue(nodeGroup.totalCpu);
      
      // Debug log to see the values
      console.log(`NodeGroup ${nodeGroup.name} CPU: used=${nodeGroup.usedCpu} (${usageValue}), total=${nodeGroup.totalCpu} (${totalValue})`);
      
      if (totalValue <= 0) return 0;
      const percent = (usageValue / totalValue) * 100;
      
      // Cap at 100% for display purposes
      return Math.min(percent, 100);
    } catch (error) {
      console.error('Error calculating CPU usage percent:', error);
      return 0;
    }
  };

  const getMemoryUsagePercent = () => {
    try {
      // Use pre-calculated percentage if available
      if (nodeGroup.memPercentage !== undefined) {
        return nodeGroup.memPercentage;
      }
      
      // Otherwise use the old calculation
      const usageValue = parseNumericValue(nodeGroup.usedMemory);
      const totalValue = parseNumericValue(nodeGroup.totalMemory);
      
      // Debug log to see the values
      console.log(`NodeGroup ${nodeGroup.name} memory: used=${nodeGroup.usedMemory} (${usageValue}), total=${nodeGroup.totalMemory} (${totalValue})`);
      
      if (totalValue <= 0) return 0;
      const percent = (usageValue / totalValue) * 100;
      
      // Cap at 100% for display purposes
      return Math.min(percent, 100);
    } catch (error) {
      console.error('Error calculating memory usage percent:', error);
      return 0;
    }
  };

  const cpuUsagePercent = getCpuUsagePercent();
  const memUsagePercent = getMemoryUsagePercent();

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, bgcolor: 'rgba(0, 0, 0, 0.04)' }}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant="body1" 
              sx={{ 
                fontWeight: 'bold', 
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' }
              }}
              onClick={() => onNodeGroupSelect(nodeGroup.name)}
            >
              {nodeGroup.name}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>Group ({nodeGroup.nodes.length} nodes)</TableCell>
        <TableCell>{nodeGroup.totalCpu}</TableCell>
        <TableCell>{nodeGroup.totalMemory}</TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress variant="determinate" value={cpuUsagePercent} 
                sx={{ height: 8, borderRadius: 5 }}
                color={cpuUsagePercent > 80 ? 'error' : cpuUsagePercent > 60 ? 'warning' : 'primary'}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">{`${cpuUsagePercent.toFixed(0)}%`}</Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress variant="determinate" value={memUsagePercent} 
                sx={{ height: 8, borderRadius: 5 }}
                color={memUsagePercent > 80 ? 'error' : memUsagePercent > 60 ? 'warning' : 'primary'}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">{`${memUsagePercent.toFixed(0)}%`}</Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>{nodeGroup.podsCount}</TableCell>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={handleExpandClick}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Nodes in Group
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Instance Type</TableCell>
                      <TableCell>CPU</TableCell>
                      <TableCell>Memory</TableCell>
                      <TableCell>Pods</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {nodeGroup.nodes.map((node) => (
                      <TableRow key={node.name}>
                        <TableCell 
                          component="th" 
                          scope="row"
                          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          onClick={() => onNodeSelect(node.name)}
                        >
                          {node.name}
                        </TableCell>
                        <TableCell>{node.instanceType || 'Unknown'}</TableCell>
                        <TableCell>{node.capacity.cpu}</TableCell>
                        <TableCell>{node.capacity.memory}</TableCell>
                        <TableCell>{node.pods}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

interface NodesTableProps {
  nodes: Node[];
  nodeGroups: NodeGroupInfo[];
  onNodeSelect: (nodeName: string) => void;
  onNodeGroupSelect: (nodeGroupName: string) => void;
}

export default function NodesTable({
  nodes,
  nodeGroups,
  onNodeSelect,
  onNodeGroupSelect
}: NodesTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof Node>('name');

  const handleRequestSort = (property: keyof Node) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedNodes = [...nodes].sort((a, b) => {
    let aValue: any = a[orderBy];
    let bValue: any = b[orderBy];

    if (orderBy === 'capacity') {
      aValue = parseFloat(a.capacity.cpu);
      bValue = parseFloat(b.capacity.cpu);
    }

    if (order === 'desc') {
      return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
    } else {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    }
  });

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
      <Table stickyHeader aria-label="nodes table">
        <TableHead>
          <TableRow>
            {headCells.map((headCell) => (
              <TableCell
                key={headCell.id}
                sortDirection={orderBy === headCell.id ? order : false}
              >
                {headCell.sortable ? (
                  <TableSortLabel
                    active={orderBy === headCell.id}
                    direction={orderBy === headCell.id ? order : 'asc'}
                    onClick={() => handleRequestSort(headCell.id as keyof Node)}
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
          {nodeGroups.map((nodeGroup) => (
            <NodeGroupRow 
              key={nodeGroup.name} 
              nodeGroup={nodeGroup} 
              onNodeSelect={onNodeSelect}
              onNodeGroupSelect={onNodeGroupSelect}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
} 