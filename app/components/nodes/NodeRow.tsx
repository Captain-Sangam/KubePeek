'use client';

import { useState } from 'react';
import {
  TableRow, TableCell, Box, Typography, Collapse, IconButton, Chip, Tooltip,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
} from '@mui/icons-material';
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

export default function NodeRow({ node, onNodeSelect }: NodeRowProps) {
  const [expanded, setExpanded] = useState(false);

  const cpuPct = usagePercent(node.usage.cpu, node.capacity.cpu);
  const memPct = usagePercent(node.usage.memory, node.capacity.memory);

  const cellSx = { py: 0.5, px: 1, fontSize: '0.75rem' };

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell sx={{ ...cellSx, width: nodeColumnWidths.name, maxWidth: nodeColumnWidths.name }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 'medium', cursor: 'pointer', fontSize: '0.75rem',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            onClick={() => onNodeSelect(node.name)}
            title={node.name}
          >
            {node.name}
          </Typography>
        </TableCell>
        <TableCell sx={{ ...cellSx, width: nodeColumnWidths.instanceType, maxWidth: nodeColumnWidths.instanceType, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={node.instanceType || 'Unknown'}>
          {node.instanceType || 'Unknown'}
        </TableCell>
        <TableCell align="right" sx={{ ...cellSx, width: nodeColumnWidths.cpu }}>{node.capacity.cpu}</TableCell>
        <TableCell align="right" sx={{ ...cellSx, width: nodeColumnWidths.memory }}>{node.capacity.memory}</TableCell>
        <TableCell sx={{ py: 0.5, px: 1, width: nodeColumnWidths.cpuUtil }}>
          <UsageBar
            percent={cpuPct}
            caption={`${cpuPct.toFixed(0)}%`}
            tooltip={`CPU ${node.usage.cpu} of ${node.capacity.cpu}`}
            height={6}
          />
        </TableCell>
        <TableCell sx={{ py: 0.5, px: 1, width: nodeColumnWidths.memUtil }}>
          <UsageBar
            percent={memPct}
            caption={`${memPct.toFixed(0)}%`}
            tooltip={`Memory ${node.usage.memory} of ${node.capacity.memory}`}
            height={6}
          />
        </TableCell>
        <TableCell align="right" sx={{ ...cellSx, width: nodeColumnWidths.pods }}>{node.pods}</TableCell>
        <TableCell sx={{ ...cellSx, width: nodeColumnWidths.started }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={formatFullTimestamp(node.createdAt)} arrow>
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                {formatAge(node.createdAt)}
              </Typography>
            </Tooltip>
            <IconButton aria-label="expand row" size="small" onClick={() => setExpanded(!expanded)} sx={{ p: 0.25 }}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ m: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Node Tags</Typography>
              <Box sx={{ mb: 1 }}>
                {node.tags && Object.entries(node.tags).length > 0 ? (
                  Object.entries(node.tags).map(([key, value]) => (
                    <Tooltip key={key} title={`${key}: ${value}`}>
                      <Chip label={`${key}: ${value}`} size="small" sx={{ m: 0.5, fontSize: '0.7rem' }} />
                    </Tooltip>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No tags available</Typography>
                )}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
