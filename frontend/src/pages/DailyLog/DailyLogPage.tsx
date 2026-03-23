import { useState } from 'react';
import { BookOpen, BarChart3, List, Settings, AlertCircle, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { AppProvider, useApp } from './context/AppContext';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import LogEntryPage from './pages/LogEntry/LogEntryPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import LogsPage from './pages/Logs/LogsPage';
import SchemaManagerPage from './pages/SchemaManager/SchemaManagerPage';

type View = 'log' | 'analyst' | 'logs' | 'settings';

const TABS: { id: View; label: string; icon: typeof BookOpen }[] = [
  { id: 'log',      label: 'Log Entry',  icon: BookOpen  },
  { id: 'analyst',  label: 'Analytics',  icon: BarChart3 },
  { id: 'logs',     label: 'All Logs',   icon: List      },
  { id: 'settings', label: 'Schema',     icon: Settings  },
];

function DailyLogInner() {
  const [view, setView] = useState<View>('log');
  const { state, loadError } = useApp();

  if (loadError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title="Daily Log" subtitle="Work journal & analytics" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertCircle size={36} className="text-rose-400" />
          <div>
            <p className="font-semibold text-slate-100">Failed to load data</p>
            <p className="mt-1 text-sm text-slate-400">{loadError}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (state.isLoading) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title="Daily Log" subtitle="Work journal & analytics" />
        <div className="flex-1 space-y-4 p-4 sm:p-6">
          <div className="h-10 animate-pulse rounded-xl bg-slate-800" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-800" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-800" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Daily Log" subtitle="Work journal & analytics" />

      {/* Tab strip */}
      <div className="flex shrink-0 overflow-x-auto border-b border-slate-800 px-4 sm:px-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={clsx(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors',
              view === id
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-100',
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'log'      && <LogEntryPage />}
        {view === 'analyst'  && <DashboardPage />}
        {view === 'logs'     && <LogsPage />}
        {view === 'settings' && <SchemaManagerPage />}
      </div>
    </div>
  );
}

export default function DailyLogPage() {
  return (
    <AppProvider>
      <DailyLogInner />
    </AppProvider>
  );
}
