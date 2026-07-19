'use client';

import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Box, TableSortLabel,
} from '@mui/material';
import { Node, NodeGroupInfo } from '../types/kubernetes';
import { parseNumericValue } from '../lib/format';
import NodeRow, { nodeColumnWidths } from './nodes/NodeRow';
import NodeGroupRow from './nodes/NodeGroupRow';

type Order = 'asc' | 'desc';

interface HeadCell {
  id: keyof Node | 'utilization' | 'started';
  label: string;
  sortable: boolean;
  align?: 'left' | 'right' | 'center';
  width: string;
}

// Header cells shared by both views. The "Instance Type" label switches to
// "Nodes" in the node-groups view (handled at render).
const headCells: HeadCell[] = [
  { id: 'name', label: 'Name', sortable: true, width: nodeColumnWidths.name },
  { id: 'instanceType', label: 'Instance Type', sortable: true, width: nodeColumnWidths.instanceType },
  { id: 'capacity', label: 'CPU', sortable: true, align: 'right', width: nodeColumnWidths.cpu },
  { id: 'capacity', label: 'Memory', sortable: true, align: 'right', width: nodeColumnWidths.memory },
  { id: 'utilization', label: 'CPU Util.', sortable: false, width: nodeColumnWidths.cpuUtil },
  { id: 'utilization', label: 'Memory Util.', sortable: false, width: nodeColumnWidths.memUtil },
  { id: 'pods', label: 'Pods', sortable: true, align: 'right', width: nodeColumnWidths.pods },
  { id: 'started', label: 'Started', sortable: true, width: nodeColumnWidths.started },
];

interface NodesTableProps {
  nodes: Node[];
  nodeGroups: NodeGroupInfo[];
  viewMode: 'nodes' | 'nodeGroups';
  onNodeSelect: (nodeName: string) => void;
  onNodeGroupSelect: (nodeGroupName: string) => void;
}

export default function NodesTable({ nodes, nodeGroups, viewMode, onNodeSelect, onNodeGroupSelect }: NodesTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<HeadCell['id']>('name');

  const handleRequestSort = (property: HeadCell['id']) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const cmp = (a: number | string, b: number | string) =>
    order === 'desc' ? (b < a ? -1 : b > a ? 1 : 0) : a < b ? -1 : a > b ? 1 : 0;

  const sortedNodes = [...nodes].sort((a, b) => {
    switch (orderBy) {
      case 'capacity':
        return cmp(parseNumericValue(a.capacity.cpu), parseNumericValue(b.capacity.cpu));
      case 'pods':
        return cmp(a.pods, b.pods);
      case 'started':
        return cmp(a.createdAt || '', b.createdAt || '');
      case 'instanceType':
        return cmp((a.instanceType || '').toLowerCase(), (b.instanceType || '').toLowerCase());
      default:
        return cmp(a.name.toLowerCase(), b.name.toLowerCase());
    }
  });

  const sortedNodeGroups = [...nodeGroups].sort((a, b) => {
    switch (orderBy) {
      case 'capacity':
        return cmp(parseNumericValue(a.totalCpu), parseNumericValue(b.totalCpu));
      case 'pods':
        return cmp(a.podsCount, b.podsCount);
      case 'started':
        return cmp(a.oldestNodeCreatedAt || '', b.oldestNodeCreatedAt || '');
      default:
        return cmp(a.name.toLowerCase(), b.name.toLowerCase());
    }
  });

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 200px)' }}>
        <Table stickyHeader size="small" sx={{ minWidth: 650, tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {headCells.map((headCell, index) => {
                const label =
                  headCell.id === 'instanceType' && viewMode === 'nodeGroups' ? 'Nodes' : headCell.label;
                return (
                  <TableCell
                    align={headCell.align || 'left'}
                    key={`${headCell.id}-${index}`}
                    sortDirection={orderBy === headCell.id ? order : false}
                    sx={{
                      fontWeight: 600, py: 1.5, fontSize: '0.75rem',
                      backgroundColor: 'action.hover',
                      width: headCell.width, maxWidth: headCell.width,
                    }}
                  >
                    {headCell.sortable ? (
                      <TableSortLabel
                        active={orderBy === headCell.id}
                        direction={orderBy === headCell.id ? order : 'asc'}
                        onClick={() => handleRequestSort(headCell.id)}
                      >
                        {label}
                      </TableSortLabel>
                    ) : (
                      label
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {viewMode === 'nodeGroups'
              ? sortedNodeGroups.map((nodeGroup) => (
                  <NodeGroupRow
                    key={nodeGroup.name}
                    nodeGroup={nodeGroup}
                    onNodeSelect={onNodeSelect}
                    onNodeGroupSelect={onNodeGroupSelect}
                  />
                ))
              : sortedNodes.map((node) => (
                  <NodeRow key={node.name} node={node} onNodeSelect={onNodeSelect} />
                ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
