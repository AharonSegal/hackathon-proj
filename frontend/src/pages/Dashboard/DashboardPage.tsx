import { useEffect, useState } from 'react';
import { CalendarDays, Mail, MessageCircle, Clock, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { CalendarEvent, MessageLog } from '@/shared/types/event.types';
import { eventApi, messageApi } from '@/shared/hooks/useApi';
import { useBackendStatus, retryConnection, type BackendDetail } from '@/shared/hooks/useBackendStatus';
import { HDate } from '@hebcal/core';
import { gematriyaDay, hebrewMonthName } from '@/pages/Calendar/hooks/useCalendar';

const COLOR_DOT: Record<string, string> = {
  indigo:  'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
  sky:     'bg-sky-500',
  violet:  'bg-violet-500',
};

function ConnectionCard() {
  const detail = useBackendStatus();
  const { status } = detail;

  const dot =
    status === 'online'   ? 'bg-emerald-500' :
    status === 'offline'  ? 'bg-rose-500'    :
                            'bg-amber-400 animate-pulse';

  const label =
    status === 'online'   ? 'Connected' :
    status === 'offline'  ? 'Offline'   :
                            'Checking…';

  const textColor =
    status === 'online'   ? 'text-emerald-400' :
    status === 'offline'  ? 'text-rose-400'    :
                            'text-amber-400';

  // Build debug lines
  const debugLines: string[] = [];
  if (detail.latencyMs !== undefined) debugLines.push(`API: ${detail.latencyMs}ms`);
  if (detail.db) debugLines.push(`DB: ${detail.db}`);
  if (detail.error) debugLines.push(`Error: ${detail.error}`);

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${dot}`} />
          <div>
            <p className={`text-sm font-semibold ${textColor}`}>{label}</p>
            <p className="text-xs text-slate-500">Backend API</p>
          </div>
        </div>
        <button
          onClick={retryConnection}
          disabled={status === 'checking'}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={13} className={status === 'checking' ? 'animate-spin' : ''} />
          Retry
        </button>
      </div>

      {/* Debug info */}
      {debugLines.length > 0 && (
        <div className="rounded-lg bg-slate-900/60 px-3 py-2 space-y-0.5">
          {debugLines.map((line, i) => (
            <p key={i} className="text-xs font-mono text-slate-400 break-all">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const sentMessages = logs.filter(l => l.status === 'sent').length;

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

      {/* Connection status */}
      <ConnectionCard />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Total Events" value={events.length} color="bg-primary-600" />
        <StatCard icon={Clock} label="Today's Events" value={todayEvents.length} color="bg-violet-600" />
        <StatCard icon={Mail} label="Pending Messages" value={pendingMessages} color="bg-blue-600" />
        <StatCard icon={MessageCircle} label="Sent Messages" value={sentMessages} color="bg-emerald-600" />
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
                const d = new Date(ev.date + 'T00:00:00');
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
