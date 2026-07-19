'use client';

import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface PanelStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  children?: ReactNode;
}

// Renders loading / error / empty presenters, or the children when ready.
export default function PanelState({
  loading,
  error,
  empty,
  emptyMessage = 'Nothing to show',
  onRetry,
  children,
}: PanelStateProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6, gap: 1.5 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 3, px: 2 }}>
        <Alert
          severity="error"
          action={
            onRetry ? (
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (empty) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
