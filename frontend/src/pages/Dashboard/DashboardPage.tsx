import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Mail, MessageCircle, Clock, Plus, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { CalendarEvent, MessageLog } from '@/shared/types/event.types';
import { eventApi, messageApi } from '@/shared/hooks/useApi';
import { useBackendStatus, retryConnection } from '@/shared/hooks/useBackendStatus';
import { HDate } from '@hebcal/core';
import { gematriyaDay, hebrewMonthName } from '@/pages/Calendar/hooks/useCalendar';
import axios from 'axios';

const COLOR_DOT: Record<string, string> = {
  indigo:  'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
  sky:     'bg-sky-500',
  violet:  'bg-violet-500',
};

// ── Diagnostics panel ───────────────────────────────────────────────────────

interface DebugResult {
  env: Record<string, string | null>;
  db: { status: string; ping?: unknown; eventsCount?: unknown; logsCount?: unknown; error?: string };
  latencyMs: number;
  timestamp: string;
  node: string;
  region: string;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  const missing = !value || value === '— NOT SET —';
  return (
    <div className="flex items-start gap-2 py-1 border-b border-slate-800 last:border-0">
      <span className="text-slate-500 w-52 shrink-0 text-xs font-mono">{label}</span>
      <span className={`text-xs font-mono break-all ${missing ? 'text-rose-400' : 'text-slate-200'}`}>
        {value ?? '— NOT SET —'}
      </span>
    </div>
  );
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
    : <XCircle      size={14} className="text-rose-400    shrink-0" />;
}

function DiagnosticsPanel() {
  const { status } = useBackendStatus();
  const [loading, setLoading]   = useState(false);
  const [data, setData]         = useState<DebugResult | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    retryConnection();
    try {
      const res = await axios.get<DebugResult>('/api/debug', { timeout: 10000 });
      setData(res.data);
    } catch (e) {
      setFetchErr(axios.isAxiosError(e)
        ? e.response ? `HTTP ${e.response.status}: ${JSON.stringify(e.response.data)}` : e.message
        : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on mount
  useEffect(() => { run(); }, [run]);

  const dot =
    status === 'online'  ? 'bg-emerald-500' :
    status === 'offline' ? 'bg-rose-500'    :
                           'bg-amber-400 animate-pulse';
  const statusLabel =
    status === 'online'  ? 'Connected' :
    status === 'offline' ? 'Offline'   : 'Checking…';
  const statusColor =
    status === 'online'  ? 'text-emerald-400' :
    status === 'offline' ? 'text-rose-400'    : 'text-amber-400';

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${dot}`} />
          <div>
            <p className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</p>
            <p className="text-xs text-slate-500">Backend / Database</p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Running…' : 'Run Diagnostics'}
        </button>
      </div>

      {/* Fetch error */}
      {fetchErr && (
        <div className="rounded-lg bg-rose-950/40 border border-rose-800/50 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={13} className="text-rose-400" />
            <span className="text-xs font-semibold text-rose-400">Could not reach /api/debug</span>
          </div>
          <p className="text-xs font-mono text-rose-300 break-all">{fetchErr}</p>
        </div>
      )}

      {data && (
        <div className="space-y-4">

          {/* DB status */}
          <div className="rounded-lg bg-slate-900/60 px-3 py-2 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon ok={data.db.status === 'connected'} />
              <span className="text-xs font-semibold text-slate-300">
                Database — {data.db.status === 'connected' ? 'connected' : 'ERROR'}
              </span>
              <span className="ml-auto text-xs text-slate-500">{data.latencyMs}ms · {data.region} · {data.node}</span>
            </div>
            {data.db.status === 'connected' ? (
              <>
                <p className="text-xs font-mono text-slate-400">ping: {JSON.stringify(data.db.ping)}</p>
                <p className="text-xs font-mono text-slate-400">events in DB: {String(data.db.eventsCount)}</p>
                <p className="text-xs font-mono text-slate-400">message_logs in DB: {String(data.db.logsCount)}</p>
              </>
            ) : (
              <p className="text-xs font-mono text-rose-400 break-all">{data.db.error}</p>
            )}
          </div>

          {/* Env vars */}
          <div className="rounded-lg bg-slate-900/60 px-3 py-2">
            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Environment Variables</p>
            {Object.entries(data.env).map(([key, val]) => (
              <Row key={key} label={key} value={val} />
            ))}
          </div>

          <p className="text-xs text-slate-600 font-mono">checked at {data.timestamp}</p>
        </div>
      )}
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);

  useEffect(() => {
    eventApi.getAll().then(setEvents).catch(() => {});
    messageApi.getLogs().then(setLogs).catch(() => {});
  }, []);

  const today = new Date();
  const hToday = new HDate(today);
  const todayStr = today.toISOString().slice(0, 10);

  const todayEvents = events.filter(e => e.date === todayStr);
  const upcomingEvents = events
    .filter(e => e.date > todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const pendingMessages = logs.filter(l => l.status === 'pending').length;
  const sentMessages    = logs.filter(l => l.status === 'sent').length;

  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      <PageHeader
        title="Dashboard"
        subtitle={`${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · ${gematriyaDay(hToday.getDate())} ${hebrewMonthName(hToday)} ${hToday.getFullYear()}`}
        actions={
          <Button size="sm" onClick={() => navigate('/calendar')}>
            <Plus size={14} />
            New Event
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Total Events"      value={events.length}    color="bg-primary-600" />
        <StatCard icon={Clock}        label="Today's Events"    value={todayEvents.length} color="bg-violet-600" />
        <StatCard icon={Mail}         label="Pending Messages"  value={pendingMessages}  color="bg-blue-600" />
        <StatCard icon={MessageCircle} label="Sent Messages"    value={sentMessages}     color="bg-emerald-600" />
      </div>

      {/* Diagnostics */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">System Diagnostics</h2>
        <DiagnosticsPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">Today</h2>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No events today</p>
          ) : (
            <div className="space-y-2">
              {todayEvents.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50">
                  <div className={`w-2 h-2 rounded-full ${COLOR_DOT[ev.color] ?? 'bg-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{ev.title}</p>
                    {ev.startTime && <p className="text-xs text-slate-500">{ev.startTime}</p>}
                  </div>
                  {ev.scheduledEmail && <Badge color="sky">Email</Badge>}
                  {ev.scheduledWhatsApp && <Badge color="emerald">WA</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">Upcoming Events</h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming events</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map(ev => {
                const d  = new Date(ev.date + 'T00:00:00');
                const hd = new HDate(d);
                return (
                  <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50">
                    <div className="text-center min-w-[36px]">
                      <p className="text-xs font-semibold text-primary-400">
                        {d.toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      <p className="text-lg font-bold text-slate-100 leading-tight">{d.getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{ev.title}</p>
                      <p className="text-xs text-slate-500 font-hebrew">
                        {gematriyaDay(hd.getDate())} {hebrewMonthName(hd)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
