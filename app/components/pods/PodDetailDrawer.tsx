'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { HStack } from '@astryxdesign/core/Stack';
import { Token } from '@astryxdesign/core/Token';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { Trash2 } from 'lucide-react';
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
    <>
      {/* Right-edge Dialog stands in for the old MUI Drawer (astryx has none). */}
      <Dialog
        isOpen={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
        width="min(840px, 100vw)"
        maxHeight="100vh"
        position={{ top: 0, right: 0, bottom: 0 }}
        style={{ height: '100vh' }}
      >
        {pod && (
          <>
            <DialogHeader
              title={pod.name}
              onOpenChange={(isOpen) => {
                if (!isOpen) onClose();
              }}
              hasDivider={false}
              endContent={
                <IconButton
                  label="Delete pod"
                  tooltip="Delete pod"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  icon={<Icon icon={Trash2} size="sm" color="error" />}
                />
              }
            />
            <HStack gap={1} wrap="wrap" vAlign="center" paddingInline={4} paddingBlock={1} style={{ flexShrink: 0 }}>
              <Token label={pod.namespace} size="sm" />
              <StatusChip status={pod.status} />
              {(pod.restarts ?? 0) > 0 && (
                <Token
                  label={`${pod.restarts} restarts`}
                  size="sm"
                  color={(pod.restarts ?? 0) > 10 ? 'red' : 'yellow'}
                />
              )}
            </HStack>

            <div style={{ padding: '0 var(--spacing-4)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
              <TabList value={String(tab)} onChange={(v) => setTab(Number(v))} size="sm">
                <Tab value="0" label="Overview" />
                <Tab value="1" label="Events" />
                <Tab value="2" label="Logs" />
              </TabList>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <TabPanel value={tab} index={0} style={{ padding: 'var(--spacing-4)' }}>
                <PanelState loading={detailQ.loading} error={detailQ.error} onRetry={detailQ.refetch}>
                  {detail && <PodOverviewTab detail={detail} />}
                </PanelState>
              </TabPanel>
              <TabPanel value={tab} index={1} style={{ padding: 'var(--spacing-4)' }}>
                {tab === 1 && <PodEventsTab cluster={cluster} pod={pod} />}
              </TabPanel>
              <TabPanel value={tab} index={2} style={{ flex: 1, minHeight: 0, display: tab === 2 ? 'flex' : 'none', flexDirection: 'column' }}>
                {tab === 2 && (
                  <PodLogsTab
                    key={`${pod.namespace}/${pod.name}`}
                    cluster={cluster}
                    pod={pod}
                    containers={detail?.containers.map((c) => c.name)}
                  />
                )}
              </TabPanel>
            </div>
          </>
        )}
      </Dialog>

      <AlertDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete pod?"
        description={`This will delete ${pod?.name} in namespace ${pod?.namespace}. A controller may recreate it.`}
        actionLabel="Delete"
        isActionLoading={deleting}
        onAction={handleDelete}
      />
    </>
  );
}
