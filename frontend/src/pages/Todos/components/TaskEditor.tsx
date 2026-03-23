/**
 * pages/Todos/components/TaskEditor.tsx
 * ----------------------------------------
 * Todoist-style task editor for creating and editing todos.
 * Per spec: main-window editor (not a popup/modal), light theme.
 */

import { useState, useRef, useEffect } from 'react';
import {
  Calendar, Paperclip, Flag, Bell, MapPin, AlertTriangle,
  X, Sun, CalendarRange, CalendarDays, ArrowRight, CircleOff,
  ChevronLeft, ChevronRight, Clock, Repeat, Check,
  CalendarClock, ChevronDown, Inbox,
  File, FileText, Image as ImageIcon,
} from 'lucide-react';
import { HDate } from '@hebcal/core';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isToday,
  isSameDay, isSameMonth, addDays,
} from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Priority = 1 | 2 | 3 | 4;

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
  location: string;
  reminders: ReminderItem[];
  recurrence: string;
  recurrenceEnd: string | null;
  project: string;
  attachments: LocalAttachment[];
}

interface TaskEditorProps {
  initialData?: Partial<TaskFormData>;
  isEditing?: boolean;
  onSave: (data: TaskFormData) => void;
  onCancel: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES: { level: Priority; label: string; color: string; fill: boolean }[] = [
  { level: 1, label: 'Priority 1', color: '#db4c3f', fill: true },
  { level: 2, label: 'Priority 2', color: '#f49c18', fill: true },
  { level: 3, label: 'Priority 3', color: '#4073ff', fill: true },
  { level: 4, label: 'Priority 4', color: '#808080', fill: false },
];

const DATETIME_OPTIONS = [
  'At time of task', '5 minutes before', '10 minutes before',
  '15 minutes before', '30 minutes before', '1 hour before',
  '2 hours before', '1 day before',
];

const BEFORE_TASK_OPTIONS = [
  '5 minutes before', '10 minutes before', '15 minutes before',
  '30 minutes before', '1 hour before', '2 hours before',
  '1 day before', '2 days before', '1 week before',
];

const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getQuickPickDate(key: string): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  switch (key) {
    case 'tomorrow':
      return addDays(today, 1);
    case 'laterThisWeek': {
      const d = (3 - dow + 7) % 7;
      return addDays(today, d > 0 ? d : 7);
    }
    case 'thisWeekend': {
      const d = (6 - dow + 7) % 7;
      return addDays(today, d > 0 ? d : 7);
    }
    case 'nextWeek': {
      const d = (1 - dow + 7) % 7;
      return addDays(today, d > 0 ? d : 7);
    }
    default: return null;
  }
}

function getHebrewDay(date: Date): string {
  try { return String(new HDate(date).getDate()); } catch { return String(date.getDate()); }
}

function getHebrewMonthYear(date: Date): string {
  try {
    const hd = new HDate(new Date(date.getFullYear(), date.getMonth(), 15));
    return `${hd.getMonthName()} ${hd.getFullYear()}`;
  } catch { return format(date, 'MMM yyyy'); }
}

// ─── CalendarPicker ───────────────────────────────────────────────────────────

