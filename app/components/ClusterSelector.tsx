'use client';

import { useState } from 'react';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Popover } from '@astryxdesign/core/Popover';
import { Item } from '@astryxdesign/core/Item';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Cloud, Pencil } from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEditClick = (cluster: Cluster) => {
    setEditingCluster(cluster);
    setDisplayName(cluster.displayName || '');
    setDialogOpen(true);
    setMenuOpen(false);
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

  const menuContent = (
    <VStack gap={0.5} width={320}>
      {clusters.map((cluster) => (
        <Item
          key={cluster.name}
          label={clusterLabel(cluster)}
          description={cluster.server}
          density="compact"
          isSelected={selectedCluster?.name === cluster.name}
          onClick={() => {
            onSelectCluster(cluster);
            setMenuOpen(false);
          }}
          startContent={<Icon icon={Cloud} size="sm" color="secondary" />}
          endContent={
            <IconButton
              label="Rename"
              tooltip="Rename"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(cluster);
              }}
              icon={<Icon icon={Pencil} size="xsm" />}
            />
          }
        />
      ))}
    </VStack>
  );

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

  // Collapsed: a single avatar that opens the cluster menu.
  if (collapsed) {
    const tooltipText = selectedCluster
      ? `${clusterLabel(selectedCluster)}${selectedCluster.server ? ` — ${selectedCluster.server}` : ''}`
      : 'Select cluster';
    return (
      <>
        <HStack hAlign="center">
          <Popover content={menuContent} isOpen={menuOpen} onOpenChange={setMenuOpen} label="Select cluster">
            <Tooltip content={tooltipText} placement="end">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                aria-label="Select cluster"
              >
                <Avatar name={selectedCluster ? clusterLabel(selectedCluster) : '?'} size="sm" />
              </button>
            </Tooltip>
          </Popover>
        </HStack>
        {dialog}
      </>
    );
  }

  // Expanded: a compact row showing the active cluster; click to open menu.
  return (
    <>
      <Popover content={menuContent} isOpen={menuOpen} onOpenChange={setMenuOpen} label="Select cluster">
        <Item
          label={selectedCluster ? clusterLabel(selectedCluster) : 'Select cluster'}
          description={selectedCluster?.server}
          density="compact"
          labelLines={1}
          descriptionLines={1}
          onClick={() => setMenuOpen(true)}
          startContent={<Icon icon={Cloud} size="sm" color="accent" />}
          endContent={<Icon icon="chevronDown" size="sm" color="secondary" />}
        />
      </Popover>
      {dialog}
    </>
  );
}
