'use client';

import { useState } from 'react';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';

interface CopyButtonProps {
  value: string;
  size?: 'small' | 'medium';
  title?: string;
  disabled?: boolean;
}

// Clipboard copy button that flips to a transient check icon on success.
export default function CopyButton({ value, size = 'small', title = 'Copy', disabled }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <IconButton
      label={title}
      tooltip={copied ? 'Copied!' : title}
      variant="ghost"
      size={size === 'small' ? 'sm' : 'md'}
      onClick={handleCopy}
      isDisabled={disabled}
      icon={<Icon icon={copied ? 'checkDouble' : 'copy'} color={copied ? 'success' : 'inherit'} />}
    />
  );
}
