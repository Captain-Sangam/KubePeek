'use client';

import { HStack, VStack, StackItem } from '@astryxdesign/core/Stack';
import { Divider } from '@astryxdesign/core/Divider';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { Cluster, ActiveView } from '../types/kubernetes';
import ClusterSelector from './ClusterSelector';
import NavTree from './NavTree';

interface SidebarProps {
  clusters: Cluster[];
  selectedCluster: Cluster | null;
  onSelectCluster: (cluster: Cluster) => void;
  loading: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeView: ActiveView | null;
  onNavigate: (view: ActiveView) => void;
}

export default function Sidebar({
  clusters,
  selectedCluster,
  onSelectCluster,
  loading,
  collapsed,
  onToggleCollapse,
  activeView,
  onNavigate,
}: SidebarProps) {
  return (
    <VStack gap={1.5} height="100%">
      <HStack hAlign={collapsed ? 'center' : 'end'}>
        <IconButton
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          tooltip={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          icon={<Icon icon={collapsed ? 'chevronRight' : 'chevronLeft'} size="sm" />}
        />
      </HStack>

      <ClusterSelector
        clusters={clusters}
        selectedCluster={selectedCluster}
        onSelectCluster={onSelectCluster}
        loading={loading}
        collapsed={collapsed}
      />

      <Divider />

      <StackItem size="fill">
        <VStack height="100%" isScrollable>
          <NavTree activeView={activeView} onNavigate={onNavigate} collapsed={collapsed} />
        </VStack>
      </StackItem>
    </VStack>
  );
}
