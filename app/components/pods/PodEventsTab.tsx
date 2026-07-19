'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Box, Typography, IconButton, Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Pod, Cluster, PodEvent } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import StatusChip from '../shared/StatusChip';
import PanelState from '../shared/PanelState';

interface PodEventsTabProps {
  cluster: Cluster;
  pod: Pod;
}

export default function PodEventsTab({ cluster, pod }: PodEventsTabProps) {
  const url = `/api/clusters/${encodeURIComponent(cluster.name)}/pods/${encodeURIComponent(pod.namespace)}/${encodeURIComponent(pod.name)}/events`;
  const { data, loading, error, refetch } = useFetch<{ success: boolean; events: PodEvent[] }>(url);
  const events = data?.events || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
        <Tooltip title="Refresh events" arrow>
          <IconButton size="small" onClick={refetch}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <PanelState loading={loading} error={error} empty={!loading && events.length === 0} emptyMessage="No events for this pod" onRetry={refetch}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Message</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Count</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Age</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((e, i) => (
                <TableRow key={`${e.reason}-${i}`}>
                  <TableCell sx={{ fontSize: '0.72rem' }}>
                    <StatusChip status={e.type} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600 }}>{e.reason}</TableCell>
                  <TableCell sx={{ fontSize: '0.72rem', whiteSpace: 'normal' }}>{e.message}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.72rem' }}>{e.count}</TableCell>
                  <TableCell sx={{ fontSize: '0.72rem' }}>
                    <Tooltip title={`First: ${formatFullTimestamp(e.firstSeen)}\nLast: ${formatFullTimestamp(e.lastSeen)}`} arrow>
                      <span>{formatAge(e.lastSeen)}</span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {data && !data.success && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Could not load events.
          </Typography>
        )}
      </PanelState>
    </Box>
  );
}
