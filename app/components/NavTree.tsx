'use client';

import { VStack } from '@astryxdesign/core/Stack';
import { List, ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Boxes, Server, Package, Sailboat, KeyRound, Split, Gauge, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ActiveView } from '../types/kubernetes';

interface NavItem {
  view: ActiveView;
  label: string;
  icon: LucideIcon;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Compute',
    items: [
      { view: 'nodeGroups', label: 'Node Groups', icon: Boxes },
      { view: 'nodes', label: 'Nodes', icon: Server },
    ],
  },
  {
    label: 'Workloads',
    items: [
      { view: 'pods', label: 'Pods', icon: Package },
      { view: 'helm', label: 'Helm', icon: Sailboat },
      { view: 'secrets', label: 'Secrets', icon: KeyRound },
      { view: 'ingresses', label: 'Ingresses', icon: Split },
      { view: 'hpa', label: 'HPA', icon: Gauge },
      { view: 'deployments', label: 'Deployments', icon: Layers },
    ],
  },
];

interface NavTreeProps {
  activeView: ActiveView | null;
  onNavigate: (view: ActiveView) => void;
  collapsed?: boolean;
}

export default function NavTree({ activeView, onNavigate, collapsed = false }: NavTreeProps) {
  if (collapsed) {
    return (
      <VStack gap={0.5} align="center" paddingBlock={0.5}>
        {NAV_SECTIONS.map((section, si) => (
          <VStack key={section.label} gap={0.5} align="center" width="100%">
            {si > 0 && <Divider />}
            {section.items.map((item) => (
              <IconButton
                key={item.view}
                label={item.label}
                tooltip={item.label}
                variant={activeView === item.view ? 'primary' : 'ghost'}
                onClick={() => onNavigate(item.view)}
                icon={<Icon icon={item.icon} size="sm" />}
              />
            ))}
          </VStack>
        ))}
      </VStack>
    );
  }

  return (
    <VStack gap={2}>
      {NAV_SECTIONS.map((section) => (
        <VStack key={section.label} gap={0.5}>
          <Text as="p" type="supporting" size="2xs" weight="semibold" color="secondary">
            {section.label.toUpperCase()}
          </Text>
          <List hasDividers={false}>
            {section.items.map((item) => (
              <ListItem
                key={item.view}
                label={item.label}
                isSelected={activeView === item.view}
                onClick={() => onNavigate(item.view)}
                startContent={<Icon icon={item.icon} size="sm" color={activeView === item.view ? 'accent' : 'secondary'} />}
              />
            ))}
          </List>
        </VStack>
      ))}
    </VStack>
  );
}
