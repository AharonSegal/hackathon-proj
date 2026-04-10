/**
 * Calendar/components/EventModal.tsx
 * ------------------------------------
 * Modal dialog for creating and editing calendar events.
 *
 * Date selection (all three synced):
 * - Gregorian date input (type="date")
 * - Hebrew date fields (day number + month dropdown + year number)
 * - Mini calendar picker (toggle with calendar button)
 *
 * Modes:
 * - Create mode (editEvent is null): defaults to `day.date` or today
 * - Edit mode (editEvent is set): form pre-filled from the existing event
 *
 * On save → calls onSaved(payload, editEventId).
 * On delete → calls onDeleted(id).
 */

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input, Textarea } from '@/shared/components/ui/Input';
import { CalendarEvent, EventColor, BrowserNotification } from '@/shared/types/event.types';
import { NotificationPicker } from '@/shared/components/NotificationPicker';
import { DayInfo } from '@/pages/Calendar/hooks/useCalendar';
import { Mail, MessageCircle, Trash2, ChevronLeft, ChevronRight, CalendarDays, Bell } from 'lucide-react';
import { clsx } from 'clsx';
import { useT } from '@/shared/i18n/useT';
import { HDate, months } from '@hebcal/core';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday,
} from 'date-fns';
import { useEvents } from '@/shared/context/EventsContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS: { value: EventColor; label: string; cls: string }[] = [
  { value: 'indigo',  label: 'Indigo',  cls: 'bg-indigo-500'  },
  { value: 'emerald', label: 'Emerald', cls: 'bg-emerald-500' },
  { value: 'amber',   label: 'Amber',   cls: 'bg-amber-500'   },
  { value: 'rose',    label: 'Rose',    cls: 'bg-rose-500'    },
  { value: 'sky',     label: 'Sky',     cls: 'bg-sky-500'     },
  { value: 'violet',  label: 'Violet',  cls: 'bg-violet-500'  },
];

const EVENT_HEX: Record<string, string> = {
  indigo: '#6366f1', emerald: '#10b981', amber: '#f59e0b',
  rose: '#f43f5e',   sky: '#0ea5e9',     violet: '#8b5cf6',
};

