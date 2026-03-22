import { useBackendStatus } from '@/shared/hooks/useBackendStatus';
import { WifiOff } from 'lucide-react';

export function BackendStatus() {
  const { status } = useBackendStatus();

  if (status !== 'offline') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-amber-500/50 shadow-lg animate-fade-in">
      <WifiOff size={13} className="text-amber-400 shrink-0" />
      <span className="text-xs text-amber-300">Backend offline — showing cached data</span>
    </div>
  );
}
