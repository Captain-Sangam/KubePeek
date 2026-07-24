'use client';

import type { CSSProperties } from 'react';
import { HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/ThemeProvider';

export default function Header() {
  const { mode, toggleTheme } = useTheme();

  return (
    <div style={{ WebkitAppRegion: 'drag', borderBottom: '1px solid var(--color-border)' } as CSSProperties}>
      <HStack hAlign="between" vAlign="center" paddingInline={6} paddingBlock={4}>
        <Text as="p" size="xl" weight="semibold" color="primary">
          KubePeek
        </Text>

        <div style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
          <IconButton
            label="Toggle theme"
            tooltip={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
            size="sm"
            onClick={toggleTheme}
            icon={<Icon icon={mode === 'light' ? Moon : Sun} size="sm" />}
          />
        </div>
      </HStack>
    </div>
  );
}
