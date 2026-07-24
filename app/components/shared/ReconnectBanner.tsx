'use client';

import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
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
    <div style={{ marginBottom: 'var(--spacing-3)' }}>
      <Banner
        status="warning"
        title={
          <>
            Authentication to <strong>{cluster.displayName || cluster.name}</strong> expired. Refresh
            your AWS SSO/VPN session, then click Reconnect.
          </>
        }
        endContent={<Button label="Reconnect" size="sm" onClick={onReconnect} />}
      />
    </div>
  );
}
