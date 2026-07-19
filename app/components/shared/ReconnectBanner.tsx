'use client';

import { Alert, Button } from '@mui/material';
import { Cluster } from '../../types/kubernetes';

interface ReconnectBannerProps {
  cluster: Cluster;
  onReconnect: () => void;
}

// Shown when a cluster request failed with an expired credential. The app
// can't run `aws sso login` itself, so the message tells the user to refresh
// their session externally; Reconnect then refetches (which re-runs
// `aws eks get-token`).
export default function ReconnectBanner({ cluster, onReconnect }: ReconnectBannerProps) {
  return (
    <Alert
      severity="warning"
      sx={{ mb: 1.5, fontSize: '0.8rem', borderRadius: '8px' }}
      action={
        <Button color="inherit" size="small" onClick={onReconnect}>
          Reconnect
        </Button>
      }
    >
      Authentication to <strong>{cluster.displayName || cluster.name}</strong> expired. Refresh your
      AWS SSO/VPN session, then click Reconnect.
    </Alert>
  );
}
