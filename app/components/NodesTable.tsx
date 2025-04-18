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

function NodeRow({ node, onNodeSelect }: NodeRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const getCpuUsagePercent = () => {
    const cpuUsage = parseFloat(node.usage.cpu);
    const cpuCapacity = parseFloat(node.capacity.cpu);
    return (cpuUsage / cpuCapacity) * 100;
  };

  const getMemoryUsagePercent = () => {
    const memUsage = parseFloat(node.usage.memory);
    const memCapacity = parseFloat(node.capacity.memory);
    return (memUsage / memCapacity) * 100;
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
    const usedCpu = parseFloat(nodeGroup.usedCpu);
    const totalCpu = parseFloat(nodeGroup.totalCpu);
    return (usedCpu / totalCpu) * 100;
  };

  const getMemoryUsagePercent = () => {
    const usedMemory = parseFloat(nodeGroup.usedMemory);
    const totalMemory = parseFloat(nodeGroup.totalMemory);
    return (usedMemory / totalMemory) * 100;
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
          {sortedNodes.map((node) => (
            <NodeRow 
              key={node.name} 
              node={node} 
              onNodeSelect={onNodeSelect} 
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
} 