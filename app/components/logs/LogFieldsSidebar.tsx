'use client';

import { HStack, VStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Link } from '@astryxdesign/core/Link';
import { Item } from '@astryxdesign/core/Item';

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

const GroupHeading = ({ children }: { children: React.ReactNode }) => (
  <Text
    type="label"
    size="2xs"
    color="secondary"
    weight="semibold"
    as="p"
    style={{ padding: 'var(--spacing-1) var(--spacing-2) 0' }}
  >
    {children}
  </Text>
);

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
    <VStack width={210} style={{ flexShrink: 0, borderRight: '1px solid var(--color-border)', minHeight: 0 }}>
      <VStack gap={1} padding={2} style={{ borderBottom: '1px solid var(--color-border)' }}>
        <TextInput
          label="Filter keys"
          isLabelHidden
          size="sm"
          placeholder="Filter keys..."
          value={keySearch}
          onChange={(value) => onKeySearchChange(value)}
        />
        <HStack gap={1} vAlign="center">
          <StackItem size="fill">
            <Text type="supporting" size="2xs">
              {selectedKeys.size}/{discoveredKeys.length}
            </Text>
          </StackItem>
          <Link size="2xs" onClick={onSelectAll}>All</Link>
          <Link size="2xs" onClick={onClearAll}>None</Link>
        </HStack>
      </VStack>

      {selected.length > 0 && (
        <VStack style={{ maxHeight: '40%', overflowY: 'auto', borderBottom: '1px solid var(--color-border)' }}>
          <GroupHeading>SELECTED ({selected.length})</GroupHeading>
          {selected.map((k) => (
            <Item key={k} label={k} density="compact" labelLines={1} isSelected onClick={() => onToggle(k)} />
          ))}
        </VStack>
      )}

      <VStack style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <GroupHeading>AVAILABLE ({available.length})</GroupHeading>
        {available.map((k) => (
          <Item key={k} label={k} density="compact" labelLines={1} onClick={() => onToggle(k)} />
        ))}
      </VStack>
    </VStack>
  );
}
