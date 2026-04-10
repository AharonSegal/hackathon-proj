/**
 * pages/Todos/components/TaskEditor.tsx
 * ----------------------------------------
 * Full task editor — dark theme matching the app's slate/indigo palette.
 *
 * TODO (future): re-add Reminders (push notifications) once a notification
 *   backend is in place. Spec is documented in docs/task-editor-spec.md §6.
 * TODO (future): re-add Project / Inbox selector once multi-project support
 *   is implemented in the DB and API. Spec in docs/task-editor-spec.md §10.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar, Paperclip, Flag, MapPin, AlertTriangle,
  X, Sun, CalendarRange, CalendarDays, ArrowRight, CircleOff,
  ChevronLeft, ChevronRight, Clock, Repeat, Check, Bell,
  File, FileText, Image as ImageIcon,
} from 'lucide-react';
import { NotificationPicker } from '@/shared/components/NotificationPicker';
import type { BrowserNotification } from '@/shared/types/event.types';
import { HDate, HebrewCalendar } from '@hebcal/core';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isToday,
  isSameDay, isSameMonth, addDays,
} from 'date-fns';
import { useEvents } from '@/shared/context/EventsContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Priority = 1 | 2 | 3 | 4;

// Kept for API compatibility — UI for reminders is a future TODO
export interface ReminderItem {
  id: string;
  mode: 'datetime' | 'before';
  value: string;
}

export interface LocalAttachment {
  id: string;
  name: string;
  size: number;
  isImage: boolean;
  isPdf: boolean;
}

export interface TaskFormData {
  title: string;
  description: string;
  dueDate: string | null;
  dueTime: string | null;
  deadline: string | null;
  priority: Priority;
  /** Serialised as JSON: {"address":"…","place":"…","other":"…"} or null */
  location: string | null;
  reminders: ReminderItem[]; // future feature — always [] for now
  recurrence: string;
  recurrenceEnd: string | null;
  project: string; // future feature — always 'Inbox' for now
  attachments: LocalAttachment[];
}

interface TaskEditorProps {
  initialData?: Partial<TaskFormData>;
  isEditing?: boolean;
  onSave: (data: TaskFormData) => void;
  onCancel: () => void;
}

// ─── Theme constants ──────────────────────────────────────────────────────────

const T = {
  bgMain:    '#1e293b',   // slate-800
  bgSection: '#0f172a',   // slate-900
  bgInput:   '#0f172a',
  bgHover:   '#273347',
  border:    '#334155',   // slate-700
  borderFocus:'#6366f1',
  textPrim:  '#f1f5f9',
  textSec:   '#94a3b8',
  textMuted: '#64748b',
  primary:   '#6366f1',   // indigo-500
  primaryHov:'#4f46e5',
  today:     '#6366f1',
  selectedBg:'rgba(99,102,241,0.2)',
};

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITIES: { level: Priority; label: string; color: string; fill: boolean }[] = [
  { level: 1, label: 'Priority 1', color: '#db4c3f', fill: true  },
  { level: 2, label: 'Priority 2', color: '#f49c18', fill: true  },
  { level: 3, label: 'Priority 3', color: '#4073ff', fill: true  },
  { level: 4, label: 'Priority 4', color: '#64748b', fill: false },
];

const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

// ─── Event color map (for calendar dots) ─────────────────────────────────────

const EVENT_HEX: Record<string, string> = {
  indigo:  '#6366f1',
  emerald: '#10b981',
  amber:   '#f59e0b',
  rose:    '#f43f5e',
  sky:     '#0ea5e9',
  violet:  '#8b5cf6',
};

// ─── Location helpers ─────────────────────────────────────────────────────────

interface LocFields { address: string; place: string; other: string }

function parseLocation(raw: string | null): LocFields {
  if (!raw) return { address: '', place: '', other: '' };
  try {
    const p = JSON.parse(raw);
    if ('address' in p || 'place' in p || 'other' in p)
      return { address: p.address ?? '', place: p.place ?? '', other: p.other ?? '' };
  } catch { /* not JSON */ }
  return { address: raw, place: '', other: '' };
}

function serializeLocation(f: LocFields): string | null {
  if (!f.address && !f.place && !f.other) return null;
  return JSON.stringify({ address: f.address, place: f.place, other: f.other });
}

