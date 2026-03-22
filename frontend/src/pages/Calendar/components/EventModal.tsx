/**
 * Calendar/components/EventModal.tsx
 * ------------------------------------
 * Modal dialog for creating and editing calendar events.
 *
 * Fields:
 * - Title (required), Description
 * - All-day toggle, Start/End time (when not all-day)
 * - Color picker (6 colors)
 * - Scheduled Email section (optional: to, subject, body, send-at)
 * - Scheduled WhatsApp section (optional: phone, message, send-at)
 *
 * Modes:
 * - Create mode (editEvent is null): form is blank except for the selected date
 * - Edit mode (editEvent is set): form pre-filled from the existing event
 *
 * On save → calls eventApi.create or eventApi.update, then calls onSaved(event).
 * On delete → calls eventApi.delete, then calls onDeleted(id).
 */

import { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input, Textarea } from '@/shared/components/ui/Input';
import { CalendarEvent, EventColor } from '@/shared/types/event.types';
import { DayInfo } from '@/pages/Calendar/hooks/useCalendar';
import { Mail, MessageCircle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { eventApi } from '@/shared/hooks/useApi';
import { useBackendStatus } from '@/shared/hooks/useBackendStatus';
import { useT } from '@/shared/i18n/useT';

const COLORS: { value: EventColor; label: string; cls: string }[] = [
  { value: 'indigo', label: 'Indigo', cls: 'bg-indigo-500' },
  { value: 'emerald', label: 'Emerald', cls: 'bg-emerald-500' },
  { value: 'amber', label: 'Amber', cls: 'bg-amber-500' },
  { value: 'rose', label: 'Rose', cls: 'bg-rose-500' },
  { value: 'sky', label: 'Sky', cls: 'bg-sky-500' },
  { value: 'violet', label: 'Violet', cls: 'bg-violet-500' },
];

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  day: DayInfo | null;
  editEvent?: CalendarEvent | null;
  onSaved: (ev: CalendarEvent) => void;
  onDeleted: (id: string) => void;
}

export function EventModal({ open, onClose, day, editEvent, onSaved, onDeleted }: EventModalProps) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState<EventColor>('indigo');
  const [allDay, setAllDay] = useState(true);
  // Scheduled actions
  const [addEmail, setAddEmail] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailAt, setEmailAt] = useState('');
  const [addWhatsApp, setAddWhatsApp] = useState(false);
  const [wpTo, setWpTo] = useState('');
  const [wpMessage, setWpMessage] = useState('');
  const [wpAt, setWpAt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description ?? '');
      setStartTime(editEvent.startTime ?? '');
      setEndTime(editEvent.endTime ?? '');
      setColor(editEvent.color);
      setAllDay(editEvent.allDay);
      if (editEvent.scheduledEmail) {
        setAddEmail(true);
        setEmailTo(editEvent.scheduledEmail.to.join(', '));
        setEmailSubject(editEvent.scheduledEmail.subject);
        setEmailBody(editEvent.scheduledEmail.body);
        setEmailAt(editEvent.scheduledEmail.scheduledAt.slice(0, 16));
      }
      if (editEvent.scheduledWhatsApp) {
        setAddWhatsApp(true);
        setWpTo(editEvent.scheduledWhatsApp.to);
        setWpMessage(editEvent.scheduledWhatsApp.message);
        setWpAt(editEvent.scheduledWhatsApp.scheduledAt.slice(0, 16));
      }
    } else {
      setTitle(''); setDescription(''); setStartTime(''); setEndTime('');
      setColor('indigo'); setAllDay(true);
      setAddEmail(false); setEmailTo(''); setEmailSubject(''); setEmailBody(''); setEmailAt('');
      setAddWhatsApp(false); setWpTo(''); setWpMessage(''); setWpAt('');
    }
  }, [editEvent, open]);

  const { status: backendStatus } = useBackendStatus();

  const handleSave = async () => {
    if (!title.trim() || !day) return;
    if (backendStatus === 'offline') {
      toast.error('Backend offline — cannot save events right now');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        date: day.date.toISOString().slice(0, 10),
        startTime: allDay ? undefined : startTime || undefined,
        endTime: allDay ? undefined : endTime || undefined,
        color,
        allDay,
        scheduledEmail: addEmail && emailTo && emailSubject
          ? { to: emailTo.split(',').map(s => s.trim()), subject: emailSubject, body: emailBody, scheduledAt: new Date(emailAt).toISOString(), sent: false, id: '' }
          : undefined,
        scheduledWhatsApp: addWhatsApp && wpTo && wpMessage
          ? { to: wpTo, message: wpMessage, scheduledAt: new Date(wpAt).toISOString(), sent: false, id: '' }
          : undefined,
      };

      let saved: CalendarEvent;
      if (editEvent) {
        saved = await eventApi.update(editEvent.id, payload);
      } else {
        saved = await eventApi.create(payload);
      }
      onSaved(saved);
      toast.success(editEvent ? 'Event updated' : 'Event created');
      onClose();
    } catch {
      toast.error('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editEvent) return;
    setLoading(true);
    try {
      await eventApi.delete(editEvent.id);
      onDeleted(editEvent.id);
      toast.success('Event deleted');
      onClose();
    } catch {
      toast.error('Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  const dateLabel = day
    ? `${day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · ${day.hebrewDateStr}`
    : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editEvent ? t.edit_event : t.create_event_title}
      size="lg"
    >
      <div className="space-y-4">
        {/* Date */}
        <p className="text-xs text-slate-500 -mt-2">{dateLabel}</p>

        {/* Title */}
        <Input
          label={t.field_title}
          placeholder={t.placeholder_title}
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />

        {/* Description */}
        <Textarea
          label={t.field_description}
          placeholder={t.placeholder_description}
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="min-h-[60px]"
        />

        {/* Time */}
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
              <Input label={t.field_end_time} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          )}
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">{t.field_color}</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button
                key={c.value}
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

        {/* Scheduled actions */}
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
                <Input label={t.field_email_to} placeholder="email@example.com" value={emailTo} onChange={e => setEmailTo(e.target.value)} />
                <Input label={t.field_email_subject} value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                <Textarea label={t.field_email_body} value={emailBody} onChange={e => setEmailBody(e.target.value)} className="min-h-[60px]" />
                <Input label={t.field_send_at} type="datetime-local" value={emailAt} onChange={e => setEmailAt(e.target.value)} />
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
                <Input label={t.field_phone} placeholder="+972..." value={wpTo} onChange={e => setWpTo(e.target.value)} />
                <Textarea label={t.field_message} value={wpMessage} onChange={e => setWpMessage(e.target.value)} className="min-h-[80px]" />
                <Input label={t.field_send_at} type="datetime-local" value={wpAt} onChange={e => setWpAt(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {editEvent && (
              <Button variant="danger" size="sm" onClick={handleDelete} loading={loading}>
                <Trash2 size={13} />
                {t.btn_delete}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t.btn_cancel}
            </Button>
            <Button size="sm" onClick={handleSave} loading={loading} disabled={!title.trim()}>
              {editEvent ? t.btn_update : t.btn_create} {t.btn_event_suffix}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
