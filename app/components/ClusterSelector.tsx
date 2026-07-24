'use client';

import { useState } from 'react';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Spinner } from '@astryxdesign/core/Spinner';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { Icon } from '@astryxdesign/core/Icon';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Cloud } from 'lucide-react';
import { Cluster } from '../types/kubernetes';
import { saveClusterDisplayName } from '../lib/kubernetes-client';

interface ClusterSelectorProps {
  clusters: Cluster[];
  selectedCluster: Cluster | null;
  onSelectCluster: (cluster: Cluster) => void;
  loading: boolean;
  collapsed?: boolean;
}

// Format cluster name to be more readable.
const formatClusterName = (name: string): string => {
  let formatted = name.replace(/[_-]/g, ' ');
  formatted = formatted.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
  return formatted;
};

const clusterLabel = (c: Cluster): string => c.displayName || formatClusterName(c.name);

export default function ClusterSelector({
  clusters,
  selectedCluster,
  onSelectCluster,
  loading,
  collapsed = false,
}: ClusterSelectorProps) {
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEditClick = (cluster: Cluster) => {
    setEditingCluster(cluster);
    setDisplayName(cluster.displayName || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingCluster) return;
    try {
      saveClusterDisplayName(editingCluster.name, displayName);
      await fetch('/api/clusters/display-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterName: editingCluster.name, displayName }),
      });
      if (selectedCluster && selectedCluster.name === editingCluster.name) {
        onSelectCluster({ ...editingCluster, displayName });
      }
      setDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error saving display name:', error);
    }
  };

  const handleClear = async () => {
    if (!editingCluster) return;
    setDisplayName('');
    saveClusterDisplayName(editingCluster.name, '');
    await fetch('/api/clusters/display-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clusterName: editingCluster.name, displayName: '' }),
    });
    setDialogOpen(false);
    window.location.reload();
  };

  if (loading) {
    return (
      <HStack hAlign="center" padding={2}>
        <Spinner size="lg" />
      </HStack>
    );
  }

  if (clusters.length === 0) {
    return (
      <VStack padding={2} align="center">
        <Text type="supporting">No clusters found</Text>
      </VStack>
    );
  }

  const items = [
    ...clusters.map((cluster) => ({
      label: clusterLabel(cluster),
      icon: selectedCluster?.name === cluster.name ? <Icon icon="check" size="sm" /> : undefined,
      onClick: () => onSelectCluster(cluster),
    })),
    { type: 'divider' as const },
    ...(selectedCluster
      ? [{ label: `Rename "${clusterLabel(selectedCluster)}"…`, onClick: () => handleEditClick(selectedCluster) }]
      : []),
  ];

  const dialog = (
    <Dialog isOpen={dialogOpen} onOpenChange={setDialogOpen} width={400} purpose="form">
      <DialogHeader title="Rename Cluster" onOpenChange={setDialogOpen} />
      <VStack gap={2} padding={4}>
        <Text type="supporting" as="p">
          Original name: {editingCluster?.name}
        </Text>
        <TextInput
          label="Display Name"
          value={displayName}
          onChange={(value) => setDisplayName(value)}
          placeholder="Enter a friendly name for this cluster"
          hasAutoFocus
        />
        <HStack gap={1} hAlign="end">
          <Button label="Cancel" variant="ghost" onClick={() => setDialogOpen(false)} />
          {editingCluster?.displayName && (
            <Button label="Clear" variant="destructive" onClick={handleClear} />
          )}
          <Button label="Save" variant="primary" onClick={handleSave} />
        </HStack>
      </VStack>
    </Dialog>
  );

  return (
    <>
      <DropdownMenu
        items={items}
        hasChevron={!collapsed}
        menuWidth={260}
        button={
          collapsed
            ? {
                label: selectedCluster ? clusterLabel(selectedCluster) : 'Select cluster',
                isIconOnly: true,
                icon: <Icon icon={Cloud} size="sm" />,
                variant: 'ghost',
                size: 'sm',
              }
            : {
                label: selectedCluster ? clusterLabel(selectedCluster) : 'Select cluster',
                icon: <Icon icon={Cloud} size="sm" color="accent" />,
                variant: 'secondary',
                size: 'sm',
                width: '100%',
              }
        }
      />
      {dialog}
    </>
  );
}
