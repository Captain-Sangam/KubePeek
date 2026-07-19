'use client';

import { Box, TextField, Link, Typography, ButtonBase } from '@mui/material';

interface LogFieldsSidebarProps {
  discoveredKeys: string[];
  selectedKeys: Set<string>;
  keySearch: string;
  onKeySearchChange: (value: string) => void;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  filteredKeys: string[];
}

function KeyRow({ keyName, onClick, selected }: { keyName: string; onClick: () => void; selected: boolean }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        width: '100%',
        justifyContent: 'flex-start',
        px: 1,
        py: 0.25,
        fontFamily: 'monospace',
        fontSize: '0.7rem',
        textAlign: 'left',
        color: selected ? 'primary.main' : 'text.primary',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
        {keyName}
      </Box>
    </ButtonBase>
  );
}

export default function LogFieldsSidebar({
  discoveredKeys,
  selectedKeys,
  keySearch,
  onKeySearchChange,
  onToggle,
  onSelectAll,
  onClearAll,
  filteredKeys,
}: LogFieldsSidebarProps) {
  const selected = filteredKeys.filter((k) => selectedKeys.has(k));
  const available = filteredKeys.filter((k) => !selectedKeys.has(k));

  return (
    <Box sx={{ width: 210, flexShrink: 0, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Filter keys..."
          value={keySearch}
          onChange={(e) => onKeySearchChange(e.target.value)}
          InputProps={{ style: { fontSize: '0.72rem', height: 28 } }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {selectedKeys.size}/{discoveredKeys.length}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Link component="button" underline="hover" sx={{ fontSize: '0.65rem' }} onClick={onSelectAll}>
              All
            </Link>
            <Link component="button" underline="hover" sx={{ fontSize: '0.65rem' }} onClick={onClearAll}>
              None
            </Link>
          </Box>
        </Box>
      </Box>

      {selected.length > 0 && (
        <Box sx={{ maxHeight: '40%', overflowY: 'auto', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1, pt: 0.5, display: 'block', fontSize: '0.62rem', fontWeight: 600 }}>
            SELECTED ({selected.length})
          </Typography>
          {selected.map((k) => (
            <KeyRow key={k} keyName={k} onClick={() => onToggle(k)} selected />
          ))}
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1, pt: 0.5, display: 'block', fontSize: '0.62rem', fontWeight: 600 }}>
          AVAILABLE ({available.length})
        </Typography>
        {available.map((k) => (
          <KeyRow key={k} keyName={k} onClick={() => onToggle(k)} selected={false} />
        ))}
      </Box>
    </Box>
  );
}
