'use client';

import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { ContentCopy as CopyIcon, Check as CheckIcon } from '@mui/icons-material';

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
    <Tooltip title={copied ? 'Copied!' : title} arrow>
      <span>
        <IconButton size={size} onClick={handleCopy} disabled={disabled}>
          {copied ? (
            <CheckIcon fontSize="inherit" color="success" />
          ) : (
            <CopyIcon fontSize="inherit" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}
