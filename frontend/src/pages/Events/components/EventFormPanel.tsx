/**
 * Events/components/EventFormPanel.tsx
 * --------------------------------------
 * Form panel for creating or editing a CalendarEvent.
 * Shown on the right side of EventsPage.
 */

import { useState, useEffect, useMemo, KeyboardEvent } from 'react';
import { X, Trash2, Paperclip, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { GradientButton } from '@/shared/components/ui/GradientButton';
import { AnimatePresence } from 'framer-motion';
import { type CalendarEvent, type EventColor, EVENT_COLOR_HEX, RECURRENCE_OPTIONS } from '@/shared/types/event.types';
import { type Folder } from '@/shared/types/note.types';
import { AttachmentModal } from '@/shared/components/Attachments/AttachmentModal';
import { HDate, months } from '@hebcal/core';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday,
} from 'date-fns';
import { useEvents } from '@/shared/context/EventsContext';

// ─── Hebrew helpers ───────────────────────────────────────────────────────────

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

const EVENT_HEX_MAP: Record<string, string> = {
  indigo: '#6366f1', emerald: '#10b981', amber: '#f59e0b',
  rose: '#f43f5e',   sky: '#0ea5e9',     violet: '#8b5cf6',
};

function gregToHebrew(dateStr: string): { day: number; month: number; year: number } {
  try {
    const hd = new HDate(new Date(dateStr + 'T00:00:00'));
    return { day: hd.getDate(), month: hd.getMonth(), year: hd.getFullYear() };
  } catch { return { day: 1, month: months.TISHREI, year: 5785 }; }
}

