'use client';

import { Box, LinearProgress, Tooltip, Typography } from '@mui/material';
import { getUsageColor } from '../../lib/format';

interface UsageBarProps {
  // Percentage 0-100, or null when no denominator is available (renders text only).
  percent: number | null | undefined;
  // Caption shown under/next to the bar, e.g. "123m / 500m".
  caption?: string;
  // Tooltip text, e.g. "45m of 100m limit (45%)".
  tooltip?: string;
  // Bar width; height controls thickness.
  width?: number | string;
  height?: number;
  // When there's no denominator, show this text instead of a bar.
  fallbackText?: string;
}

// Shared usage bar used by node groups, pods table, and the pod drawer.
export default function UsageBar({
  percent,
  caption,
  tooltip,
  width = '100%',
  height = 5,
  fallbackText,
}: UsageBarProps) {
  if (percent === null || percent === undefined) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
        {fallbackText ?? caption ?? '—'}
      </Typography>
    );
  }

  const bar = (
    <Box sx={{ width, minWidth: 0 }}>
      <LinearProgress
        variant="determinate"
        value={Math.min(percent, 100)}
        color={getUsageColor(percent)}
        sx={{ height, borderRadius: height / 2 }}
      />
      {caption && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: '0.65rem', display: 'block', mt: 0.25, whiteSpace: 'nowrap' }}
        >
          {caption}
        </Typography>
      )}
    </Box>
  );

  return tooltip ? (
    <Tooltip title={tooltip} arrow>
      {bar}
    </Tooltip>
  ) : (
    bar
  );
}
