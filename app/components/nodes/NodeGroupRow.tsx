'use client';

import { useState } from 'react';
import {
  TableRow, TableCell, Box, Typography, Collapse, IconButton, Tooltip,
  Table, TableHead, TableBody, TableContainer,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
} from '@mui/icons-material';
import { NodeGroupInfo } from '../../types/kubernetes';
import { parseNumericValue, formatAge, formatFullTimestamp } from '../../lib/format';
import { nodeColumnWidths } from './NodeRow';
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

export default function NodeGroupRow({ nodeGroup, onNodeSelect, onNodeGroupSelect }: NodeGroupRowProps) {
  const [expanded, setExpanded] = useState(false);

  const cpuPct = nodeGroup.cpuPercentage ?? usagePercent(nodeGroup.usedCpu, nodeGroup.totalCpu);
  const memPct = nodeGroup.memPercentage ?? usagePercent(nodeGroup.usedMemory, nodeGroup.totalMemory);

  const cellSx = { py: 0.75, px: 1, fontSize: '0.75rem' };
  const innerCellSx = { py: 0.5, px: 1, fontSize: '0.72rem' };

  return (
    <>
      <TableRow sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
        <TableCell sx={{ ...cellSx, width: nodeColumnWidths.name, maxWidth: nodeColumnWidths.name }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              sx={{ mr: 1, flexShrink: 0 }}
            >
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
              onClick={() => onNodeGroupSelect(nodeGroup.name)}
              title={`${nodeGroup.name} — click to filter pods`}
            >
              {nodeGroup.name}
            </Typography>
          </Box>
        </TableCell>
        <TableCell sx={{ ...cellSx, width: nodeColumnWidths.instanceType }}>
          {nodeGroup.nodes.length === 1 ? '(1 node)' : `(${nodeGroup.nodes.length} nodes)`}
        </TableCell>
        <TableCell align="right" sx={{ ...cellSx, width: nodeColumnWidths.cpu }}>{nodeGroup.totalCpu}</TableCell>
        <TableCell align="right" sx={{ ...cellSx, width: nodeColumnWidths.memory }}>{nodeGroup.totalMemory}</TableCell>
        <TableCell sx={{ py: 0.75, px: 1, width: nodeColumnWidths.cpuUtil }}>
          <UsageBar percent={cpuPct} caption={`${cpuPct.toFixed(0)}%`} tooltip={`CPU ${nodeGroup.usedCpu} of ${nodeGroup.totalCpu}`} height={6} />
        </TableCell>
        <TableCell sx={{ py: 0.75, px: 1, width: nodeColumnWidths.memUtil }}>
          <UsageBar percent={memPct} caption={`${memPct.toFixed(0)}%`} tooltip={`Memory ${nodeGroup.usedMemory} of ${nodeGroup.totalMemory}`} height={6} />
        </TableCell>
        <TableCell align="right" sx={{ ...cellSx, width: nodeColumnWidths.pods }}>{nodeGroup.podsCount}</TableCell>
        <TableCell sx={{ ...cellSx, width: nodeColumnWidths.started }}>
          <Tooltip title={formatFullTimestamp(nodeGroup.oldestNodeCreatedAt)} arrow>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              {formatAge(nodeGroup.oldestNodeCreatedAt)}
            </Typography>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ m: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Nodes in Group</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600 }}>Instance Type</TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, minWidth: 120 }}>CPU</TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, minWidth: 120 }}>Memory</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>Pods</TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600 }}>Started</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {nodeGroup.nodes.map((node) => {
                      const nCpu = usagePercent(node.usage.cpu, node.capacity.cpu);
                      const nMem = usagePercent(node.usage.memory, node.capacity.memory);
                      return (
                        <TableRow key={node.name}>
                          <TableCell
                            sx={{ ...innerCellSx, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            onClick={() => onNodeSelect(node.name)}
                          >
                            {node.name}
                          </TableCell>
                          <TableCell sx={innerCellSx}>{node.instanceType || 'Unknown'}</TableCell>
                          <TableCell sx={innerCellSx}>
                            <UsageBar percent={nCpu} caption={`${node.usage.cpu} / ${node.capacity.cpu} cores`} height={5} />
                          </TableCell>
                          <TableCell sx={innerCellSx}>
                            <UsageBar percent={nMem} caption={`${node.usage.memory} / ${node.capacity.memory}`} height={5} />
                          </TableCell>
                          <TableCell align="right" sx={innerCellSx}>{node.pods}</TableCell>
                          <TableCell sx={innerCellSx}>
                            <Tooltip title={formatFullTimestamp(node.createdAt)} arrow>
                              <span>{formatAge(node.createdAt)}</span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
