'use client';

import type { CSSProperties } from 'react';
import { HStack } from '@astryxdesign/core/Stack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/ThemeProvider';

export default function Header() {
  const { mode, toggleTheme } = useTheme();

  return (
    // Thin drag strip: just the macOS traffic lights (left) and the theme toggle.
    <div style={{ WebkitAppRegion: 'drag', borderBottom: '1px solid var(--color-border)' } as CSSProperties}>
      <HStack hAlign="end" vAlign="center" paddingInline={2} paddingBlock={0.5}>
        <div style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
          <IconButton
            label="Toggle theme"
            tooltip={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            icon={<Icon icon={mode === 'light' ? Moon : Sun} size="sm" />}
          />
        </div>
      </HStack>
    </div>
  );
}
