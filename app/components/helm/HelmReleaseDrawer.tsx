'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { HStack } from '@astryxdesign/core/Stack';
import { Token } from '@astryxdesign/core/Token';
import { TextInput } from '@astryxdesign/core/TextInput';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import { HelmReleaseSummary, HelmReleaseDetail, Cluster } from '../../types/kubernetes';
import { useFetch } from '../../hooks/useFetch';
import { useFindShortcut } from '../../hooks/useFindShortcut';
import { formatAge, formatFullTimestamp } from '../../lib/format';
import TabPanel from '../shared/TabPanel';
import PanelState from '../shared/PanelState';
import StatusChip from '../shared/StatusChip';
import CopyButton from '../shared/CopyButton';

type HistoryRow = HelmReleaseDetail['history'][number] & Record<string, unknown>;

interface HelmReleaseDrawerProps {
  cluster: Cluster;
  release: HelmReleaseSummary | null;
  open: boolean;
  onClose: () => void;
}

// Render an object as indented YAML-ish text (no dependency).
function toYaml(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map((item) => `${pad}- ${toYaml(item, indent + 1).trimStart()}`).join('\n');
  }
  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) return '{}';
  return entries
    .map(([k, v]) => {
      if (v && typeof v === 'object' && Object.keys(v).length > 0) {
        return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
      }
      return `${pad}${k}: ${toYaml(v, indent + 1)}`;
    })
    .join('\n');
}

// Copy always grabs the full text even when the view is grep-filtered.
function YamlBlock({ text, copyText }: { text: string; copyText?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}>
        <CopyButton value={copyText ?? text} title="Copy" />
      </div>
      <CodeBlock code={text || '(empty)'} language="yaml" hasLanguageLabel={false} hasCopyButton={false} size="sm" width="100%" />
    </div>
  );
}

export default function HelmReleaseDrawer({ cluster, release, open, onClose }: HelmReleaseDrawerProps) {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useFindShortcut(searchRef);

  useEffect(() => {
    if (open) {
      setTab(0);
      setSearch('');
    }
  }, [open, release?.name]);

  // Grep-style line filter for the Values/Manifest code blocks.
  const filterLines = (text: string) => {
    if (!search) return text;
    const q = search.toLowerCase();
    return text.split('\n').filter((l) => l.toLowerCase().includes(q)).join('\n') || '(no matching lines)';
  };

  const url = open && release
    ? `/api/clusters/${encodeURIComponent(cluster.name)}/helm/${encodeURIComponent(release.namespace)}/${encodeURIComponent(release.name)}`
    : null;
  const { data, loading, error, refetch } = useFetch<{ success: boolean; release: HelmReleaseDetail }>(url);
  const detail = data?.release;

  return (
    // Right-edge Dialog stands in for the old MUI Drawer (astryx has none).
    <Dialog
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      width="min(960px, 100vw)"
      maxHeight="100vh"
      position={{ top: 0, right: 0, bottom: 0 }}
      style={{ height: '100vh' }}
    >
      {release && (
        <>
          <DialogHeader
            title={release.name}
            onOpenChange={(isOpen) => {
              if (!isOpen) onClose();
            }}
            hasDivider={false}
          />
          <HStack gap={1} wrap="wrap" vAlign="center" paddingInline={4} paddingBlock={1} style={{ flexShrink: 0 }}>
            <Token label={release.namespace} size="sm" />
            <StatusChip status={release.status} />
            <Token label={`rev ${release.revision}`} size="sm" />
            <Token label={`${release.chart}-${release.chartVersion}`} size="sm" />
          </HStack>

          <div style={{ padding: '0 var(--spacing-4)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
            <TabList value={String(tab)} onChange={(v) => setTab(Number(v))} size="sm">
              <Tab value="0" label="Values" />
              <Tab value="1" label="Manifest" />
              <Tab value="2" label="History" />
            </TabList>
          </div>

          {(tab === 0 || tab === 1) && (
            <div style={{ padding: 'var(--spacing-3) var(--spacing-4) 0', flexShrink: 0 }}>
              <TextInput
                label="Search"
                isLabelHidden
                size="sm"
                placeholder="Search..."
                startIcon="search"
                ref={searchRef}
                value={search}
                onChange={(value) => setSearch(value)}
              />
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--spacing-4)' }}>
            <PanelState loading={loading} error={error} onRetry={refetch}>
              {detail && (
                <>
                  <TabPanel value={tab} index={0}>
                    <YamlBlock text={filterLines(toYaml(detail.values))} copyText={toYaml(detail.values)} />
                  </TabPanel>
                  <TabPanel value={tab} index={1}>
                    <YamlBlock text={filterLines(detail.manifest)} copyText={detail.manifest} />
                  </TabPanel>
                  <TabPanel value={tab} index={2}>
                    <Table<HistoryRow>
                      data={detail.history as HistoryRow[]}
                      idKey="revision"
                      density="compact"
                      columns={[
                        { key: 'revision', header: 'Revision', width: pixel(80) },
                        {
                          key: 'updated', header: 'Updated', width: pixel(90),
                          renderCell: (h) => <span title={formatFullTimestamp(h.updated)}>{formatAge(h.updated)}</span>,
                        },
                        { key: 'status', header: 'Status', width: pixel(110), renderCell: (h) => <StatusChip status={h.status} /> },
                        { key: 'chartVersion', header: 'Chart', width: proportional(1) },
                        { key: 'appVersion', header: 'App', width: proportional(1) },
                        { key: 'description', header: 'Description', width: proportional(2) },
                      ]}
                    />
                  </TabPanel>
                </>
              )}
            </PanelState>
          </div>
        </>
      )}
    </Dialog>
  );
}
