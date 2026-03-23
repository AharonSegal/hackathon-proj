/**
 * Events/components/EventFormPanel.tsx
 * --------------------------------------
 * Form panel for creating or editing a CalendarEvent.
 * Shown on the right side of EventsPage.
 */

import { useState, useEffect, KeyboardEvent } from 'react';
import { X, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { type CalendarEvent, type EventColor, EVENT_COLOR_HEX, RECURRENCE_OPTIONS } from '@/shared/types/event.types';
import { type Folder } from '@/shared/types/note.types';

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
          <label className={labelClass}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={inputClass}
          />
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
        <div>
          {isEdit && onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
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
          <button
            onClick={handleSave}
            disabled={!title.trim() || !date}
            className="px-4 py-1.5 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Save Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
