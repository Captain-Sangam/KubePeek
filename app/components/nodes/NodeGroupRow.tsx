'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '@astryxdesign/core/Table';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { NodeGroupInfo } from '../../types/kubernetes';
import { parseNumericValue, formatAge, formatFullTimestamp } from '../../lib/format';
import UsageBar from '../shared/UsageBar';

interface NodeGroupRowProps {
  nodeGroup: NodeGroupInfo;
  onNodeSelect: (nodeName: string) => void;
  onNodeGroupSelect: (nodeGroupName: string) => void;
}

const usagePercent = (usage: string, capacity: string): number => {
  const u = parseNumericValue(usage);
  const c = parseNumericValue(capacity);
  if (c <= 0) return 0;
  return Math.min((u / c) * 100, 100);
};

const truncate = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

export default function NodeGroupRow({ nodeGroup, onNodeSelect, onNodeGroupSelect }: NodeGroupRowProps) {
  const [expanded, setExpanded] = useState(false);

  const cpuPct = nodeGroup.cpuPercentage ?? usagePercent(nodeGroup.usedCpu, nodeGroup.totalCpu);
  const memPct = nodeGroup.memPercentage ?? usagePercent(nodeGroup.usedMemory, nodeGroup.totalMemory);

  return (
    <>
      <TableRow>
        <TableCell>
          <HStack gap={1} vAlign="center" wrap="nowrap">
            <IconButton
              label={expanded ? 'Collapse node group' : 'Expand node group'}
              variant="ghost"
              size="sm"
              icon={<Icon icon={expanded ? ChevronUp : ChevronDown} size="sm" />}
              onClick={() => setExpanded(!expanded)}
            />
            <span
              style={{ ...truncate, cursor: 'pointer', fontWeight: 500 }}
              onClick={() => onNodeGroupSelect(nodeGroup.name)}
              title={`${nodeGroup.name} — click to filter pods`}
            >
              {nodeGroup.name}
            </span>
          </HStack>
        </TableCell>
        <TableCell>
          {nodeGroup.nodes.length === 1 ? '(1 node)' : `(${nodeGroup.nodes.length} nodes)`}
        </TableCell>
        <TableCell style={{ textAlign: 'right' }}>{nodeGroup.totalCpu}</TableCell>
        <TableCell style={{ textAlign: 'right' }}>{nodeGroup.totalMemory}</TableCell>
        <TableCell>
          <UsageBar percent={cpuPct} caption={`${cpuPct.toFixed(0)}%`} tooltip={`CPU ${nodeGroup.usedCpu} of ${nodeGroup.totalCpu}`} />
        </TableCell>
        <TableCell>
          <UsageBar percent={memPct} caption={`${memPct.toFixed(0)}%`} tooltip={`Memory ${nodeGroup.usedMemory} of ${nodeGroup.totalMemory}`} />
        </TableCell>
        <TableCell style={{ textAlign: 'right' }}>{nodeGroup.podsCount}</TableCell>
        <TableCell>
          <span title={formatFullTimestamp(nodeGroup.oldestNodeCreatedAt)}>
            {formatAge(nodeGroup.oldestNodeCreatedAt)}
          </span>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={8}>
            <VStack gap={1} paddingBlock={1}>
              <Text type="body" size="sm" weight="semibold">Nodes in Group</Text>
              <Table density="compact" style={{ width: '100%' }}>
                <TableHeader>
                  <TableRow isHeaderRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Instance Type</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: 120 }}>CPU</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: 120 }}>Memory</TableHeaderCell>
                    <TableHeaderCell style={{ textAlign: 'right' }}>Pods</TableHeaderCell>
                    <TableHeaderCell>Started</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodeGroup.nodes.map((node) => {
                    const nCpu = usagePercent(node.usage.cpu, node.capacity.cpu);
                    const nMem = usagePercent(node.usage.memory, node.capacity.memory);
                    return (
                      <TableRow key={node.name}>
                        <TableCell
                          style={{ cursor: 'pointer' }}
                          onClick={() => onNodeSelect(node.name)}
                        >
                          {node.name}
                        </TableCell>
                        <TableCell>{node.instanceType || 'Unknown'}</TableCell>
                        <TableCell>
                          <UsageBar percent={nCpu} caption={`${node.usage.cpu} / ${node.capacity.cpu} cores`} />
                        </TableCell>
                        <TableCell>
                          <UsageBar percent={nMem} caption={`${node.usage.memory} / ${node.capacity.memory}`} />
                        </TableCell>
                        <TableCell style={{ textAlign: 'right' }}>{node.pods}</TableCell>
                        <TableCell>
                          <span title={formatFullTimestamp(node.createdAt)}>{formatAge(node.createdAt)}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </VStack>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
