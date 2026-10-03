'use client';

import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import type { Node } from '../../types/kubernetes';

export default function CapacityChip({ node }: { node: Node }) {
  const label = node.capacityType === 'spot' ? 'Spot' : node.capacityType === 'on-demand' ? 'On-Demand' : 'Unknown';
  return (
    <Tooltip content={node.capacitySource || 'No supported capacity label on this node'}>
      <Token label={label} size="sm" color={node.capacityType === 'spot' ? 'yellow' : 'gray'} />
    </Tooltip>
  );
}
