'use client';

import { Box, Divider, IconButton, Tooltip } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end',
          mb: 1,
        }}
      >
        <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right" arrow>
          <IconButton size="small" onClick={onToggleCollapse} sx={{ p: 0.5 }}>
            {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      <ClusterSelector
        clusters={clusters}
        selectedCluster={selectedCluster}
        onSelectCluster={onSelectCluster}
        loading={loading}
        collapsed={collapsed}
      />

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <NavTree activeView={activeView} onNavigate={onNavigate} collapsed={collapsed} />
      </Box>
    </Box>
  );
}
