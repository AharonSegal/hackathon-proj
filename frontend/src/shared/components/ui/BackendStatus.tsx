/**
 * ui/BackendStatus.tsx
 * ---------------------
 * Fixed pill shown at the bottom corner when the backend is offline.
 * RTL: appears at bottom-left instead of bottom-right.
 */

import { useBackendStatus } from '@/shared/hooks/useBackendStatus';
import { useT } from '@/shared/i18n/useT';
import { WifiOff } from 'lucide-react';
import { clsx } from 'clsx';

export function BackendStatus() {
  const { status } = useBackendStatus();
  const { backend_offline, isRTL } = useT();

  if (status !== 'offline') return null;

  return (
    <div className={clsx(
      'fixed bottom-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-amber-500/50 shadow-lg animate-fade-in',
      isRTL ? 'left-4' : 'right-4',
    )}>
      <WifiOff size={13} className="text-amber-400 shrink-0" />
      <span className="text-xs text-amber-300">{backend_offline}</span>
    </div>
  );
}
