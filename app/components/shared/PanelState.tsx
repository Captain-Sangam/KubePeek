'use client';

import { ReactNode } from 'react';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';

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
      <HStack gap={1.5} hAlign="center" vAlign="center" paddingBlock={10}>
        <Spinner size="lg" />
        <Text type="supporting">Loading…</Text>
      </HStack>
    );
  }

  // Auth errors are surfaced by the ReconnectBanner instead; don't double-report.
  if (error === 'auth_expired') {
    return null;
  }

  if (error) {
    return (
      <VStack paddingBlock={6} paddingInline={4}>
        <Banner
          status="error"
          title={error}
          endContent={
            onRetry ? <Button label="Retry" size="sm" variant="ghost" onClick={onRetry} /> : undefined
          }
        />
      </VStack>
    );
  }

  if (empty) {
    return (
      <VStack paddingBlock={10}>
        <EmptyState title={emptyMessage} isCompact />
      </VStack>
    );
  }

  return <>{children}</>;
}
