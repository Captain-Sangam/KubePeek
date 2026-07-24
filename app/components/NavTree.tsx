'use client';

import { List, ListItemButton, ListItemIcon, ListItemText, Typography, Box, Divider, Tooltip } from '@mui/material';
import {
  WorkspacesOutlined, DnsOutlined, ViewInArOutlined, SailingOutlined, KeyOutlined,
} from '@mui/icons-material';
import { ActiveView } from '../types/kubernetes';
import { useTheme } from '../lib/ThemeProvider';

interface NavItem {
  view: ActiveView;
  label: string;
  icon: React.ReactNode;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Compute',
    items: [
      { view: 'nodeGroups', label: 'Node Groups', icon: <WorkspacesOutlined fontSize="small" /> },
      { view: 'nodes', label: 'Nodes', icon: <DnsOutlined fontSize="small" /> },
    ],
  },
  {
    label: 'Workloads',
    items: [
      { view: 'pods', label: 'Pods', icon: <ViewInArOutlined fontSize="small" /> },
      { view: 'helm', label: 'Helm', icon: <SailingOutlined fontSize="small" /> },
      { view: 'secrets', label: 'Secrets', icon: <KeyOutlined fontSize="small" /> },
    ],
  },
];

interface NavTreeProps {
  activeView: ActiveView | null;
  onNavigate: (view: ActiveView) => void;
  collapsed?: boolean;
}

export default function NavTree({ activeView, onNavigate, collapsed = false }: NavTreeProps) {
  const { mode } = useTheme();

  const selectedSx = {
    '&.Mui-selected': {
      backgroundColor: mode === 'light' ? 'rgba(25, 118, 210, 0.08)' : 'rgba(64, 148, 247, 0.16)',
      '&:hover': {
        backgroundColor: mode === 'light' ? 'rgba(25, 118, 210, 0.12)' : 'rgba(64, 148, 247, 0.24)',
      },
    },
    transition: 'background-color 0.15s ease-in-out',
  };

  if (collapsed) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        {NAV_SECTIONS.map((section, si) => (
          <Box key={section.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '100%' }}>
            {si > 0 && <Divider flexItem sx={{ my: 0.5 }} />}
            {section.items.map((item) => {
              const isSelected = activeView === item.view;
              return (
                <Tooltip key={item.view} title={item.label} placement="right" arrow>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => onNavigate(item.view)}
                    sx={{
                      justifyContent: 'center', borderRadius: 1.5, width: 40, height: 40, minWidth: 0, p: 0,
                      color: isSelected ? 'primary.main' : 'text.secondary',
                      ...selectedSx,
                    }}
                  >
                    {item.icon}
                  </ListItemButton>
                </Tooltip>
              );
            })}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <List sx={{ p: 0, overflowY: 'auto' }} dense>
      {NAV_SECTIONS.map((section) => (
        <Box key={section.label} sx={{ mb: 1 }}>
          <Typography
            variant="overline"
            sx={{ px: 1.5, color: 'text.secondary', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em' }}
          >
            {section.label}
          </Typography>
          {section.items.map((item) => {
            const isSelected = activeView === item.view;
            return (
              <ListItemButton
                key={item.view}
                selected={isSelected}
                onClick={() => onNavigate(item.view)}
                sx={{ borderRadius: 1.5, py: 0.75, px: 1.5, mb: 0.25, minHeight: 36, ...selectedSx }}
              >
                <ListItemIcon
                  sx={{ minWidth: 30, color: isSelected ? 'primary.main' : 'text.secondary' }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 600 : 400,
                    sx: { color: isSelected ? 'primary.main' : 'text.primary' },
                  }}
                />
              </ListItemButton>
            );
          })}
        </Box>
      ))}
    </List>
  );
}
