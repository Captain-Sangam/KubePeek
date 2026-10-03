'use client';

import { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell } from '@astryxdesign/core/Table';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Icon } from '@astryxdesign/core/Icon';
import { Node, NodeGroupInfo } from '../../types/kubernetes';
import { parseNumericValue } from '../../lib/format';
import NodeRow, { nodeColumnWidths } from './NodeRow';
import NodeGroupRow from './NodeGroupRow';

type Order = 'asc' | 'desc';

interface HeadCell {
  id: keyof Node | 'cpu' | 'memory' | 'utilization' | 'started';
  label: string;
  sortable: boolean;
  align?: 'left' | 'right';
  width: string;
}

// Header cells shared by both views. The "Instance Type" label switches to
// "Nodes" in the node-groups view (handled at render).
const headCells: HeadCell[] = [
  { id: 'name', label: 'Name', sortable: true, width: nodeColumnWidths.name },
  { id: 'instanceType', label: 'Instance Type', sortable: true, width: nodeColumnWidths.instanceType },
  { id: 'capacityType', label: 'Capacity', sortable: true, width: nodeColumnWidths.capacityType },
  { id: 'cpu', label: 'CPU', sortable: true, align: 'right', width: nodeColumnWidths.cpu },
  { id: 'memory', label: 'Memory', sortable: true, align: 'right', width: nodeColumnWidths.memory },
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
      case 'cpu':
        return cmp(parseNumericValue(a.capacity.cpu), parseNumericValue(b.capacity.cpu));
      case 'memory':
        return cmp(parseNumericValue(a.capacity.memory), parseNumericValue(b.capacity.memory));
      case 'pods':
        return cmp(a.pods, b.pods);
      case 'started':
        return cmp(a.createdAt || '', b.createdAt || '');
      case 'capacityType':
        return cmp(a.capacityType, b.capacityType);
      case 'instanceType':
        return cmp((a.instanceType || '').toLowerCase(), (b.instanceType || '').toLowerCase());
      default:
        return cmp(a.name.toLowerCase(), b.name.toLowerCase());
    }
  });

  const sortedNodeGroups = [...nodeGroups].sort((a, b) => {
    switch (orderBy) {
      case 'instanceType':
        return cmp(a.nodes.length, b.nodes.length);
      case 'cpu':
        return cmp(parseNumericValue(a.totalCpu), parseNumericValue(b.totalCpu));
      case 'memory':
        return cmp(parseNumericValue(a.totalMemory), parseNumericValue(b.totalMemory));
      case 'pods':
        return cmp(a.podsCount, b.podsCount);
      case 'started':
        return cmp(a.oldestNodeCreatedAt || '', b.oldestNodeCreatedAt || '');
      default:
        return cmp(a.name.toLowerCase(), b.name.toLowerCase());
    }
  });

  return (
    <VStack className="kp-table-scroll">
      <Table density="compact" hasHover style={{ tableLayout: 'fixed', width: '100%' }}>
        <TableHeader>
          <TableRow isHeaderRow>
            {headCells.map((headCell, index) => {
              const label =
                headCell.id === 'instanceType' && viewMode === 'nodeGroups' ? 'Nodes' : headCell.label;
              const sortable = headCell.sortable && !(viewMode === 'nodeGroups' && headCell.id === 'capacityType');
              return (
                <TableHeaderCell
                  key={`${headCell.id}-${index}`}
                  style={{
                    width: headCell.width,
                    textAlign: headCell.align || 'left',
                    cursor: sortable ? 'pointer' : undefined,
                  }}
                  onClick={sortable ? () => handleRequestSort(headCell.id) : undefined}
                >
                  {sortable ? (
                    <HStack gap={0.5} vAlign="center" hAlign={headCell.align === 'right' ? 'end' : 'start'}>
                      <span>{label}</span>
                      {orderBy === headCell.id && (
                        <Icon icon={order === 'asc' ? 'arrowUp' : 'arrowDown'} size="xsm" />
                      )}
                    </HStack>
                  ) : (
                    label
                  )}
                </TableHeaderCell>
              );
            })}
          </TableRow>
        </TableHeader>
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
    </VStack>
  );
}