function locationChipLabel(f: LocFields): string {
  return f.address || f.place || f.other || 'Location';
}

// ─── Quick-pick helpers ───────────────────────────────────────────────────────

function getQuickPickDate(key: string): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  switch (key) {
    case 'tomorrow':      return addDays(today, 1);
    case 'laterThisWeek': { const d = (3 - dow + 7) % 7; return addDays(today, d > 0 ? d : 7); }
    case 'thisWeekend':   { const d = (6 - dow + 7) % 7; return addDays(today, d > 0 ? d : 7); }
    case 'nextWeek':      { const d = (1 - dow + 7) % 7; return addDays(today, d > 0 ? d : 7); }
    default: return null;
  }
}

// ─── Hebrew helpers ───────────────────────────────────────────────────────────

function hebrewDay(date: Date): string {
  try { return String(new HDate(date).getDate()); } catch { return String(date.getDate()); }
}

function hebrewMonthYear(date: Date): string {
  try {
    const hd = new HDate(new Date(date.getFullYear(), date.getMonth(), 15));
    return `${hd.getMonthName()} ${hd.getFullYear()}`;
  } catch { return format(date, 'MMM yyyy'); }
}

// ─── CalendarPicker ───────────────────────────────────────────────────────────

function CalendarPicker({
  selected, onSelect, mode,
}: { selected: Date | null; onSelect: (d: Date | null) => void; mode: 'gregorian' | 'hebrew' }) {
  const { events } = useEvents();

  const [viewMonth, setViewMonth] = useState(() =>
    selected ? startOfMonth(selected) : startOfMonth(new Date())
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const gridDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(viewMonth),     { weekStartsOn: 1 }),
  });

  // Hebrew holidays for the grid range
  const holidaysByDate = useMemo(() => {
    const start = gridDays[0];
    const end   = gridDays[gridDays.length - 1];
    try {
      const hebEvs = HebrewCalendar.calendar({
        start, end, il: true,
        sedrot: false, candlelighting: false, havdalah: false,
        omer: false, yomKippurKatan: false,
      } as Parameters<typeof HebrewCalendar.calendar>[0]);
      const map: Record<string, string> = {};
      for (const ev of hebEvs) {
        const key  = ev.getDate().greg().toISOString().slice(0, 10);
        const desc = ev.getDesc();
        if (!map[key]) map[key] = desc.length > 16 ? desc.slice(0, 14) + '…' : desc;
      }
      return map;
    } catch { return {}; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth]);

  // User events indexed by date string
  const eventsByDate = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const ev of events) {
      (map[ev.date] ??= []).push(ev.color);
    }
    return map;
  }, [events]);

  const header = mode === 'hebrew'
    ? hebrewMonthYear(viewMonth)
    : format(viewMonth, 'MMM yyyy');

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 8 }}>
        <button onClick={() => setViewMonth(m => subMonths(m, 1))} style={navBtn}>
          <ChevronLeft size={16} color={T.textSec} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.textPrim }}>{header}</span>
          <button onClick={() => setViewMonth(startOfMonth(new Date()))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} title="Today">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.textMuted }} />
          </button>
        </div>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))} style={navBtn}>
          <ChevronRight size={16} color={T.textSec} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 34px)', gap: 1, marginBottom: 2 }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ width: 34, textAlign: 'center', fontSize: 11, color: T.textMuted, fontWeight: 500 }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 34px)', gap: 1 }}>
        {gridDays.map((day, i) => {
          const inMonth  = isSameMonth(day, viewMonth);
          const isSel    = selected ? isSameDay(day, selected) : false;
          const isToday_ = isToday(day);
          const past     = day < today && !isToday_;
          const dateKey  = format(day, 'yyyy-MM-dd');
          const holiday  = holidaysByDate[dateKey];
          const evColors = eventsByDate[dateKey] ?? [];

          let numBg    = 'transparent';
          let numColor = inMonth ? (past ? T.textMuted : T.textPrim) : '#3d4f66';

          if (isToday_)        { numBg = T.today;        numColor = 'white'; }
          else if (isSel)      { numBg = T.selectedBg;   numColor = T.primary; }

          return (
            <div key={i} onClick={() => onSelect(day)}
              style={{ width: 34, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 2 }}
            >
              {/* Date number */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: numBg, color: numColor,
                fontWeight: isSel || isToday_ ? 600 : 400,
                border: 'none', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isToday_ && !isSel) (e.currentTarget as HTMLElement).style.background = T.bgHover; }}
              onMouseLeave={e => { if (!isToday_ && !isSel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {mode === 'hebrew' ? hebrewDay(day) : day.getDate()}
              </div>

              {/* Holiday label */}
              {holiday && inMonth && (
                <div style={{ fontSize: 8, color: '#f59e0b', lineHeight: 1.2, textAlign: 'center', maxWidth: 34, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {holiday}
                </div>
              )}

              {/* Event dots */}
              {evColors.length > 0 && inMonth && (
                <div style={{ display: 'flex', gap: 2, marginTop: 1 }}>
                  {evColors.slice(0, 3).map((c, ci) => (
                    <div key={ci} style={{ width: 4, height: 4, borderRadius: '50%', background: EVENT_HEX[c] ?? T.primary }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DateSection ──────────────────────────────────────────────────────────────

function DateSection({
  date, onDateChange, calMode, onCalModeChange,
  showTime, setShowTime, dueTime, setDueTime,
  recurrence, setRecurrence,
}: {
  date: Date | null; onDateChange: (d: Date | null) => void;
  calMode: 'gregorian' | 'hebrew'; onCalModeChange: (m: 'gregorian' | 'hebrew') => void;
  showTime: boolean; setShowTime: (v: boolean) => void;
  dueTime: string | null; setDueTime: (v: string | null) => void;
  recurrence: string; setRecurrence: (v: string) => void;
}) {
  const [timeHour, setTimeHour]   = useState('12');
  const [timeMin, setTimeMin]     = useState('00');
  const [timeAmPm, setTimeAmPm]   = useState<'AM' | 'PM'>('PM');
  const [showRepeat, setShowRepeat] = useState(false);

  const applyTime = () => {
    let h = parseInt(timeHour, 10);
    if (timeAmPm === 'PM' && h !== 12) h += 12;
    if (timeAmPm === 'AM' && h === 12) h = 0;
    setDueTime(`${String(h).padStart(2,'0')}:${timeMin}`);
    setShowTime(false);
  };

  const QUICK = [
    { key: 'tomorrow',     icon: <Sun size={16} color="#ff9a14" />,         label: 'Tomorrow' },
    { key: 'laterThisWeek',icon: <CalendarRange size={16} color="#7c3aed" />, label: 'Later this week' },
    { key: 'thisWeekend',  icon: <CalendarDays size={16} color="#0ea5e9" />, label: 'This weekend' },
    { key: 'nextWeek',     icon: <ArrowRight size={16} color="#8b5cf6" />,  label: 'Next week' },
    { key: 'noDate',       icon: <CircleOff size={16} color={T.textMuted}/>, label: 'No Date' },
  ];

  return (
    <div style={panelStyle}>
      {/* Calendar mode toggle */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 10, background: '#0a1220', borderRadius: 8, padding: 3 }}>
        {(['gregorian','hebrew'] as const).map(m => (
          <button key={m} onClick={() => onCalModeChange(m)} style={{
            flex: 1, padding: '5px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: calMode === m ? T.primary : 'transparent',
            color: calMode === m ? 'white' : T.textSec,
            fontSize: 12, fontWeight: 500, transition: 'all 0.15s',
          }}>
            {m === 'gregorian' ? 'Gregorian' : 'Hebrew'}
          </button>
        ))}
      </div>

      {/* Quick picks */}
      <div style={{ marginBottom: 6 }}>
        {QUICK.map(({ key, icon, label }) => {
          const d = getQuickPickDate(key);
          return (
            <div key={key} onClick={() => { onDateChange(d); if (!d) setDueTime(null); }}
              style={qRowStyle}
              onMouseEnter={e => (e.currentTarget.style.background = T.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {icon}
              <span style={{ flex: 1, fontSize: 13, color: T.textPrim }}>{label}</span>
              <span style={{ fontSize: 11, color: T.textMuted }}>
                {d ? format(d, 'EEE, MMM d') : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div style={divider} />
      <CalendarPicker selected={date} onSelect={onDateChange} mode={calMode} />
      <div style={divider} />

      {/* Time button */}
      <button onClick={() => setShowTime(!showTime)} style={subBtn}>
        <Clock size={14} color={T.textSec} />
        <span style={{ flex: 1, textAlign: 'left', color: dueTime ? T.textPrim : T.textMuted }}>
          {dueTime ? `Time: ${fmt12(dueTime)}` : 'Time'}
        </span>
        {dueTime && (
          <span onClick={e => { e.stopPropagation(); setDueTime(null); setShowTime(false); }} style={{ display: 'flex' }}>
            <X size={12} color={T.textMuted} />
          </span>
        )}
      </button>

      {showTime && (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: 10, marginBottom: 8, background: T.bgSection, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <select value={timeHour} onChange={e => setTimeHour(e.target.value)} style={selectSt}>
            {Array.from({length:12},(_,i)=>String(i+1)).map(h=><option key={h} value={h}>{h}</option>)}
          </select>
          <span style={{ color: T.textSec, fontWeight: 700 }}>:</span>
          <select value={timeMin} onChange={e => setTimeMin(e.target.value)} style={selectSt}>
            {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <div style={{ display: 'flex', border: `1px solid ${T.border}`, borderRadius: 6, overflow: 'hidden' }}>
            {(['AM','PM'] as const).map(ap=>(
              <button key={ap} onClick={() => setTimeAmPm(ap)} style={{
                padding: '5px 8px', border: 'none', cursor: 'pointer', fontSize: 12,
                background: timeAmPm===ap ? T.primary : 'transparent',
                color: timeAmPm===ap ? 'white' : T.textSec,
              }}>{ap}</button>
            ))}
          </div>
          <button onClick={applyTime} style={primaryBtn}>Set</button>
        </div>
      )}

      {/* Repeat button */}
      <button onClick={() => setShowRepeat(p=>!p)} style={subBtn}>
        <Repeat size={14} color={T.textSec} />
        <span style={{ flex: 1, textAlign: 'left', color: recurrence !== 'none' ? T.textPrim : T.textMuted }}>
          {recurrence !== 'none' ? `Repeat: ${recurrence.charAt(0).toUpperCase()+recurrence.slice(1)}` : 'Repeat'}
        </span>
      </button>

      {showRepeat && (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {RECURRENCE_OPTIONS.map(opt => (
            <div key={opt} onClick={() => { setRecurrence(opt); setShowRepeat(false); }}
              style={{ ...qRowStyle, background: recurrence===opt ? 'rgba(99,102,241,0.12)' : 'transparent' }}
              onMouseEnter={e => { if(recurrence!==opt) e.currentTarget.style.background=T.bgHover; }}
              onMouseLeave={e => { if(recurrence!==opt) e.currentTarget.style.background='transparent'; }}
            >
              <span style={{ flex: 1, fontSize: 13, color: recurrence===opt ? T.primary : T.textPrim }}>
                {opt === 'none' ? 'No repeat' : opt.charAt(0).toUpperCase()+opt.slice(1)}
              </span>
              {recurrence===opt && <Check size={14} color={T.primary} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared inline styles ─────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: T.bgSection, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: '10px 12px', marginTop: 6,
};

const qRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 6px', cursor: 'pointer', borderRadius: 6,
  transition: 'background 0.1s',
};

const divider: React.CSSProperties = { height: 1, background: T.border, margin: '8px 0' };

const subBtn: React.CSSProperties = {
  width: '100%', border: `1px solid ${T.border}`, borderRadius: 8,
  padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7,
  background: T.bgSection, cursor: 'pointer', marginBottom: 6, fontSize: 13,
};

const selectSt: React.CSSProperties = {
  border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 6px',
  fontSize: 13, background: T.bgMain, color: T.textPrim,
};

const primaryBtn: React.CSSProperties = {
  background: T.primary, color: 'white', border: 'none',
  borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
};

const navBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
  display: 'flex', alignItems: 'center',
};

function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  return `${h%12||12}:${String(m).padStart(2,'0')} ${ap}`;
}

// ─── TaskEditor ───────────────────────────────────────────────────────────────

export function TaskEditor({ initialData, isEditing = false, onSave, onCancel }: TaskEditorProps) {
  const [title, setTitle]           = useState(initialData?.title ?? '');
  const [description, setDesc]      = useState(initialData?.description ?? '');
  const [dueDate, setDueDate]       = useState<Date | null>(() => initialData?.dueDate ? new Date(initialData.dueDate) : null);
  const [dueTime, setDueTime]       = useState<string | null>(initialData?.dueTime ?? null);
  const [deadline, setDeadline]     = useState<Date | null>(() => initialData?.deadline ? new Date(initialData.deadline) : null);
  const [priority, setPriority]     = useState<Priority>((initialData?.priority as Priority) ?? 4);
  const [recurrence, setRecurrence] = useState(initialData?.recurrence ?? 'none');
  const [attachments, setAttachments] = useState<LocalAttachment[]>(initialData?.attachments ?? []);

  // Location: 3-field object serialised to JSON on save
  const [loc, setLoc] = useState<LocFields>(() => parseLocation(initialData?.location ?? null));

  // Reminders stored as BrowserNotification[], serialised to ReminderItem[] on save
  const [reminders, setReminders] = useState<BrowserNotification[]>(() =>
    (initialData?.reminders ?? []).map(r => ({
      id: r.id,
      offsetMinutes: parseInt(String(r.value), 10) || 0,
    }))
  );

  type Section = 'date' | 'priority' | 'location' | 'deadline' | 'reminders' | null;
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [dateCalMode, setDateCalMode]       = useState<'gregorian' | 'hebrew'>('gregorian');
  const [deadlineCalMode, setDeadlineCalMode] = useState<'gregorian' | 'hebrew'>('gregorian');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descRef      = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveSection(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggle = (s: Section) => setActiveSection(p => p === s ? null : s);

  const growDesc = () => {
    const el = descRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachments(prev => [...prev, ...files.map(f => ({
      id: crypto.randomUUID(), name: f.name, size: f.size,
      isImage: f.type.startsWith('image/'), isPdf: f.type === 'application/pdf',
    }))]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(), description,
      dueDate:  dueDate  ? format(dueDate,  'yyyy-MM-dd') : null,
      dueTime,
      deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
      priority,
      location: serializeLocation(loc),
      reminders: reminders.map(r => ({ id: r.id, mode: 'before' as const, value: String(r.offsetMinutes) })),
      recurrence, recurrenceEnd: null,
      project: 'Inbox',  // TODO: implement multi-project support — see file header
      attachments,
    });
  };

  // Chip style
  const chip = (active: boolean, activeColor = T.primary): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    border: `1px solid ${active ? activeColor : T.border}`,
    borderRadius: 20, padding: '5px 10px', fontSize: 12,
    color: active ? activeColor : T.textSec,
    background: active ? `${activeColor}20` : 'transparent',
    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
  });

  const pCfg   = PRIORITIES.find(p => p.level === priority)!;
  const hasLoc = !!(loc.address || loc.place || loc.other);
  const deadlineLabel = deadline ? format(deadline, 'MMM d') : 'Deadline';

  return (
    <div style={{
      background: T.bgMain, border: `1px solid ${T.border}`, borderRadius: 12,
      padding: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      {/* Title */}
      <input
        autoFocus value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
        placeholder="Task name"
        style={{
          width: '100%', border: 'none', outline: 'none', fontSize: 18,
          fontWeight: 600, color: T.textPrim, background: 'transparent',
          borderBottom: `1px solid transparent`, paddingBottom: 4,
          marginBottom: 8, boxSizing: 'border-box', transition: 'border-color 0.15s',
          fontFamily: 'inherit',
        }}
        onFocus={e => (e.target.style.borderBottomColor = T.border)}
        onBlur={e => (e.target.style.borderBottomColor = 'transparent')}
      />

      {/* Description */}
      <textarea
        ref={descRef} value={description}
        onChange={e => { setDesc(e.target.value); growDesc(); }}
        placeholder="Description"
        rows={1}
        style={{
          width: '100%', border: 'none', outline: 'none', resize: 'none',
          fontSize: 13, color: T.textSec, background: 'transparent',
          marginBottom: 12, boxSizing: 'border-box', overflowY: 'hidden',
          fontFamily: 'inherit',
        }}
      />

      {/* ── Toolbar chips ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>

        {/* Date */}
        <button style={chip(!!dueDate, '#4ade80')} onClick={() => toggle('date')}>
          <Calendar size={14} color={dueDate ? '#4ade80' : T.textSec} />
          <span>{dueDate ? format(dueDate, 'MMM d') : 'Date'}</span>
          {dueDate && (
            <span onClick={e => { e.stopPropagation(); setDueDate(null); setDueTime(null); }} style={{ display: 'flex' }}>
              <X size={12} color={T.textMuted} />
            </span>
          )}
        </button>

        {/* Attachment */}
        <button style={chip(attachments.length > 0)} onClick={() => { setActiveSection(null); fileInputRef.current?.click(); }}>
          <Paperclip size={14} color={T.textSec} />
          <span>Attachment{attachments.length > 0 ? ` (${attachments.length})` : ''}</span>
        </button>

        {/* Priority */}
        <button style={{ ...chip(priority < 4, pCfg.color) }} onClick={() => toggle('priority')}>
          <Flag size={14} color={pCfg.color} fill={pCfg.fill ? pCfg.color : 'none'} />
          <span>Priority{priority < 4 ? ` ${priority}` : ''}</span>
        </button>

        {/* Location */}
        <button style={chip(hasLoc)} onClick={() => toggle('location')}>
          <MapPin size={14} color={hasLoc ? T.primary : T.textSec} />
          <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {locationChipLabel(loc)}
          </span>
          {hasLoc && (
            <span onClick={e => { e.stopPropagation(); setLoc({ address:'', place:'', other:'' }); }} style={{ display: 'flex' }}>
              <X size={12} color={T.textMuted} />
            </span>
          )}
        </button>

        {/* Deadline */}
        <button style={chip(!!deadline)} onClick={() => toggle('deadline')}>
          <AlertTriangle size={14} color={deadline ? T.primary : T.textSec} />
          <span>{deadlineLabel}</span>
          {deadline && (
            <span onClick={e => { e.stopPropagation(); setDeadline(null); }} style={{ display: 'flex' }}>
              <X size={12} color={T.textMuted} />
            </span>
          )}
        </button>

        {/* Reminders */}
        <button style={chip(reminders.length > 0, T.primary)} onClick={() => toggle('reminders')}>
          <Bell size={14} color={reminders.length > 0 ? T.primary : T.textSec} />
          <span>Remind{reminders.length > 0 ? ` (${reminders.length})` : ''}</span>
          {reminders.length > 0 && (
            <span onClick={e => { e.stopPropagation(); setReminders([]); }} style={{ display: 'flex' }}>
              <X size={12} color={T.textMuted} />
            </span>
          )}
        </button>
      </div>

      <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFiles} />

      {/* ── Date section ── */}
      {activeSection === 'date' && (
        <DateSection
          date={dueDate} onDateChange={setDueDate}
          calMode={dateCalMode} onCalModeChange={setDateCalMode}
          showTime={showTimePicker} setShowTime={setShowTimePicker}
          dueTime={dueTime} setDueTime={setDueTime}
          recurrence={recurrence} setRecurrence={setRecurrence}
        />
      )}

      {/* ── Priority section ── */}
      {activeSection === 'priority' && (
        <div style={panelStyle}>
          {PRIORITIES.map(p => (
            <div key={p.level}
              onClick={() => { setPriority(p.level); setActiveSection(null); }}
              style={qRowStyle}
              onMouseEnter={e => (e.currentTarget.style.background = T.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Flag size={16} color={p.color} fill={p.fill ? p.color : 'none'} />
              <span style={{ flex: 1, fontSize: 13, color: T.textPrim }}>{p.label}</span>
              {priority === p.level && <Check size={14} color={T.primary} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Location section ── */}
      {activeSection === 'location' && (
        <div style={panelStyle}>
          {([
            { key: 'address' as const, label: 'Address',  placeholder: 'Street address, city…' },
            { key: 'place'   as const, label: 'Location', placeholder: 'Room, floor, building…' },
            { key: 'other'   as const, label: 'Other',    placeholder: 'Door code, directions…' },
          ]).map(({ key, label, placeholder }) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 3, fontWeight: 500 }}>{label}</div>
              <input
                value={loc[key]}
                onChange={e => setLoc(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{
                  width: '100%', border: `1px solid ${T.border}`, borderRadius: 7,
                  padding: '7px 10px', fontSize: 13, outline: 'none',
                  background: T.bgMain, color: T.textPrim, boxSizing: 'border-box',
                  transition: 'border-color 0.15s', fontFamily: 'inherit',
                }}
                onFocus={e => (e.target.style.borderColor = T.borderFocus)}
                onBlur={e => (e.target.style.borderColor = T.border)}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Deadline section ── */}
      {activeSection === 'deadline' && (
        <div style={panelStyle}>
          <p style={{ fontSize: 11, color: T.textMuted, marginBottom: 10 }}>
            A hard deadline, separate from the scheduled date.
          </p>
          <div style={{ display: 'flex', gap: 3, marginBottom: 10, background: '#0a1220', borderRadius: 8, padding: 3 }}>
            {(['gregorian','hebrew'] as const).map(m => (
              <button key={m} onClick={() => setDeadlineCalMode(m)} style={{
                flex: 1, padding: '5px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: deadlineCalMode === m ? T.primary : 'transparent',
                color: deadlineCalMode === m ? 'white' : T.textSec,
                fontSize: 12, fontWeight: 500,
              }}>
                {m === 'gregorian' ? 'Gregorian' : 'Hebrew'}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 8 }}>
            {[
              { key: 'tomorrow',     icon: <Sun size={16} color="#ff9a14"/>,          label: 'Tomorrow' },
              { key: 'laterThisWeek',icon: <CalendarRange size={16} color="#7c3aed"/>, label: 'Later this week' },
              { key: 'thisWeekend',  icon: <CalendarDays size={16} color="#0ea5e9"/>,  label: 'This weekend' },
              { key: 'nextWeek',     icon: <ArrowRight size={16} color="#8b5cf6"/>,    label: 'Next week' },
              { key: 'noDate',       icon: <CircleOff size={16} color={T.textMuted}/>, label: 'No Deadline' },
            ].map(({ key, icon, label }) => {
              const d = getQuickPickDate(key);
              return (
                <div key={key} onClick={() => setDeadline(d)}
                  style={qRowStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = T.bgHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {icon}
                  <span style={{ flex: 1, fontSize: 13, color: T.textPrim }}>{label}</span>
                  <span style={{ fontSize: 11, color: T.textMuted }}>{d ? format(d, 'EEE, MMM d') : '—'}</span>
                </div>
              );
            })}
          </div>
          <div style={divider} />
          <CalendarPicker selected={deadline} onSelect={setDeadline} mode={deadlineCalMode} />
        </div>
      )}

      {/* ── Reminders section ── */}
      {activeSection === 'reminders' && (
        <div style={panelStyle}>
          <p style={{ fontSize: 11, color: T.textMuted, marginBottom: 10 }}>
            Browser notifications before the due date.
          </p>
          <NotificationPicker
            value={reminders}
            onChange={setReminders}
            hasTime={!!dueTime}
          />
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {attachments.map(a => (
            <div key={a.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              border: `1px solid ${T.border}`, borderRadius: 7, padding: '5px 8px',
              fontSize: 11, color: T.textSec, background: T.bgSection,
            }}>
              {a.isImage ? <ImageIcon size={12} color={T.textMuted}/> : a.isPdf ? <FileText size={12} color={T.textMuted}/> : <File size={12} color={T.textMuted}/>}
              <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <span style={{ color: T.textMuted }}>{fmtSize(a.size)}</span>
              <button onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <X size={11} color={T.textMuted}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 14, paddingTop: 10, borderTop: `1px solid ${T.border}`, gap: 8 }}>
        <button onClick={onCancel} style={{ background: 'transparent', color: T.textSec, border: 'none', fontSize: 13, cursor: 'pointer', padding: '7px 12px' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={!title.trim()} style={{
          background: title.trim() ? T.primary : T.bgSection,
          color: title.trim() ? 'white' : T.textMuted,
          border: `1px solid ${title.trim() ? T.primary : T.border}`,
          borderRadius: 8, padding: '7px 18px', fontWeight: 600, fontSize: 13,
          cursor: title.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
        }}>
          {isEditing ? 'Save' : 'Add task'}
        </button>
      </div>
    </div>
  );
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

function fmtSize(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024*1024) return `${(b/1024).toFixed(0)}KB`;
  return `${(b/(1024*1024)).toFixed(1)}MB`;
}
