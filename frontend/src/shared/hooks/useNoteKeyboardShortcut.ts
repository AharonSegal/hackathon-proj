/**
 * shared/hooks/useNoteKeyboardShortcut.ts
 * ----------------------------------------
 * Fires onCreate when the user presses "N" outside any input/editor.
 * Safe — ignores keypresses when focus is inside input, textarea,
 * select, or contentEditable elements.
 */

import { useEffect, useRef } from 'react';

export function useNoteKeyboardShortcut(onCreate: () => void): void {
  const ref = useRef(onCreate);
  ref.current = onCreate;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== 'n' && e.key !== 'N') return;
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return;
      e.preventDefault();
      ref.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
