'use client';

import { Box, Typography, Autocomplete, TextField, Divider } from '@mui/material';
import { FilterAltOutlined } from '@mui/icons-material';
import PanelState from './PanelState';

interface ScopePickerProps {
  resourceLabel: string; // "pods" | "Helm releases" | "secrets"
  namespaces: string[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectNamespace: (ns: string) => void;
  // Pods view only: also allow scoping by node.
  nodes?: string[];
  onSelectNode?: (node: string) => void;
}

// The empty-state gate shown before a namespace/node scope is chosen. Nothing
// is fetched until the user picks a scope here.
export default function ScopePicker({
  resourceLabel,
  namespaces,
  loading,
  error,
  onRetry,
  onSelectNamespace,
  nodes,
  onSelectNode,
}: ScopePickerProps) {
  return (
    <PanelState loading={loading} error={error} onRetry={onRetry}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, px: 2, gap: 2, maxWidth: 420, mx: 'auto' }}>
        <FilterAltOutlined sx={{ fontSize: 40, color: 'text.disabled' }} />
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Select a namespace to view {resourceLabel}
        </Typography>

        <Autocomplete
          options={namespaces}
          fullWidth
          size="small"
          onChange={(_, value) => value && onSelectNamespace(value)}
          renderInput={(params) => <TextField {...params} label="Namespace" placeholder="Choose a namespace" />}
        />

        {nodes && onSelectNode && (
          <>
            <Divider flexItem sx={{ '&::before, &::after': { borderColor: 'divider' } }}>
              <Typography variant="caption" color="text.disabled">or</Typography>
            </Divider>
            <Autocomplete
              options={nodes}
              fullWidth
              size="small"
              onChange={(_, value) => value && onSelectNode(value)}
              renderInput={(params) => <TextField {...params} label="Node" placeholder="Choose a node" />}
            />
          </>
        )}
      </Box>
    </PanelState>
  );
}