/** Hebrew months in the traditional Tishrei-first order */
const HEBREW_MONTHS_LIST = [
  { value: months.TISHREI,  label: 'תשרי'   },
  { value: months.CHESHVAN, label: 'חשון'   },
  { value: months.KISLEV,   label: 'כסלו'   },
  { value: months.TEVET,    label: 'טבת'    },
  { value: months.SHVAT,    label: 'שבט'    },
  { value: months.ADAR_I,   label: 'אדר א׳' },
  { value: months.ADAR_II,  label: 'אדר ב׳' },
  { value: months.NISAN,    label: 'ניסן'   },
  { value: months.IYYAR,    label: 'אייר'   },
  { value: months.SIVAN,    label: 'סיון'   },
  { value: months.TAMUZ,    label: 'תמוז'   },
  { value: months.AV,       label: 'אב'     },
  { value: months.ELUL,     label: 'אלול'   },
];

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const { events } = useEvents();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));

  // Keep view in sync when selected month changes (e.g. from Hebrew date input)
  useEffect(() => {
    setViewMonth(startOfMonth(selected));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.getFullYear(), selected.getMonth()]);

  const gridDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(viewMonth),     { weekStartsOn: 0 }),
  }), [viewMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const ev of events) (map[ev.date] ??= []).push(ev.color);
    return map;
  }, [events]);

  return (
    <div className="mt-2 p-3 bg-slate-900 rounded-lg border border-slate-700">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-slate-300">{format(viewMonth, 'MMMM yyyy')}</span>
        <button
          type="button"
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[10px] text-slate-500 font-medium">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {gridDays.map((d, i) => {
          const inMonth = isSameMonth(d, viewMonth);
          const isSel   = isSameDay(d, selected);
          const isT     = isToday(d);
          const dateKey = format(d, 'yyyy-MM-dd');
          const dots    = (eventsByDate[dateKey] ?? []).slice(0, 3);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(d)}
              className={clsx(
                'flex flex-col items-center py-0.5 rounded text-xs transition-colors',
                !inMonth && 'opacity-30',
                isSel  && 'bg-indigo-600 text-white',
                !isSel && isT  && 'bg-indigo-900/50 text-indigo-300',
                !isSel && !isT && 'text-slate-300 hover:bg-slate-700',
              )}
            >
              <span>{d.getDate()}</span>
              {dots.length > 0 && inMonth && (
                <div className="flex gap-0.5 mt-0.5">
                  {dots.map((c, ci) => (
                    <div key={ci} style={{ width: 4, height: 4, borderRadius: '50%', background: EVENT_HEX[c] ?? '#6366f1' }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateToHebrew(d: Date): { day: number; month: number; year: number } {
  try {
    const hd = new HDate(d);
    return { day: hd.getDate(), month: hd.getMonth(), year: hd.getFullYear() };
  } catch {
    return { day: 1, month: months.TISHREI, year: 5785 };
  }
}

function hebrewToDate(day: number, month: number, year: number): Date | null {
  try {
    const greg = new HDate(day, month, year).greg();
    return new Date(greg.getFullYear(), greg.getMonth(), greg.getDate());
  } catch {
    return null;
  }
}

// ─── EventModal ───────────────────────────────────────────────────────────────

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  day: DayInfo | null;
  editEvent?: CalendarEvent | null;
  onSaved: (payload: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>, editEventId: string | null) => void;
  onDeleted: (id: string) => void;
}

export function EventModal({ open, onClose, day, editEvent, onSaved, onDeleted }: EventModalProps) {
  const t = useT();

  // ── Form fields ────────────────────────────────────────────────────────────
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [startTime,   setStartTime]   = useState('');
  const [endTime,     setEndTime]     = useState('');
  const [color,       setColor]       = useState<EventColor>('indigo');
  const [allDay,      setAllDay]      = useState(true);

  // ── Date state ─────────────────────────────────────────────────────────────
  const [selectedDate,  setSelectedDate]  = useState<Date>(() => day?.date ?? new Date());
  const [showCalPicker, setShowCalPicker] = useState(false);
  // Hebrew fields (derived from selectedDate; also editable directly)
  const [hDay,   setHDay]   = useState(1);
  const [hMonth, setHMonth] = useState<number>(months.TISHREI);
  const [hYear,  setHYear]  = useState(5785);

  // ── Browser notifications ──────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<BrowserNotification[]>([]);

  // ── Scheduled actions ──────────────────────────────────────────────────────
  const [addEmail,      setAddEmail]      = useState(false);
  const [emailTo,       setEmailTo]       = useState('');
  const [emailSubject,  setEmailSubject]  = useState('');
  const [emailBody,     setEmailBody]     = useState('');
  const [emailAt,       setEmailAt]       = useState('');
  const [addWhatsApp,   setAddWhatsApp]   = useState(false);
  const [wpTo,          setWpTo]          = useState('');
  const [wpMessage,     setWpMessage]     = useState('');
  const [wpAt,          setWpAt]          = useState('');

  // ── Sync selectedDate → Hebrew fields ──────────────────────────────────────
  useEffect(() => {
    const h = dateToHebrew(selectedDate);
    setHDay(h.day);
    setHMonth(h.month);
    setHYear(h.year);
  }, [selectedDate]);

  // ── Reset form when modal opens or editEvent changes ───────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    setShowCalPicker(false);

    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description ?? '');
      setStartTime(editEvent.startTime ?? '');
      setEndTime(editEvent.endTime ?? '');
      setColor(editEvent.color);
      setAllDay(editEvent.allDay);
      setSelectedDate(new Date(editEvent.date + 'T00:00:00'));
      setNotifications(editEvent.notifications ?? []);
      if (editEvent.scheduledEmail) {
        setAddEmail(true);
        setEmailTo(editEvent.scheduledEmail.to.join(', '));
        setEmailSubject(editEvent.scheduledEmail.subject);
        setEmailBody(editEvent.scheduledEmail.body);
        setEmailAt(editEvent.scheduledEmail.scheduledAt.slice(0, 16));
      } else {
        setAddEmail(false); setEmailTo(''); setEmailSubject(''); setEmailBody(''); setEmailAt('');
      }
      if (editEvent.scheduledWhatsApp) {
        setAddWhatsApp(true);
        setWpTo(editEvent.scheduledWhatsApp.to);
        setWpMessage(editEvent.scheduledWhatsApp.message);
        setWpAt(editEvent.scheduledWhatsApp.scheduledAt.slice(0, 16));
      } else {
        setAddWhatsApp(false); setWpTo(''); setWpMessage(''); setWpAt('');
      }
    } else {
      setTitle(''); setDescription(''); setStartTime(''); setEndTime('');
      setColor('indigo'); setAllDay(true);
      setSelectedDate(day?.date ?? new Date());
      setNotifications([]);
      setAddEmail(false); setEmailTo(''); setEmailSubject(''); setEmailBody(''); setEmailAt('');
      setAddWhatsApp(false); setWpTo(''); setWpMessage(''); setWpAt('');
    }
  }, [editEvent?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Date change handlers ───────────────────────────────────────────────────

  const handleGregorianInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) setSelectedDate(new Date(e.target.value + 'T00:00:00'));
  };

  const handleHebrewDay = (v: number) => {
    setHDay(v);
    const d = hebrewToDate(v, hMonth, hYear);
    if (d) setSelectedDate(d);
  };

  const handleHebrewMonth = (v: number) => {
    setHMonth(v);
    const d = hebrewToDate(hDay, v, hYear);
    if (d) setSelectedDate(d);
  };

  const handleHebrewYear = (v: number) => {
    setHYear(v);
    const d = hebrewToDate(hDay, hMonth, v);
    if (d) setSelectedDate(d);
  };

  // ── Save / Delete ──────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!title.trim()) return;
    const payload: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      title: title.trim(),
      description: description.trim() || undefined,
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime: allDay ? undefined : startTime || undefined,
      endTime:   allDay ? undefined : endTime   || undefined,
      color,
      allDay,
      tags:          editEvent?.tags         ?? [],
      folderId:      editEvent?.folderId     ?? null,
      recurrence:    editEvent?.recurrence   ?? 'none',
      recurrenceEnd: editEvent?.recurrenceEnd,
      scheduledEmail: addEmail && emailTo && emailSubject
        ? { to: emailTo.split(',').map(s => s.trim()), subject: emailSubject, body: emailBody, scheduledAt: new Date(emailAt).toISOString(), sent: false, id: '' }
        : undefined,
      scheduledWhatsApp: addWhatsApp && wpTo && wpMessage
        ? { to: wpTo, message: wpMessage, scheduledAt: new Date(wpAt).toISOString(), sent: false, id: '' }
        : undefined,
      notifications: notifications.length > 0 ? notifications : undefined,
    };
    onSaved(payload, editEvent?.id ?? null);
    onClose();
  };

  const handleDelete = () => {
    if (!editEvent) return;
    onDeleted(editEvent.id);
    onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editEvent ? t.edit_event : t.create_event_title}
      size="lg"
    >
      <div className="space-y-4">

        {/* ── Date section ─────────────────────────────────────────── */}
        <div>
          {/* Gregorian input + calendar toggle */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={handleGregorianInput}
                className="w-full h-8 px-3 rounded-md bg-slate-900 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCalPicker(v => !v)}
              title="Open calendar picker"
              className={clsx(
                'h-8 px-2 rounded-md border transition-colors flex items-center',
                showCalPicker
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500',
              )}
            >
              <CalendarDays size={15} />
            </button>
          </div>

          {/* Hebrew date */}
          <div className="mt-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Hebrew Date</label>
            <div className="flex gap-2" dir="rtl">
              {/* Day */}
              <input
                type="number"
                min={1} max={30}
                value={hDay}
                onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= 30) handleHebrewDay(v); }}
                className="w-14 h-8 px-1 rounded-md bg-slate-900 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 text-center"
                title="Hebrew day"
              />
              {/* Month */}
              <select
                value={hMonth}
                onChange={e => handleHebrewMonth(parseInt(e.target.value))}
                className="flex-1 h-8 px-2 rounded-md bg-slate-900 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 cursor-pointer"
              >
                {HEBREW_MONTHS_LIST.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              {/* Year */}
              <input
                type="number"
                min={5700} max={6000}
                value={hYear}
                onChange={e => { const v = parseInt(e.target.value); if (v >= 5700 && v <= 6000) handleHebrewYear(v); }}
                className="w-20 h-8 px-1 rounded-md bg-slate-900 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 text-center"
                title="Hebrew year"
              />
            </div>
          </div>

          {/* Inline calendar picker */}
          {showCalPicker && (
            <MiniCalendar
              selected={selectedDate}
              onSelect={d => { setSelectedDate(d); setShowCalPicker(false); }}
            />
          )}
        </div>

        {/* ── Title ────────────────────────────────────────────────── */}
        <Input
          label={t.field_title}
          placeholder={t.placeholder_title}
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />

        {/* ── Description ──────────────────────────────────────────── */}
        <Textarea
          label={t.field_description}
          placeholder={t.placeholder_description}
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="min-h-[60px]"
        />

        {/* ── Time ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={allDay}
                onChange={e => setAllDay(e.target.checked)}
                className="accent-primary-500"
              />
              {t.field_all_day}
            </label>
          </div>
          {!allDay && (
            <div className="flex gap-3">
              <Input label={t.field_start_time} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              <Input label={t.field_end_time}   type="time" value={endTime}   onChange={e => setEndTime(e.target.value)}   />
            </div>
          )}
        </div>

        {/* ── Color ────────────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">{t.field_color}</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={clsx(
                  'w-6 h-6 rounded-full transition-all',
                  c.cls,
                  color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : '',
                )}
              />
            ))}
          </div>
        </div>

        {/* ── Notifications ────────────────────────────────────────── */}
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-slate-900/50 flex items-center gap-2 text-xs font-medium text-slate-400">
            <Bell size={12} />
            Notifications
          </div>
          <div className="p-3 border-t border-slate-700">
            <NotificationPicker
              value={notifications}
              onChange={setNotifications}
              hasTime={!allDay && !!startTime}
            />
          </div>
        </div>

        {/* ── Scheduled actions ────────────────────────────────────── */}
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-slate-900/50 text-xs font-medium text-slate-400">
            {t.scheduled_actions}
          </div>

          {/* Email */}
          <div className="p-3 border-t border-slate-700">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={addEmail} onChange={e => setAddEmail(e.target.checked)} className="accent-primary-500" />
              <Mail size={14} className="text-blue-400" />
              {t.schedule_email}
            </label>
            {addEmail && (
              <div className="mt-3 space-y-2 pl-6">
                <Input label={t.field_email_to}      placeholder="email@example.com" value={emailTo}      onChange={e => setEmailTo(e.target.value)}      />
                <Input label={t.field_email_subject}                                  value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                <Textarea label={t.field_email_body}                                  value={emailBody}    onChange={e => setEmailBody(e.target.value)}    className="min-h-[60px]" />
                <Input label={t.field_send_at} type="datetime-local"                 value={emailAt}      onChange={e => setEmailAt(e.target.value)}      />
              </div>
            )}
          </div>

          {/* WhatsApp */}
          <div className="p-3 border-t border-slate-700">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={addWhatsApp} onChange={e => setAddWhatsApp(e.target.checked)} className="accent-primary-500" />
              <MessageCircle size={14} className="text-green-400" />
              {t.schedule_whatsapp}
            </label>
            {addWhatsApp && (
              <div className="mt-3 space-y-2 pl-6">
                <Input label={t.field_phone}   placeholder="+972..." value={wpTo}      onChange={e => setWpTo(e.target.value)}      />
                <Textarea label={t.field_message}                    value={wpMessage} onChange={e => setWpMessage(e.target.value)} className="min-h-[80px]" />
                <Input label={t.field_send_at} type="datetime-local" value={wpAt}      onChange={e => setWpAt(e.target.value)}      />
              </div>
            )}
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {editEvent && (
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 size={13} />
                {t.btn_delete}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t.btn_cancel}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
              {editEvent ? t.btn_update : t.btn_create} {t.btn_event_suffix}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
