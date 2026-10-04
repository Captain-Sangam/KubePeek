'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { Grid } from '@astryxdesign/core/Grid';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { SecretSummary, SecretDetail, Cluster } from '../../types/kubernetes';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { useFetch } from '../../hooks/useFetch';
import CopyButton from '../shared/CopyButton';

interface SecretDetailDialogProps {
  cluster: Cluster;
  secret: SecretSummary | null;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function SecretDetailDialog({ cluster, secret, open, onClose, onDeleted }: SecretDetailDialogProps) {
  const [requestedTarget, setRequestedTarget] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [keyQuery, setKeyQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  const target = secret
    ? `/api/clusters/${encodeURIComponent(cluster.name)}/secrets/${encodeURIComponent(secret.namespace)}/${encodeURIComponent(secret.name)}`
    : null;
  // Decoded values are fetched only after an explicit reveal, never polled.
  const detailQ = useFetch<{ success: boolean; secret: SecretDetail }>(
    open && requestedTarget === target ? target : null,
    { refreshMs: 0, reportFreshness: false }
  );
  const detail = detailQ.data?.secret;
  const error = mutationError || detailQ.error;

  // Reset when the dialog target changes.
  useEffect(() => {
    setRequestedTarget(null);
    setRevealed(false);
    setMutationError(null);
    setKeyQuery('');
  }, [target, open]);

  const toggleRevealAll = () => {
    if (!revealed) {
      setRequestedTarget(target);
      if (detailQ.error) detailQ.refetch();
    }
    setRevealed((prev) => !prev);
  };

  const handleDelete = async () => {
    if (!secret) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/clusters/${encodeURIComponent(cluster.name)}/secrets/${encodeURIComponent(secret.namespace)}/${encodeURIComponent(secret.name)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete secret');
      setDeleteOpen(false);
      onClose();
      onDeleted?.();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to delete secret');
    } finally {
      setDeleting(false);
    }
  };

  if (!secret) return null;

  const q = keyQuery.toLowerCase();
  const visibleKeys = keyQuery
    ? secret.keys.filter(
        (k) =>
          k.toLowerCase().includes(q) ||
          (revealed && (detail?.data[k]?.value ?? '').toLowerCase().includes(q))
      )
    : secret.keys;

  return (
    <>
      <Dialog
        isOpen={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
        width="min(900px, calc(100vw - 64px))"
        maxHeight="85vh"
      >
        <DialogHeader
          title={secret.name}
          onOpenChange={(isOpen) => {
            if (!isOpen) onClose();
          }}
          endContent={
            <HStack gap={0.5} vAlign="center">
              {secret.keys.length > 0 && (
                <Button
                  label={revealed ? 'Hide all' : 'Reveal all'}
                  size="sm"
                  variant="ghost"
                  icon={<Icon icon={revealed ? EyeOff : Eye} size="sm" />}
                  isLoading={detailQ.loading && !detail}
                  onClick={toggleRevealAll}
                />
              )}
              <IconButton
                label="Delete secret"
                tooltip="Delete secret"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                icon={<Icon icon={Trash2} size="sm" color="error" />}
              />
            </HStack>
          }
        />
        <VStack gap={1.5} padding={4} style={{ overflow: 'auto', minHeight: 0 }}>
          <HStack gap={1} wrap="wrap">
            <Token label={secret.namespace} size="sm" />
            <Token label={secret.type} size="sm" />
          </HStack>
          {secret.keys.length > 0 && (
            <TextInput
              label="Search keys"
              isLabelHidden
              size="sm"
              placeholder="Search keys..."
              startIcon="search"
              ref={searchRef}
              value={keyQuery}
              onChange={(value) => setKeyQuery(value)}
            />
          )}
          {error && (
            <Text type="body" size="sm" as="p" style={{ color: 'var(--color-error)' }}>
              {error}
            </Text>
          )}
          {secret.keys.length === 0 && <Text type="supporting" as="p">This secret has no data keys.</Text>}
          {secret.keys.length > 0 && visibleKeys.length === 0 && (
            <Text type="supporting" as="p">No keys match</Text>
          )}
          {/* Responsive grid: long-valued secrets (30+ keys) fill horizontal space
              instead of one tall list. */}
          <Grid columns={{ minWidth: 240 }} gap={3} align="start">
            {visibleKeys.map((key) => {
              const entry = detail?.data[key];
              return (
                <VStack key={key} gap={0.5} style={{ minWidth: 0 }}>
                  <HStack gap={0.5} vAlign="center" wrap="nowrap">
                    <StackItem size="fill" style={{ minWidth: 0 }}>
                      <Text type="code" size="2xs" weight="semibold" maxLines={1}>
                        {key}
                      </Text>
                    </StackItem>
                    {entry?.encoding === 'base64' && <Token label="binary" size="sm" />}
                    <CopyButton value={entry?.value ?? ''} disabled={!entry} title="Copy value" />
                  </HStack>
                  <Text
                    type="code"
                    size="2xs"
                    as="div"
                    style={{
                      padding: 'var(--spacing-2)',
                      borderRadius: 'var(--radius-inner)',
                      background: 'var(--color-background-muted)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: 160,
                      overflow: 'auto',
                    }}
                  >
                    {revealed && entry ? entry.value : '••••••••'}
                  </Text>
                </VStack>
              );
            })}
          </Grid>
        </VStack>
      </Dialog>

      <AlertDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete secret?"
        description={`This will permanently delete ${secret.name} in namespace ${secret.namespace}. This cannot be undone.`}
        actionLabel="Delete"
        isActionLoading={deleting}
        onAction={handleDelete}
      />
    </>
  );
}
