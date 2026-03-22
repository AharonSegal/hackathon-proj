/**
 * Messages/components/WhatsAppComposer.tsx
 * -----------------------------------------
 * Full-featured WhatsApp message composer.
 *
 * Features:
 * - Recipient phone input (E.164 format required, e.g. +972501234567)
 * - Quick template buttons (Hebrew event reminders, invitations, thank-you)
 * - Formatting toolbar: Bold (*), Italic (_), Strikethrough (~), Monospace (```)
 * - Emoji picker: 48 common emojis, inserted at cursor position
 * - Live phone preview (WhatsAppPhonePreview) always visible on the right
 * - Immediate send or schedule for a specific date/time
 *
 * Process Flow:
 * 1. User types a phone number and message
 * 2. Formatting buttons wrap selected text (or place cursor between markers)
 * 3. Emoji picker inserts the emoji at the cursor position
 * 4. User clicks "Send Now" or enables schedule toggle + sets a date
 * 5. On send → POST /api/messages/whatsapp with { to, message, scheduleAt? }
 * 6. Success → clear form; failure → toast error
 */

import { useState, useRef, useCallback } from 'react';
import { MessageCircle, Send, Clock } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input, Textarea } from '@/shared/components/ui/Input';
import { messageApi } from '@/shared/hooks/useApi';
import { useBackendStatus } from '@/shared/hooks/useBackendStatus';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { WhatsAppPhonePreview } from './WhatsAppPhonePreview';

/** Pre-written Hebrew message templates for common event use cases */
const QUICK_TEMPLATES = [
  {
    id: 'reminder',
    label: 'Event Reminder',
    text: 'שלום! רצינו להזכיר לכם על האירוע המתקרב.\n\nפרטי האירוע:\n📅 תאריך: [תאריך]\n🕐 שעה: [שעה]\n📍 מיקום: [מיקום]\n\nמחכים לראותכם! 🙏',
  },
  {
    id: 'invite',
    label: 'Invitation',
    text: 'שלום!\n\nאנחנו שמחים להזמין אתכם ל[שם האירוע].\n\nתאריך: [תאריך]\nשעה: [שעה]\nמקום: [מיקום]\n\nאנא אשרו הגעה עד [תאריך].\nנשמח לראותכם!',
  },
  {
    id: 'thanks',
    label: 'Thank You',
    text: 'שלום!\n\nתודה רבה על השתתפותכם ב[שם האירוע].\nהייתה לנו שמחה גדולה לראותכם.\n\nמקווים להתראות שוב בקרוב! 😊',
  },
];

/** 48 commonly used emojis for the emoji picker */
const EMOJIS = [
  '😊','😂','🙏','❤️','👍','🎉','✅','⭐',
  '📅','🕐','📍','📞','💬','📧','🔔','⚡',
  '🌟','💪','🤝','👋','🎊','🎁','🌹','🌺',
  '✨','🔥','💡','📢','🎯','💼','🏆','🎵',
  '😍','🥰','😎','🤩','😁','🙌','👏','💖',
  '🫶','🎈','🪄','🕊️','🌈','☀️','🌙','💫',
];

