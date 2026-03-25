/**
 * GradientButton.tsx
 * -------------------
 * Primary action button with animated indigo/purple sweep gradient on hover.
 *
 * Animation: a ::before pseudo-element carries a linear-gradient spotlight
 * that slides from left: -100% to left: 0 on hover (with overflow: hidden
 * clipping it), then reverses with a slight delay on mouse-out.
 */

import { type ElementType, useEffect } from 'react';
import { clsx } from 'clsx';

const STYLE_ID = 'gradient-btn-styles';

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .gb-sweep {
      position: relative;
      overflow: hidden;
      background: #4f46e5;
      border: 1px solid rgba(99,102,241,0.6);
      transition: transform 0.2s ease, border-color 0.2s, background 0.2s;
    }
    .gb-sweep:hover:not(:disabled) {
      transform: scale(1.05);
      background: #4338ca;
      border-color: rgba(168,85,247,0.7);
    }
    .gb-sweep:disabled { opacity: 0.5; cursor: not-allowed; }
    .gb-sweep::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 200%;
      height: 100%;
      background: linear-gradient(
        to right,
        transparent 0%,
        transparent 15%,
        rgba(255,255,255,0.15) 40%,
        rgba(168,85,247,0.5)  55%,
        transparent 72%,
        transparent 100%
      );
      transition: left 0.5s ease 0.12s;
      pointer-events: none;
    }
    .gb-sweep:hover:not(:disabled)::before {
      left: 0;
      transition: left 0.4s ease;
    }
  `;
  document.head.appendChild(style);
}

interface GradientButtonProps {
  text: string;
  onClick: () => void;
  icon?: ElementType;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function GradientButton({
  text, onClick, icon: Icon, disabled, className, size = 'md',
}: GradientButtonProps) {
  useEffect(() => { injectStyles(); }, []);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'gb-sweep inline-flex items-center justify-center rounded-lg font-medium text-slate-100',
        size === 'sm' ? 'h-7 px-3 text-xs' : 'h-9 px-4 text-sm',
        className,
      )}
    >
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
        {text}
      </span>
    </button>
  );
}
