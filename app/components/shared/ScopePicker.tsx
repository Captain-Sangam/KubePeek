'use client';

import { useMemo } from 'react';
import { VStack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Divider } from '@astryxdesign/core/Divider';
import { Typeahead, createStaticSource } from '@astryxdesign/core/Typeahead';
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

const toItems = (names: string[]) => names.map((name) => ({ id: name, label: name }));

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
  const namespaceSource = useMemo(() => createStaticSource(toItems(namespaces)), [namespaces]);
  const nodeSource = useMemo(() => createStaticSource(toItems(nodes ?? [])), [nodes]);

  return (
    <PanelState loading={loading} error={error} onRetry={onRetry}>
      <Center axis="horizontal">
        <VStack gap={2} align="stretch" maxWidth={420} width="100%" paddingBlock={10} paddingInline={4}>
          <VStack gap={2} align="center">
            <Icon icon="funnel" size="lg" color="disabled" />
            <Text type="body" color="secondary" justify="center" as="p">
              Select a namespace to view {resourceLabel}
            </Text>
          </VStack>

          <Typeahead
            label="Namespace"
            isLabelHidden
            placeholder="Choose a namespace"
            searchSource={namespaceSource}
            value={null}
            onChange={(item) => item && onSelectNamespace(item.label)}
            hasEntriesOnFocus
            maxMenuItems={Math.max(namespaces.length, 10)}
          />

          {nodes && onSelectNode && (
            <>
              <Divider label="or" />
              <Typeahead
                label="Node"
                isLabelHidden
                placeholder="Choose a node"
                searchSource={nodeSource}
                value={null}
                onChange={(item) => item && onSelectNode(item.label)}
                hasEntriesOnFocus
                maxMenuItems={Math.max(nodes?.length ?? 0, 10)}
              />
            </>
          )}
        </VStack>
      </Center>
    </PanelState>
  );
}
