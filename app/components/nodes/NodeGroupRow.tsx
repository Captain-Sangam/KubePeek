'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '@astryxdesign/core/Table';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { NodeGroupInfo } from '../../types/kubernetes';
import { usagePercent, formatAge, formatFullTimestamp } from '../../lib/format';
import UsageBar from '../shared/UsageBar';

interface NodeGroupRowProps {
  nodeGroup: NodeGroupInfo;
  onNodeSelect: (nodeName: string) => void;
  onNodeGroupSelect: (nodeGroupName: string) => void;
}

const truncate = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

export default function NodeGroupRow({ nodeGroup, onNodeSelect, onNodeGroupSelect }: NodeGroupRowProps) {
  const [expanded, setExpanded] = useState(false);

  const cpuPct = nodeGroup.metricsAvailable === false ? null : (nodeGroup.cpuPercentage ?? usagePercent(nodeGroup.usedCpu, nodeGroup.totalCpu));
  const memPct = nodeGroup.metricsAvailable === false ? null : (nodeGroup.memPercentage ?? usagePercent(nodeGroup.usedMemory, nodeGroup.totalMemory));

  const purchasing = ['spot', 'on-demand', 'unknown'].map((type) => {
    const count = nodeGroup.nodes.filter((node) => node.capacityType === type).length;
    return count ? `${count} ${type}` : '';
  }).filter(Boolean).join(' / ');

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
        <TableCell><Text type="supporting" size="2xs" maxLines={1}>{purchasing}</Text></TableCell>
        <TableCell style={{ textAlign: 'right' }}>{nodeGroup.totalCpu}</TableCell>
        <TableCell style={{ textAlign: 'right' }}>{nodeGroup.totalMemory}</TableCell>
        <TableCell>
          <UsageBar percent={cpuPct} caption={cpuPct == null ? 'n/a' : `${cpuPct.toFixed(0)}%`} tooltip={`CPU ${nodeGroup.usedCpu} of ${nodeGroup.totalCpu}`} />
        </TableCell>
        <TableCell>
          <UsageBar percent={memPct} caption={memPct == null ? 'n/a' : `${memPct.toFixed(0)}%`} tooltip={`Memory ${nodeGroup.usedMemory} of ${nodeGroup.totalMemory}`} />
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
          <TableCell colSpan={9}>
            <VStack gap={1} paddingBlock={1}>
              <Text type="body" size="sm" weight="semibold">Nodes in Group</Text>
              <Table density="compact" textOverflow="truncate" style={{ width: '100%', tableLayout: 'fixed' }}>
                <TableHeader>
                  <TableRow isHeaderRow>
                    <TableHeaderCell style={{ width: '30%' }}>Name</TableHeaderCell>
                    <TableHeaderCell style={{ width: '16%' }}>Instance Type</TableHeaderCell>
                    <TableHeaderCell style={{ width: '20%' }}>CPU</TableHeaderCell>
                    <TableHeaderCell style={{ width: '20%' }}>Memory</TableHeaderCell>
                    <TableHeaderCell style={{ width: '6%', textAlign: 'right' }}>Pods</TableHeaderCell>
                    <TableHeaderCell style={{ width: '8%' }}>Started</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodeGroup.nodes.map((node) => {
                    const nCpu = node.metricsAvailable ? usagePercent(node.usage.cpu, node.capacity.cpu) : null;
                    const nMem = node.metricsAvailable ? usagePercent(node.usage.memory, node.capacity.memory) : null;
                    return (
                      <TableRow key={node.name}>
                        <TableCell
                          style={{ ...truncate, cursor: 'pointer' }}
                          onClick={() => onNodeSelect(node.name)}
                        >
                          <Text type="body" size="2xs" maxLines={1}>{node.name}</Text>
                        </TableCell>
                        <TableCell style={truncate}><Text type="body" size="2xs" maxLines={1}>{node.instanceType || 'Unknown'}</Text></TableCell>
                        <TableCell>
                          <VStack maxWidth={180}><UsageBar percent={nCpu} caption={nCpu == null ? 'n/a' : `${node.usage.cpu} / ${node.capacity.cpu} cores`} /></VStack>
                        </TableCell>
                        <TableCell>
                          <VStack maxWidth={180}><UsageBar percent={nMem} caption={nMem == null ? 'n/a' : `${node.usage.memory} / ${node.capacity.memory}`} /></VStack>
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
