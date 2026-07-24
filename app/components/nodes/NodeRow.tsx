'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TableRow, TableCell } from '@astryxdesign/core/Table';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Node } from '../../types/kubernetes';
import { parseNumericValue, formatAge, formatFullTimestamp } from '../../lib/format';
import UsageBar from '../shared/UsageBar';

export const nodeColumnWidths = {
  name: '26%',
  instanceType: '15%',
  cpu: '8%',
  memory: '10%',
  cpuUtil: '13%',
  memUtil: '13%',
  pods: '7%',
  started: '8%',
};

interface NodeRowProps {
  node: Node;
  onNodeSelect: (nodeName: string) => void;
}

const usagePercent = (usage: string, capacity: string): number => {
  const u = parseNumericValue(usage);
  const c = parseNumericValue(capacity);
  if (c <= 0) return 0;
  return Math.min((u / c) * 100, 100);
};

const truncate = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

export default function NodeRow({ node, onNodeSelect }: NodeRowProps) {
  const [expanded, setExpanded] = useState(false);

  const cpuPct = usagePercent(node.usage.cpu, node.capacity.cpu);
  const memPct = usagePercent(node.usage.memory, node.capacity.memory);

  return (
    <>
      <TableRow>
        <TableCell style={truncate}>
          <span
            style={{ cursor: 'pointer', fontWeight: 500 }}
            onClick={() => onNodeSelect(node.name)}
            title={node.name}
          >
            {node.name}
          </span>
        </TableCell>
        <TableCell style={truncate}>
          <span title={node.instanceType || 'Unknown'}>{node.instanceType || 'Unknown'}</span>
        </TableCell>
        <TableCell style={{ textAlign: 'right' }}>{node.capacity.cpu}</TableCell>
        <TableCell style={{ textAlign: 'right' }}>{node.capacity.memory}</TableCell>
        <TableCell>
          <UsageBar
            percent={cpuPct}
            caption={`${cpuPct.toFixed(0)}%`}
            tooltip={`CPU ${node.usage.cpu} of ${node.capacity.cpu}`}
          />
        </TableCell>
        <TableCell>
          <UsageBar
            percent={memPct}
            caption={`${memPct.toFixed(0)}%`}
            tooltip={`Memory ${node.usage.memory} of ${node.capacity.memory}`}
          />
        </TableCell>
        <TableCell style={{ textAlign: 'right' }}>{node.pods}</TableCell>
        <TableCell>
          <HStack gap={0.5} vAlign="center" wrap="nowrap">
            <span title={formatFullTimestamp(node.createdAt)}>{formatAge(node.createdAt)}</span>
            <IconButton
              label={expanded ? 'Collapse node tags' : 'Expand node tags'}
              variant="ghost"
              size="sm"
              icon={<Icon icon={expanded ? ChevronUp : ChevronDown} size="sm" />}
              onClick={() => setExpanded(!expanded)}
            />
          </HStack>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={8}>
            <VStack gap={1} paddingBlock={1}>
              <Text type="body" size="sm" weight="semibold">Node Tags</Text>
              {node.tags && Object.entries(node.tags).length > 0 ? (
                <HStack gap={1} wrap="wrap">
                  {Object.entries(node.tags).map(([key, value]) => (
                    <Tooltip key={key} content={`${key}: ${value}`}>
                      <Token label={`${key}: ${value}`} size="sm" />
                    </Tooltip>
                  ))}
                </HStack>
              ) : (
                <Text type="supporting" color="secondary">No tags available</Text>
              )}
            </VStack>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
