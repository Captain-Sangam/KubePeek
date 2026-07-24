'use client';

import { VStack } from '@astryxdesign/core/Stack';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Text } from '@astryxdesign/core/Text';
import { getUsageColor } from '../../lib/format';

interface UsageBarProps {
  // Percentage 0-100, or null when no denominator is available (renders text only).
  percent: number | null | undefined;
  // Caption shown under/next to the bar, e.g. "123m / 500m".
  caption?: string;
  // Tooltip text, e.g. "45m of 100m limit (45%)".
  tooltip?: string;
  // Bar width; bar thickness is themed (height kept for call-site compat, unused).
  width?: number | string;
  height?: number;
  // When there's no denominator, show this text instead of a bar.
  fallbackText?: string;
}

const VARIANT = { error: 'error', warning: 'warning', primary: 'accent' } as const;

// Shared usage bar used by node groups, pods table, and the pod drawer.
export default function UsageBar({
  percent,
  caption,
  tooltip,
  width = '100%',
  fallbackText,
}: UsageBarProps) {
  if (percent === null || percent === undefined) {
    return (
      <Text type="supporting" size="2xs">
        {fallbackText ?? caption ?? '—'}
      </Text>
    );
  }

  const bar = (
    <VStack gap={0.5} width={width}>
      <ProgressBar
        label={tooltip ?? caption ?? 'Usage'}
        isLabelHidden
        value={Math.min(percent, 100)}
        variant={VARIANT[getUsageColor(percent)]}
      />
      {caption && (
        <Text type="supporting" size="2xs" textWrap="nowrap">
          {caption}
        </Text>
      )}
    </VStack>
  );

  return tooltip ? <Tooltip content={tooltip}>{bar}</Tooltip> : bar;
}