function hebrewToGreg(day: number, month: number, year: number): string | null {
  try {
    const g = new HDate(day, month, year).greg();
    return format(new Date(g.getFullYear(), g.getMonth(), g.getDate()), 'yyyy-MM-dd');
  } catch { return null; }
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const { events } = useEvents();
  const selDate = selected ? new Date(selected + 'T00:00:00') : new Date();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selDate));

  useEffect(() => {
    if (selected) setViewMonth(startOfMonth(new Date(selected + 'T00:00:00')));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.slice(0, 7)]);

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
    <div className="mt-2 p-3 bg-slate-900/60 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <ChevronLeft size={13} />
        </button>
        <span className="text-xs font-semibold text-slate-300">{format(viewMonth, 'MMMM yyyy')}</span>
        <button type="button" onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <ChevronRight size={13} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[10px] text-slate-500 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {gridDays.map((d, i) => {
          const inMonth = isSameMonth(d, viewMonth);
          const dateStr = format(d, 'yyyy-MM-dd');
          const isSel   = selected === dateStr;
          const isT     = isToday(d);
          const dots    = (eventsByDate[dateStr] ?? []).slice(0, 3);
          return (
            <button key={i} type="button" onClick={() => onSelect(dateStr)}
              className={clsx(
                'flex flex-col items-center py-0.5 rounded text-xs transition-colors',
                !inMonth && 'opacity-30',
                isSel  && 'bg-indigo-600 text-white',
                !isSel && isT  && 'bg-indigo-900/50 text-indigo-300',
                !isSel && !isT && 'text-slate-300 hover:bg-slate-700',
              )}>
              <span>{d.getDate()}</span>
              {dots.length > 0 && inMonth && (
                <div className="flex gap-0.5 mt-0.5">
                  {dots.map((c, ci) => (
                    <div key={ci} style={{ width: 4, height: 4, borderRadius: '50%', background: EVENT_HEX_MAP[c] ?? '#6366f1' }} />
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
import { getAttachmentCount } from '@/shared/hooks/useAttachments';

// ─────────────────────────────────────────────────────────────────────────────

interface EventFormPanelProps {
  event: CalendarEvent | null; // null = create mode
  onSave: (data: Partial<CalendarEvent>) => void;
  onDelete?: () => void;
  onClose: () => void;
  folders: Folder[];
}

const EVENT_COLORS: EventColor[] = ['indigo', 'emerald', 'amber', 'rose', 'sky', 'violet'];

const inputClass = 'w-full h-8 px-3 rounded-md bg-slate-900 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 transition-colors';
const labelClass = 'block text-xs text-slate-400 uppercase tracking-wide mb-1';

export function EventFormPanel({ event, onSave, onDelete, onClose, folders }: EventFormPanelProps) {
  const isEdit = event !== null;

  const [title, setTitle] = useState(event?.title ?? '');
  const [date, setDate] = useState(event?.date ?? new Date().toISOString().slice(0, 10));
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [startTime, setStartTime] = useState(event?.startTime ?? '');
  const [endTime, setEndTime] = useState(event?.endTime ?? '');
  const [color, setColor] = useState<EventColor>(event?.color ?? 'indigo');
  const [tags, setTags] = useState<string[]>(event?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [folderId, setFolderId] = useState<string | null>(event?.folderId ?? null);
  const [recurrence, setRecurrence] = useState<CalendarEvent['recurrence']>(event?.recurrence ?? 'none');
  const [recurrenceEnd, setRecurrenceEnd] = useState(event?.recurrenceEnd ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [attachCount, setAttachCount] = useState(() => event ? getAttachmentCount(event.id) : 0);

  // Hebrew date state (synced from `date`)
  const [hDay,         setHDay]         = useState(() => gregToHebrew(event?.date ?? new Date().toISOString().slice(0, 10)).day);
  const [hMonth,       setHMonth]       = useState(() => gregToHebrew(event?.date ?? new Date().toISOString().slice(0, 10)).month);
  const [hYear,        setHYear]        = useState(() => gregToHebrew(event?.date ?? new Date().toISOString().slice(0, 10)).year);
  const [showCalPicker, setShowCalPicker] = useState(false);

  // Sync selectedDate → Hebrew fields when date changes externally
  useEffect(() => {
    const h = gregToHebrew(date);
    setHDay(h.day); setHMonth(h.month); setHYear(h.year);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleHebrewDay = (v: number) => {
    setHDay(v);
    const g = hebrewToGreg(v, hMonth, hYear);
    if (g) setDate(g);
  };
  const handleHebrewMonth = (v: number) => {
    setHMonth(v);
    const g = hebrewToGreg(hDay, v, hYear);
    if (g) setDate(g);
  };
  const handleHebrewYear = (v: number) => {
    setHYear(v);
    const g = hebrewToGreg(hDay, hMonth, v);
    if (g) setDate(g);
  };

  // Refresh attachment count when event changes
  useEffect(() => { setAttachCount(event ? getAttachmentCount(event.id) : 0); }, [event?.id]);

  // Sync form when event changes
  useEffect(() => {
    setTitle(event?.title ?? '');
    setDate(event?.date ?? new Date().toISOString().slice(0, 10));
    setAllDay(event?.allDay ?? true);
    setStartTime(event?.startTime ?? '');
    setEndTime(event?.endTime ?? '');
    setColor(event?.color ?? 'indigo');
    setTags(event?.tags ?? []);
    setTagInput('');
    setFolderId(event?.folderId ?? null);
    setRecurrence(event?.recurrence ?? 'none');
    setRecurrenceEnd(event?.recurrenceEnd ?? '');
    setDescription(event?.description ?? '');
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags(prev => [...prev, newTag]);
      }
      setTagInput('');
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleSave = () => {
    if (!title.trim() || !date) return;
    onSave({
      title: title.trim(),
      date,
      allDay,
      startTime: allDay ? undefined : (startTime || undefined),
      endTime: allDay ? undefined : (endTime || undefined),
      color,
      tags,
      folderId,
      recurrence,
      recurrenceEnd: recurrence !== 'none' && recurrenceEnd ? recurrenceEnd : undefined,
      description: description || undefined,
    });
  };

  return (
    <div className="flex h-full flex-col bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-100">
          {isEdit ? 'Edit Event' : 'New Event'}
        </h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {/* Title */}
        <div>
          <label className={labelClass}>Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Event title..."
            className={inputClass}
            autoFocus
          />
        </div>

        {/* Date */}
        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className={labelClass}>Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={inputClass}
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
            <label className={labelClass}>Hebrew Date</label>
            <div className="flex gap-2" dir="rtl">
              <input
                type="number" min={1} max={30} value={hDay}
                onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= 30) handleHebrewDay(v); }}
                className="w-14 h-8 px-1 rounded-md bg-slate-900 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 text-center"
                title="Hebrew day"
              />
              <select
                value={hMonth}
                onChange={e => handleHebrewMonth(parseInt(e.target.value))}
                className={clsx(inputClass, 'flex-1 cursor-pointer px-2')}
              >
                {HEBREW_MONTHS_LIST.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <input
                type="number" min={5700} max={6000} value={hYear}
                onChange={e => { const v = parseInt(e.target.value); if (v >= 5700 && v <= 6000) handleHebrewYear(v); }}
                className="w-20 h-8 px-1 rounded-md bg-slate-900 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 text-center"
                title="Hebrew year"
              />
            </div>
          </div>

          {/* Inline calendar picker */}
          {showCalPicker && (
            <MiniCalendar
              selected={date}
              onSelect={d => { setDate(d); setShowCalPicker(false); }}
            />
          )}
        </div>

        {/* All Day toggle */}
        <div className="flex items-center justify-between">
          <label className={labelClass + ' mb-0'}>All Day</label>
          <button
            type="button"
            onClick={() => setAllDay(prev => !prev)}
            className={clsx(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              allDay ? 'bg-indigo-600' : 'bg-slate-700',
            )}
          >
            <span
              className={clsx(
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                allDay ? 'translate-x-[18px]' : 'translate-x-[3px]',
              )}
            />
          </button>
        </div>

        {/* Start / End Time */}
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Color */}
        <div>
          <label className={labelClass}>Color</label>
          <div className="flex gap-2 flex-wrap">
            {EVENT_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={clsx(
                  'w-6 h-6 rounded-full transition-all hover:scale-110',
                  color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-800' : '',
                )}
                style={{ backgroundColor: EVENT_COLOR_HEX[c] }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className={labelClass}>Tags</label>
          <div className="min-h-[32px] flex flex-wrap gap-1 items-center px-2 py-1 rounded-md bg-slate-900 border border-slate-700 focus-within:border-indigo-500 transition-colors">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-slate-700 text-slate-300 text-[10px]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-slate-500 hover:text-slate-200"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length === 0 ? 'Add tags (Enter)...' : ''}
              className="flex-1 min-w-[80px] bg-transparent text-xs text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Folder */}
        <div>
          <label className={labelClass}>Folder</label>
          <select
            value={folderId ?? ''}
            onChange={e => setFolderId(e.target.value || null)}
            className={clsx(inputClass, 'cursor-pointer')}
          >
            <option value="">No Folder</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Recurrence */}
        <div>
          <label className={labelClass}>Recurrence</label>
          <select
            value={recurrence}
            onChange={e => setRecurrence(e.target.value as CalendarEvent['recurrence'])}
            className={clsx(inputClass, 'cursor-pointer')}
          >
            {RECURRENCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Recurrence End */}
        {recurrence !== 'none' && (
          <div>
            <label className={labelClass}>Recurrence End</label>
            <input
              type="date"
              value={recurrenceEnd}
              onChange={e => setRecurrenceEnd(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional notes..."
            rows={3}
            className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Footer buttons */}
      <div className="border-t border-slate-700 px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {isEdit && onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
          {isEdit && event && (
            <button
              onClick={() => setAttachmentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {attachCount > 0
                ? <span className="text-indigo-400">{attachCount} attachment{attachCount !== 1 ? 's' : ''}</span>
                : 'Attach'
              }
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <GradientButton
            text={isEdit ? 'Save Changes' : 'Save Event'}
            onClick={handleSave}
            disabled={!title.trim() || !date}
            size="sm"
          />
        </div>
      </div>

      {/* Attachment modal */}
      <AnimatePresence>
        {attachmentModalOpen && event && (
          <AttachmentModal
            entityId={event.id}
            entityType="event"
            entityTitle={event.title || 'Untitled Event'}
            onClose={() => { setAttachmentModalOpen(false); setAttachCount(getAttachmentCount(event.id)); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
