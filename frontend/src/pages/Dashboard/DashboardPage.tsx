/**
 * Dashboard/DashboardPage.tsx
 * ----------------------------
 * The main landing page of the app — gives a bird's-eye view of everything.
 *
 * Sections:
 * 1. Stats row — 4 cards: total events, today's events, pending messages, sent messages
 * 2. System diagnostics — calls /api/debug to show DB + env var status
 * 3. Today's events — list of events scheduled for today
 * 4. Upcoming events — next 5 future events with Gregorian + Hebrew dates
 *
 * Process Flow:
 * 1. On mount → fetch all events + message logs in parallel
 * 2. Compute today's date (both Gregorian and Hebrew)
 * 3. Filter events for "today" and "upcoming" panels
 * 4. Count pending/sent messages for stat cards
 * 5. Render everything — DiagnosticsPanel runs its own fetch independently
 */

import { useEffect, useState } from 'react';
import { CalendarDays, Mail, MessageCircle, Clock, Plus, CheckSquare, StickyNote, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { Badge } from '@/shared/components/ui/Badge';
import { CalendarEvent, MessageLog } from '@/shared/types/event.types';
import { eventApi, messageApi } from '@/shared/hooks/useApi';
import { HDate } from '@hebcal/core';
import { gematriyaDay, hebrewMonthName } from '@/pages/Calendar/hooks/useCalendar';
import { EVENT_DOT_COLORS } from '@/shared/colors';
import { StatCard } from './components/StatCard';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { WeatherWidget } from './components/WeatherWidget';
import { useSettings } from '@/shared/context/SettingsContext';
import { useT } from '@/shared/i18n/useT';

export function DashboardPage() {
  const t = useT();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [logs,   setLogs]   = useState<MessageLog[]>([]);

  // Fetch events and message logs on mount
  useEffect(() => {
    eventApi.getAll().then(setEvents).catch(() => {});
    messageApi.getLogs().then(setLogs).catch(() => {});
  }, []);

  // Compute today's date in both calendars
  const today    = new Date();
  const hToday   = new HDate(today);
  const todayStr = today.toISOString().slice(0, 10); // "YYYY-MM-DD"

  // Filter events for the two panels
  const todayEvents = events.filter(e => e.date === todayStr);
  const upcomingEvents = events
    .filter(e => e.date > todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  // Count message statuses for stat cards
  const pendingMessages = logs.filter(l => l.status === 'pending').length;
  const sentMessages    = logs.filter(l => l.status === 'sent').length;

  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      <PageHeader
        title={t.dashboard_title}
        subtitle={`${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · ${gematriyaDay(hToday.getDate())} ${hebrewMonthName(hToday)} ${hToday.getFullYear()}`}
        actions={
          <>
            {settings.weather.show && (
              <WeatherWidget
                lat={settings.zmanim.location.lat}
                lng={settings.zmanim.location.lng}
                unit={settings.weather.unit}
              />
            )}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => navigate('/calendar')}
                className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-lg text-white bg-primary-950 hover:bg-primary-900 transition-colors"
              >
                <Plus size={13} />{t.dashboard_new_event}
              </button>
              <button
                onClick={() => navigate('/todos')}
                className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-lg text-white bg-primary-800 hover:bg-primary-700 transition-colors"
              >
                <CheckSquare size={13} />New Todo
              </button>
              <button
                onClick={() => navigate('/notes')}
                className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-500 transition-colors"
              >
                <StickyNote size={13} />New Note
              </button>
              <button
                onClick={() => navigate('/daily-log')}
                className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-lg text-white bg-primary-500 hover:bg-primary-400 transition-colors"
              >
                <BookOpen size={13} />New Log
              </button>
            </div>
          </>
        }
      />

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays}  label={t.stat_total_events}  value={events.length}      color="bg-primary-600" />
        <StatCard icon={Clock}         label={t.stat_today_events}  value={todayEvents.length} color="bg-violet-600" />
        <StatCard icon={Mail}          label={t.stat_pending}        value={pendingMessages}     color="bg-blue-600" />
        <StatCard icon={MessageCircle} label={t.stat_sent}           value={sentMessages}        color="bg-emerald-600" />
      </div>

      {/* ── System diagnostics ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.system_diagnostics}</h2>
        <DiagnosticsPanel />
      </div>

      {/* ── Today + Upcoming events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's events */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">{t.today}</h2>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-slate-500">{t.no_events_today}</p>
          ) : (
            <div className="space-y-2">
              {todayEvents.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50">
                  {/* Color dot using the shared EVENT_DOT_COLORS map */}
                  <div className={`w-2 h-2 rounded-full ${EVENT_DOT_COLORS[ev.color] ?? 'bg-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{ev.title}</p>
                    {ev.startTime && <p className="text-xs text-slate-500">{ev.startTime}</p>}
                  </div>
                  {ev.scheduledEmail    && <Badge color="sky">Email</Badge>}
                  {ev.scheduledWhatsApp && <Badge color="emerald">WA</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming events (next 5) */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">{t.upcoming_events}</h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-slate-500">{t.no_upcoming}</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map(ev => {
                // Parse the date string as local midnight to avoid timezone-shift bugs
                const d  = new Date(ev.date + 'T00:00:00');
                const hd = new HDate(d);
                return (
                  <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50">
                    {/* Month + day number column */}
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