export function WhatsAppComposer() {
  const [to,          setTo]          = useState('');
  const [message,     setMessage]     = useState('');
  const [scheduleAt,  setScheduleAt]  = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [showEmoji,   setShowEmoji]   = useState(false);

  // Ref to the textarea so we can read/set cursor position for formatting
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { status: backendStatus } = useBackendStatus();

  const charCount = message.length;
  const isValid   = to.trim() && message.trim();

  /**
   * Wrap selected text with formatting markers (or place cursor between them).
   *
   * Example: user selects "hello" and clicks Bold → "*hello*"
   * If nothing is selected, places cursor between markers: "**|"
   *
   * Uses requestAnimationFrame to restore focus after React re-renders the textarea.
   */
  const insertFormat = useCallback((before: string, after = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start    = el.selectionStart;
    const end      = el.selectionEnd;
    const selected = message.slice(start, end);

    // Build the new message string with markers inserted
    const next =
      message.slice(0, start) +
      before + selected + after +
      message.slice(end);

    setMessage(next);

    // Restore focus and selection after React re-renders
    requestAnimationFrame(() => {
      el.focus();
      if (selected) {
        // Keep the original text selected inside the new markers
        el.setSelectionRange(start + before.length, start + before.length + selected.length);
      } else {
        // Place cursor between the markers
        const pos = start + before.length;
        el.setSelectionRange(pos, pos);
      }
    });
  }, [message]);

  /** Send the message immediately or schedule it for later */
  const handleSend = async () => {
    if (!isValid) return;
    if (backendStatus === 'offline') {
      toast.error('Backend offline — cannot send messages right now');
      return;
    }
    setLoading(true);
    try {
      await messageApi.sendWhatsApp({
        to:         to.trim(),
        message:    message.trim(),
        // scheduleAt is only sent when the user has toggled "Schedule for later"
        scheduleAt: isScheduled && scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
      });
      toast.success(isScheduled ? 'WhatsApp message scheduled!' : 'WhatsApp message sent!');
      // Clear form on success
      setTo(''); setMessage(''); setScheduleAt(''); setIsScheduled(false);
    } catch {
      toast.error('Failed to send WhatsApp message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-6 items-start">

      {/* ── Left column: compose form ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#25d366] flex items-center justify-center">
            <MessageCircle size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">WhatsApp Message</h3>
            <p className="text-xs text-slate-400">Send via WhatsApp Business API</p>
          </div>
        </div>

        {/* Recipient phone number */}
        <Input
          label="Recipient (phone with country code)"
          placeholder="+972501234567"
          value={to}
          onChange={e => setTo(e.target.value)}
          type="tel"
        />

        {/* Quick template buttons — clicking replaces the entire message */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Quick Templates</label>
          <div className="flex flex-wrap gap-2">
            {QUICK_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setMessage(t.text)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-[#25d366] hover:text-[#25d366] transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message editor with formatting toolbar */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Message</label>

          {/* Formatting toolbar — sits above the textarea with a connected border */}
          <div className="flex items-center gap-0.5 bg-slate-800 border border-slate-600 border-b-0 rounded-t-lg px-2 py-1.5">

            {/* Bold: wraps selection with *asterisks* */}
            <button type="button" title="Bold — *text*"
              onClick={() => insertFormat('*', '*')}
              className="w-7 h-7 flex items-center justify-center rounded font-bold text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >B</button>

            {/* Italic: wraps selection with _underscores_ */}
            <button type="button" title="Italic — _text_"
              onClick={() => insertFormat('_', '_')}
              className="w-7 h-7 flex items-center justify-center rounded italic text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >I</button>

            {/* Strikethrough: wraps selection with ~tildes~ */}
            <button type="button" title="Strikethrough — ~text~"
              onClick={() => insertFormat('~', '~')}
              className="w-7 h-7 flex items-center justify-center rounded line-through text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >S</button>

            {/* Monospace: wraps selection with triple backticks */}
            <button type="button" title="Monospace — ```text```"
              onClick={() => insertFormat('```', '```')}
              className="w-7 h-7 flex items-center justify-center rounded font-mono text-xs text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >{'</>'}</button>

            <div className="w-px h-4 bg-slate-700 mx-1" />

            {/* Emoji picker toggle */}
            <div className="relative">
              <button type="button" title="Emoji"
                onClick={() => setShowEmoji(v => !v)}
                className={clsx(
                  'w-7 h-7 flex items-center justify-center rounded text-base transition-colors',
                  showEmoji ? 'bg-slate-700' : 'hover:bg-slate-700',
                )}
              >😊</button>

              {/* Emoji popup grid */}
              {showEmoji && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-xl p-2 shadow-2xl w-56">
                  <div className="grid grid-cols-8 gap-0.5">
                    {EMOJIS.map(emoji => (
                      <button key={emoji} type="button"
                        onClick={() => {
                          insertFormat(emoji); // insert emoji at cursor (no closing marker)
                          setShowEmoji(false);
                        }}
                        className="text-[17px] rounded p-0.5 hover:bg-slate-700 transition-colors leading-none"
                      >{emoji}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Character counter — turns amber when approaching limits */}
            <span className={clsx('ml-auto text-xs', charCount > 1000 ? 'text-amber-400' : 'text-slate-500')}>
              {charCount} / 4096
            </span>
          </div>

          {/* Message textarea — rounded-t-none connects visually to the toolbar above */}
          <Textarea
            ref={textareaRef}
            placeholder="Type your message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="min-h-[160px] rounded-t-none border-t-0 focus:ring-[#25d366]/50 focus:border-[#25d366]"
            dir="auto"
          />
        </div>

        {/* Schedule toggle — shows a datetime picker when enabled */}
        <div className="border border-slate-700 rounded-lg p-3 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isScheduled}
              onChange={e => setIsScheduled(e.target.checked)}
              className="accent-[#25d366]" />
            <Clock size={14} className="text-slate-400" />
            <span className="text-sm text-slate-300">Schedule for later</span>
          </label>
          {isScheduled && (
            <Input label="Send at" type="datetime-local"
              value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} />
          )}
        </div>

        {/* Send button */}
        <Button variant="whatsapp" className="w-full"
          onClick={handleSend} loading={loading} disabled={!isValid}>
          <Send size={15} />
          {isScheduled ? 'Schedule Message' : 'Send Now'}
        </Button>
      </div>

      {/* ── Right column: live phone preview ── */}
      <WhatsAppPhonePreview to={to} message={message} />
    </div>
  );
}
