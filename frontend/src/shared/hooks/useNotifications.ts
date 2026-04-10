/**
 * shared/hooks/useNotifications.ts
 * ----------------------------------
 * Registers the service worker, requests notification permission, and syncs
 * the full notification schedule (derived from events + todos) to the SW
 * every time either list changes.
 *
 * The SW stores schedules in IndexedDB and fires them via setTimeout even
 * when this tab is in the background (or closed, as long as the browser
 * keeps the SW alive).
 *
 * For the foreground case (tab open) this hook also fires notifications
 * directly via the Notification API to guarantee delivery even if the SW
 * has been terminated.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useEvents } from '@/shared/context/EventsContext';
import { useTodos } from '@/shared/context/TodosContext';

// ── Scheduled notification shape sent to the SW ──────────────────────────────

export interface ScheduledNotif {
  id:     string;  // unique per (entity, offset)
  title:  string;
  body:   string;
  fireAt: number;  // Unix ms timestamp
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function offsetLabel(minutes: number): string {
  if (minutes === 0)      return 'now';
  if (minutes < 60)       return `in ${minutes} min`;
  if (minutes < 1440)     return `in ${Math.round(minutes / 60)}h`;
  if (minutes < 10080)    return `in ${Math.round(minutes / 1440)} day${minutes >= 2880 ? 's' : ''}`;
  return `in ${Math.round(minutes / 10080)} week${minutes >= 20160 ? 's' : ''}`;
}

/**
 * Compute the Unix ms timestamp at which we should fire a notification.
 *
 * - If the event/todo has a specific time → fire at (event_datetime − offset)
 * - If it's all-day (or no time set)      → fire at (event_date at 09:00 − offset)
 *   …where offset = 0 means "fire at 9 AM on the day itself"
 */
function fireTime(
  dateStr: string,
  timeStr: string | null | undefined,
  offsetMinutes: number,
): number | null {
  let base: Date;

  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    base = new Date(`${dateStr}T00:00:00`);
    base.setHours(h, m, 0, 0);
  } else {
    // All-day: treat 09:00 as the "event time"
    base = new Date(`${dateStr}T09:00:00`);
  }

  if (isNaN(base.getTime())) return null;
  return base.getTime() - offsetMinutes * 60 * 1000;
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useNotifications() {
  const { events } = useEvents();
  const { todos }  = useTodos();

  // Track which notifications we already fired in-tab (prevents duplicates)
  const firedRef = useRef<Set<string>>(new Set());

  // ── 1. Register service worker ────────────────────────────────────────────

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('[SW] registration failed:', err));
  }, []);

  // ── 2. Request permission once ────────────────────────────────────────────

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── 3. Compute schedule from events + todos ───────────────────────────────

  const buildSchedule = useCallback((): ScheduledNotif[] => {
    const now      = Date.now();
    const schedule: ScheduledNotif[] = [];

    // Events
    for (const ev of events) {
      if (!ev.notifications?.length) continue;
      for (const n of ev.notifications) {
        const ft = fireTime(ev.date, ev.allDay ? null : ev.startTime, n.offsetMinutes);
        if (ft === null || ft <= now) continue;
        schedule.push({
          id:     `event-${ev.id}-${n.id}`,
          title:  ev.title,
          body:   n.offsetMinutes === 0
            ? 'Event is starting now'
            : `Starts ${offsetLabel(n.offsetMinutes)}`,
          fireAt: ft,
        });
      }
    }

    // Todos  (reminder_config: ReminderItem[] where value = offsetMinutes as string)
    for (const todo of todos) {
      if (todo.completed || !todo.reminderConfig?.length || !todo.dueDate) continue;
      for (const n of todo.reminderConfig) {
        const offsetMinutes = parseInt(String(n.value), 10);
        if (isNaN(offsetMinutes)) continue;
        const ft = fireTime(todo.dueDate, todo.dueTime, offsetMinutes);
        if (ft === null || ft <= now) continue;
        schedule.push({
          id:     `todo-${todo.id}-${n.id}`,
          title:  todo.title,
          body:   offsetMinutes === 0
            ? 'Task is due now'
            : `Due ${offsetLabel(offsetMinutes)}`,
          fireAt: ft,
        });
      }
    }

    return schedule;
  }, [events, todos]);

  // ── 4. Sync to SW + set foreground timers ─────────────────────────────────

  useEffect(() => {
    if (Notification.permission !== 'granted') return;

    const schedule = buildSchedule();

    // Tell the SW about the full schedule
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.active?.postMessage({ type: 'SYNC_NOTIFICATIONS', notifications: schedule });
        })
        .catch(() => { /* SW not ready — ignore */ });
    }

    // Also set foreground timers so the tab itself fires notifications
    // (guarantees delivery even if the SW gets killed)
    const now     = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const n of schedule) {
      if (firedRef.current.has(n.id)) continue;
      const delay = n.fireAt - now;
      if (delay < 0) continue;

      timers.push(setTimeout(() => {
        if (Notification.permission === 'granted' && !firedRef.current.has(n.id)) {
          firedRef.current.add(n.id);
          new Notification(n.title, { body: n.body, icon: '/calendar.svg' });
        }
      }, delay));
    }

    return () => { timers.forEach(clearTimeout); };
  }, [buildSchedule]);
}
