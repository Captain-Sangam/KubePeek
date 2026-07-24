'use client';

import { RefObject, useEffect } from 'react';

// Cmd/Ctrl+F focuses the given search input instead of the browser find bar.
export function useFindShortcut(inputRef: RefObject<HTMLInputElement>) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        const el = inputRef.current;
        // Skip inputs in hidden (display:none) tabs so the visible one claims the shortcut.
        if (!el || el.offsetParent === null) return;
        e.preventDefault();
        el.focus();
        el.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inputRef]);
}