function CalendarPicker({
  selected, onSelect, mode,
}: { selected: Date | null; onSelect: (d: Date | null) => void; mode: 'gregorian' | 'hebrew' }) {
  const [viewMonth, setViewMonth] = useState(() =>
    selected ? startOfMonth(selected) : startOfMonth(new Date())
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  });

  const header = mode === 'hebrew'
    ? getHebrewMonthYear(viewMonth)
    : format(viewMonth, 'MMM yyyy');

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 8 }}>
        <button onClick={() => setViewMonth(m => subMonths(m, 1))} style={navBtnStyle}>
          <ChevronLeft size={18} color="#666" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#202020' }}>{header}</span>
          <button onClick={() => setViewMonth(startOfMonth(new Date()))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} title="Go to today">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ccc' }} />
          </button>
        </div>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))} style={navBtnStyle}>
          <ChevronRight size={18} color="#666" />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: 2, marginBottom: 4 }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ width: 36, textAlign: 'center', fontSize: 12, color: '#999', fontWeight: 500 }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: 2 }}>
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, viewMonth);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const todayCell = isToday(day);
          const past = day < today && !todayCell;

          let bg = 'transparent';
          let color = inMonth ? (past ? '#ccc' : '#202020') : '#ddd';

          if (todayCell)   { bg = '#db4c3f'; color = 'white'; }
          if (isSelected && !todayCell) { bg = '#fde8e8'; color = '#db4c3f'; }

          return (
            <button key={i} onClick={() => onSelect(day)} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: bg, color, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: isSelected ? 600 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!todayCell && !isSelected) (e.currentTarget as HTMLElement).style.background = '#f0f0f0'; }}
            onMouseLeave={e => { if (!todayCell && !isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {mode === 'hebrew' ? getHebrewDay(day) : day.getDate()}
            </button>
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
  date: Date | null;
  onDateChange: (d: Date | null) => void;
  calMode: 'gregorian' | 'hebrew';
  onCalModeChange: (m: 'gregorian' | 'hebrew') => void;
  showTime: boolean;
  setShowTime: (v: boolean) => void;
  dueTime: string | null;
  setDueTime: (v: string | null) => void;
  recurrence: string;
  setRecurrence: (v: string) => void;
}) {
  const [timeHour, setTimeHour] = useState('12');
  const [timeMinute, setTimeMinute] = useState('00');
  const [timeAmPm, setTimeAmPm] = useState<'AM' | 'PM'>('PM');
  const [showRepeat, setShowRepeat] = useState(false);

  const applyTime = () => {
    let h = parseInt(timeHour, 10);
    if (timeAmPm === 'PM' && h !== 12) h += 12;
    if (timeAmPm === 'AM' && h === 12) h = 0;
    setDueTime(`${String(h).padStart(2, '0')}:${timeMinute}`);
    setShowTime(false);
  };

  const quickPicks = [
    { key: 'tomorrow',     icon: <Sun size={18} color="#ff9a14" />,         label: 'Tomorrow' },
    { key: 'laterThisWeek',icon: <CalendarRange size={18} color="#7c3aed" />, label: 'Later this week' },
    { key: 'thisWeekend',  icon: <CalendarDays size={18} color="#0ea5e9" />, label: 'This weekend' },
    { key: 'nextWeek',     icon: <ArrowRight size={18} color="#8b5cf6" />,  label: 'Next week' },
    { key: 'noDate',       icon: <CircleOff size={18} color="#999" />,      label: 'No Date' },
  ];

  return (
    <div style={sectionStyle}>
      {/* Calendar mode toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: '#f0f0f0', borderRadius: 8, padding: 3 }}>
        {(['gregorian', 'hebrew'] as const).map(m => (
          <button key={m} onClick={() => onCalModeChange(m)} style={{
            flex: 1, padding: '6px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: calMode === m ? '#db4c3f' : 'transparent',
            color: calMode === m ? 'white' : '#666',
            fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
          }}>
            {m === 'gregorian' ? 'Gregorian' : 'Hebrew'}
          </button>
        ))}
      </div>

      {/* Quick picks */}
      <div style={{ marginBottom: 8 }}>
        {quickPicks.map(({ key, icon, label }) => {
          const resolved = getQuickPickDate(key);
          return (
            <div key={key}
              onClick={() => { onDateChange(resolved); if (!resolved) setDueTime(null); }}
              style={rowStyle}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {icon}
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ fontSize: 12, color: '#999' }}>
                {resolved ? format(resolved, 'EEE, MMM d') : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div style={dividerStyle} />

      <CalendarPicker selected={date} onSelect={onDateChange} mode={calMode} />

      <div style={dividerStyle} />

      {/* Time button */}
      <button onClick={() => setShowTime(!showTime)} style={subBtnStyle}>
        <Clock size={16} color="#555" />
        <span>{dueTime ? `Time: ${formatTime12(dueTime)}` : 'Time'}</span>
        {dueTime && (
          <span onClick={e => { e.stopPropagation(); setDueTime(null); setShowTime(false); }} style={{ marginLeft: 'auto', display: 'flex' }}>
            <X size={14} color="#999" />
          </span>
        )}
      </button>

      {showTime && (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, marginBottom: 8, background: '#fff' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <select value={timeHour} onChange={e => setTimeHour(e.target.value)} style={selectStyle}>
              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>:</span>
            <select value={timeMinute} onChange={e => setTimeMinute(e.target.value)} style={selectStyle}>
              {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div style={{ display: 'flex', border: '1px solid #e0e0e0', borderRadius: 6, overflow: 'hidden' }}>
              {(['AM', 'PM'] as const).map(ap => (
                <button key={ap} onClick={() => setTimeAmPm(ap)} style={{
                  padding: '6px 10px', border: 'none', cursor: 'pointer', fontSize: 13,
                  background: timeAmPm === ap ? '#db4c3f' : '#fff',
                  color: timeAmPm === ap ? 'white' : '#666',
                }}>{ap}</button>
              ))}
            </div>
            <button onClick={applyTime} style={actionBtnStyle}>Set</button>
          </div>
        </div>
      )}

      {/* Repeat button */}
      <button onClick={() => setShowRepeat(p => !p)} style={subBtnStyle}>
        <Repeat size={16} color="#555" />
        <span>{recurrence !== 'none'
          ? `Repeat: ${recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}`
          : 'Repeat'}
        </span>
      </button>

      {showRepeat && (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, marginTop: 4, overflow: 'hidden', background: '#fff' }}>
          {RECURRENCE_OPTIONS.map(opt => (
            <div key={opt}
              onClick={() => { setRecurrence(opt); setShowRepeat(false); }}
              style={{ ...rowStyle, background: recurrence === opt ? '#fde8e8' : 'transparent', color: recurrence === opt ? '#db4c3f' : '#333' }}
              onMouseEnter={e => { if (recurrence !== opt) e.currentTarget.style.background = '#f5f5f5'; }}
              onMouseLeave={e => { if (recurrence !== opt) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ flex: 1 }}>{opt === 'none' ? 'No repeat' : opt.charAt(0).toUpperCase() + opt.slice(1)}</span>
              {recurrence === opt && <Check size={16} color="#db4c3f" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared inline styles ─────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: '#fafafa', border: '1px solid #e8e8e8',
  borderRadius: 10, padding: '12px 16px', marginTop: 8,
};

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 8px', cursor: 'pointer', borderRadius: 6,
  fontSize: 14, color: '#333', transition: 'background 0.1s',
};

const dividerStyle: React.CSSProperties = {
  height: 1, background: '#e8e8e8', margin: '8px 0',
};

const subBtnStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #e0e0e0', borderRadius: 8,
  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
  background: '#fff', cursor: 'pointer', fontSize: 14, color: '#666',
  marginBottom: 8, textAlign: 'left',
};

const selectStyle: React.CSSProperties = {
  border: '1px solid #e0e0e0', borderRadius: 6, padding: '6px 8px', fontSize: 14,
};

const actionBtnStyle: React.CSSProperties = {
  background: '#db4c3f', color: 'white', border: 'none',
  borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
};

const navBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
};

// ─── TaskEditor ───────────────────────────────────────────────────────────────

export function TaskEditor({ initialData, isEditing = false, onSave, onCancel }: TaskEditorProps) {
  const [title, setTitle]           = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [dueDate, setDueDate]       = useState<Date | null>(() => initialData?.dueDate ? new Date(initialData.dueDate) : null);
  const [dueTime, setDueTime]       = useState<string | null>(initialData?.dueTime ?? null);
  const [deadline, setDeadline]     = useState<Date | null>(() => initialData?.deadline ? new Date(initialData.deadline) : null);
  const [priority, setPriority]     = useState<Priority>((initialData?.priority as Priority) ?? 4);
  const [location, setLocation]     = useState(initialData?.location ?? '');
  const [reminders, setReminders]   = useState<ReminderItem[]>(initialData?.reminders ?? []);
  const [recurrence, setRecurrence] = useState(initialData?.recurrence ?? 'none');
  const [project]                   = useState(initialData?.project ?? 'Inbox');
  const [attachments, setAttachments] = useState<LocalAttachment[]>(initialData?.attachments ?? []);

  type Section = 'date' | 'priority' | 'reminders' | 'location' | 'deadline' | null;
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [dateCalMode, setDateCalMode]       = useState<'gregorian' | 'hebrew'>('gregorian');
  const [deadlineCalMode, setDeadlineCalMode] = useState<'gregorian' | 'hebrew'>('gregorian');
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Reminders state
  const [reminderMode, setReminderMode] = useState<'datetime' | 'before'>('datetime');
  const [reminderValue, setReminderValue] = useState(DATETIME_OPTIONS[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Escape key closes active section
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveSection(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleSection = (section: Section) =>
    setActiveSection(prev => prev === section ? null : section);

  // Auto-expand textarea
  const growDesc = () => {
    const el = descRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  };

  // Attachment handling
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachments(prev => [...prev, ...files.map(f => ({
      id: crypto.randomUUID(),
      name: f.name, size: f.size,
      isImage: f.type.startsWith('image/'),
      isPdf: f.type === 'application/pdf',
    }))]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Reminder handling
  const addReminder = () => setReminders(prev => [...prev, {
    id: crypto.randomUUID(), mode: reminderMode, value: reminderValue,
  }]);
  const removeReminder = (id: string) => setReminders(prev => prev.filter(r => r.id !== id));

  // Save
  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(), description,
      dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      dueTime,
      deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
      priority, location, reminders, recurrence,
      recurrenceEnd: null, project, attachments,
    });
  };

  // Chip styles
  const chipBtnStyle = (active: boolean, activeColor = '#db4c3f'): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    border: `1px solid ${active ? activeColor : '#e0e0e0'}`,
    borderRadius: 20, padding: '6px 12px', fontSize: 13,
    color: active ? activeColor : '#555',
    background: active ? `${activeColor}18` : '#fff',
    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
  });

  const pCfg = PRIORITIES.find(p => p.level === priority)!;
  const dateLabel = dueDate ? format(dueDate, 'MMM d') : 'Date';

  return (
    <div style={{
      background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12,
      padding: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    }}>
      {/* Title */}
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
        placeholder="Task name"
        style={{
          width: '100%', border: 'none', outline: 'none', fontSize: 20,
          fontWeight: 600, color: '#202020', background: 'transparent',
          borderBottom: '1px solid transparent', paddingBottom: 4,
          marginBottom: 8, boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.target.style.borderBottomColor = '#f0f0f0'; }}
        onBlur={e => { e.target.style.borderBottomColor = 'transparent'; }}
      />

      {/* Description */}
      <textarea
        ref={descRef}
        value={description}
        onChange={e => { setDescription(e.target.value); growDesc(); }}
        placeholder="Description"
        rows={1}
        style={{
          width: '100%', border: 'none', outline: 'none', resize: 'none',
          fontSize: 14, color: '#444', background: 'transparent',
          marginBottom: 12, boxSizing: 'border-box', overflowY: 'hidden',
          fontFamily: 'inherit',
        }}
      />

      {/* ── Toolbar chips ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>

        {/* Date */}
        <button style={chipBtnStyle(!!dueDate, '#1b7d2c')} onClick={() => toggleSection('date')}>
          <Calendar size={16} color={dueDate ? '#1b7d2c' : '#555'} />
          <span>{dateLabel}</span>
          {dueDate && (
            <span onClick={e => { e.stopPropagation(); setDueDate(null); setDueTime(null); }} style={{ display: 'flex' }}>
              <X size={14} color="#999" />
            </span>
          )}
        </button>

        {/* Attachment */}
        <button style={chipBtnStyle(attachments.length > 0)} onClick={() => { setActiveSection(null); fileInputRef.current?.click(); }}>
          <Paperclip size={16} color="#555" />
          <span>Attachment{attachments.length > 0 ? ` (${attachments.length})` : ''}</span>
        </button>

        {/* Priority */}
        <button
          style={{
            ...chipBtnStyle(priority < 4, pCfg.color),
            background: priority < 4 ? `${pCfg.color}15` : '#fff',
          }}
          onClick={() => toggleSection('priority')}
        >
          <Flag size={16} color={pCfg.color} fill={pCfg.fill ? pCfg.color : 'none'} />
          <span>Priority{priority < 4 ? ` ${priority}` : ''}</span>
        </button>

        {/* Reminders */}
        <button style={chipBtnStyle(reminders.length > 0)} onClick={() => toggleSection('reminders')}>
          <Bell size={16} color={reminders.length > 0 ? '#db4c3f' : '#555'} />
          <span>Reminders{reminders.length > 0 ? ` (${reminders.length})` : ''}</span>
        </button>

        {/* Location */}
        <button style={chipBtnStyle(!!location)} onClick={() => toggleSection('location')}>
          <MapPin size={16} color={location ? '#db4c3f' : '#555'} />
          <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {location || 'Location'}
          </span>
          {location && (
            <span onClick={e => { e.stopPropagation(); setLocation(''); }} style={{ display: 'flex' }}>
              <X size={14} color="#999" />
            </span>
          )}
        </button>

        {/* Deadline */}
        <button style={chipBtnStyle(!!deadline)} onClick={() => toggleSection('deadline')}>
          <AlertTriangle size={16} color={deadline ? '#db4c3f' : '#555'} />
          <span>{deadline ? format(deadline, 'MMM d') : 'Deadline'}</span>
          {deadline && (
            <span onClick={e => { e.stopPropagation(); setDeadline(null); }} style={{ display: 'flex' }}>
              <X size={14} color="#999" />
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
        <div style={sectionStyle}>
          {PRIORITIES.map(p => (
            <div key={p.level}
              onClick={() => { setPriority(p.level); setActiveSection(null); }}
              style={rowStyle}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Flag size={18} color={p.color} fill={p.fill ? p.color : 'none'} />
              <span style={{ flex: 1 }}>{p.label}</span>
              {priority === p.level && <Check size={18} color="#db4c3f" />}
            </div>
          ))}
        </div>
      )}

      {/* ── Reminders section ── */}
      {activeSection === 'reminders' && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#202020', marginBottom: 12 }}>Reminders</div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {([
              { key: 'datetime' as const, label: 'Date & time', icon: <CalendarClock size={14} color="#555" /> },
              { key: 'before'   as const, label: 'Before task' },
            ]).map(tab => (
              <button key={tab.key} onClick={() => {
                setReminderMode(tab.key);
                setReminderValue(tab.key === 'datetime' ? DATETIME_OPTIONS[0] : BEFORE_TASK_OPTIONS[0]);
              }} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                border: reminderMode === tab.key ? '1px solid #e0e0e0' : '1px solid transparent',
                background: reminderMode === tab.key ? '#f5f5f5' : 'transparent',
                fontWeight: reminderMode === tab.key ? 600 : 400,
                color: reminderMode === tab.key ? '#202020' : '#666',
                fontSize: 13,
              }}>
                {tab.icon ?? null}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dropdown */}
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Clock size={16} color="#999" />
            </div>
            <select value={reminderValue} onChange={e => setReminderValue(e.target.value)} style={{
              width: '100%', border: '1px solid #e0e0e0', borderRadius: 8,
              padding: '10px 12px 10px 34px', fontSize: 14, color: '#202020',
              appearance: 'none', background: '#fff', cursor: 'pointer', boxSizing: 'border-box',
            }}>
              {(reminderMode === 'datetime' ? DATETIME_OPTIONS : BEFORE_TASK_OPTIONS).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <ChevronDown size={14} color="#999" />
            </div>
          </div>

          <p style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
            {reminderMode === 'datetime'
              ? "Get a notification when it's time for this task."
              : 'Get reminded before the task is scheduled.'
            }
          </p>

          {/* Added reminders chips */}
          {reminders.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {reminders.map(r => (
                <span key={r.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#f5f5f5', borderRadius: 20, padding: '4px 10px',
                  fontSize: 12, color: '#555',
                }}>
                  {r.value}
                  <button onClick={() => removeReminder(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <X size={12} color="#999" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={addReminder} style={actionBtnStyle}>Add reminder</button>
          </div>
        </div>
      )}

      {/* ── Location section ── */}
      {activeSection === 'location' && (
        <div style={sectionStyle}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <MapPin size={16} color="#999" />
            </div>
            <input
              autoFocus
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setActiveSection(null); }}
              placeholder="Add a location"
              style={{
                width: '100%', border: '1px solid #e0e0e0', borderRadius: 8,
                padding: '10px 34px 10px 34px', fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {location && (
              <button onClick={() => setLocation('')} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
              }}>
                <X size={14} color="#999" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Deadline section ── */}
      {activeSection === 'deadline' && (
        <div style={sectionStyle}>
          <p style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
            A hard deadline, separate from the scheduled date.
          </p>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: '#f0f0f0', borderRadius: 8, padding: 3 }}>
            {(['gregorian', 'hebrew'] as const).map(m => (
              <button key={m} onClick={() => setDeadlineCalMode(m)} style={{
                flex: 1, padding: '6px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: deadlineCalMode === m ? '#db4c3f' : 'transparent',
                color: deadlineCalMode === m ? 'white' : '#666',
                fontSize: 13, fontWeight: 500,
              }}>
                {m === 'gregorian' ? 'Gregorian' : 'Hebrew'}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 8 }}>
            {[
              { key: 'tomorrow',     icon: <Sun size={18} color="#ff9a14" />,         label: 'Tomorrow' },
              { key: 'laterThisWeek',icon: <CalendarRange size={18} color="#7c3aed" />, label: 'Later this week' },
              { key: 'thisWeekend',  icon: <CalendarDays size={18} color="#0ea5e9" />, label: 'This weekend' },
              { key: 'nextWeek',     icon: <ArrowRight size={18} color="#8b5cf6" />,  label: 'Next week' },
              { key: 'noDate',       icon: <CircleOff size={18} color="#999" />,      label: 'No Deadline' },
            ].map(({ key, icon, label }) => {
              const resolved = getQuickPickDate(key);
              return (
                <div key={key}
                  onClick={() => setDeadline(resolved)}
                  style={rowStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {icon}
                  <span style={{ flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>
                    {resolved ? format(resolved, 'EEE, MMM d') : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={dividerStyle} />
          <CalendarPicker selected={deadline} onSelect={setDeadline} mode={deadlineCalMode} />
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {attachments.map(a => (
            <div key={a.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid #e0e0e0', borderRadius: 8, padding: '6px 10px',
              fontSize: 12, color: '#555', background: '#fafafa',
            }}>
              {a.isImage ? <ImageIcon size={14} color="#999" /> : a.isPdf ? <FileText size={14} color="#999" /> : <File size={14} color="#999" />}
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <span style={{ color: '#bbb' }}>{formatFileSize(a.size)}</span>
              <button onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <X size={12} color="#999" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0',
      }}>
        {/* Project selector */}
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#666' }}>
          <Inbox size={16} color="#666" />
          <span>{project}</span>
          <ChevronDown size={14} color="#999" />
        </button>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ background: 'transparent', color: '#666', border: 'none', fontSize: 14, cursor: 'pointer', padding: '8px 12px' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!title.trim()} style={{
            background: '#db4c3f', color: 'white', border: 'none', borderRadius: 8,
            padding: '8px 20px', fontWeight: 600, fontSize: 14, cursor: title.trim() ? 'pointer' : 'not-allowed',
            opacity: title.trim() ? 1 : 0.5, transition: 'opacity 0.15s',
          }}>
            {isEditing ? 'Save' : 'Add task'}
          </button>
        </div>
      </div>
    </div>
  );
}
