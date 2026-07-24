'use client';

import { useState, useEffect } from 'react';
import {
  Drawer, Box, Typography, Chip, IconButton, Tabs, Tab, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
} from '@mui/material';
import { Close as CloseIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { Pod, Cluster, PodDetail } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import StatusChip from '../shared/StatusChip';
import TabPanel from '../shared/TabPanel';
import PanelState from '../shared/PanelState';
import PodOverviewTab from './PodOverviewTab';
import PodEventsTab from './PodEventsTab';
import PodLogsTab from './PodLogsTab';

interface PodDetailDrawerProps {
  pod: Pod | null;
  cluster: Cluster;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function PodDetailDrawer({ pod, cluster, open, onClose, onDeleted }: PodDetailDrawerProps) {
  const [tab, setTab] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) setTab(0);
  }, [open, pod?.name]);

  const base = pod
    ? `/api/clusters/${encodeURIComponent(cluster.name)}/pods/${encodeURIComponent(pod.namespace)}/${encodeURIComponent(pod.name)}`
    : null;

  const detailQ = useFetch<{ success: boolean; detail: PodDetail }>(open && base ? `${base}/details` : null);
  const detail = detailQ.data?.detail;

  const handleDelete = async () => {
    if (!pod || !base) return;
    setDeleting(true);
    try {
      const res = await fetch(`${base}/delete`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to delete pod');
      }
      setDeleteOpen(false);
      onClose();
      onDeleted?.();
    } catch (err) {
      console.error('Delete pod failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      keepMounted={false}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 640, lg: 840 }, display: 'flex', flexDirection: 'column' } }}
    >
      {pod && (
        <>
          {/* Sticky header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}>
                {pod.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <Tooltip title="Delete pod" arrow>
                  <IconButton size="small" color="error" onClick={() => setDeleteOpen(true)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={onClose}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label={pod.namespace} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
              <StatusChip status={pod.status} />
              {(pod.restarts ?? 0) > 0 && (
                <Chip
                  label={`${pod.restarts} restarts`}
                  size="small"
                  color={(pod.restarts ?? 0) > 10 ? 'error' : 'warning'}
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontSize: '0.8rem' } }}>
              <Tab label="Overview" disableRipple />
              <Tab label="Events" disableRipple />
              <Tab label="Logs" disableRipple />
            </Tabs>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <TabPanel value={tab} index={0} sx={{ p: 2 }}>
              <PanelState loading={detailQ.loading} error={detailQ.error} onRetry={detailQ.refetch}>
                {detail && <PodOverviewTab detail={detail} />}
              </PanelState>
            </TabPanel>
            <TabPanel value={tab} index={1} sx={{ p: 2 }}>
              {tab === 1 && <PodEventsTab cluster={cluster} pod={pod} />}
            </TabPanel>
            <TabPanel value={tab} index={2} sx={{ flex: 1, minHeight: 0, display: tab === 2 ? 'flex' : 'none', flexDirection: 'column' }}>
              {tab === 2 && (
                <PodLogsTab
                  key={`${pod.namespace}/${pod.name}`}
                  cluster={cluster}
                  pod={pod}
                  containers={detail?.containers.map((c) => c.name)}
                />
              )}
            </TabPanel>
          </Box>
        </>
      )}

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete pod?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete <strong>{pod?.name}</strong> in namespace <strong>{pod?.namespace}</strong>.
            A controller may recreate it.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
