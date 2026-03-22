import { useState, useRef, useCallback } from 'react';
import { MessageCircle, Send, Clock, Phone } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input, Textarea } from '@/shared/components/ui/Input';
import { messageApi } from '@/shared/hooks/useApi';
import { useBackendStatus } from '@/shared/hooks/useBackendStatus';
import { toast } from 'sonner';
import { clsx } from 'clsx';

const QUICK_TEMPLATES = [
  { id: 'reminder', label: 'Event Reminder', text: 'שלום! רצינו להזכיר לכם על האירוע המתקרב.\n\nפרטי האירוע:\n📅 תאריך: [תאריך]\n🕐 שעה: [שעה]\n📍 מיקום: [מיקום]\n\nמחכים לראותכם! 🙏' },
  { id: 'invite', label: 'Invitation', text: 'שלום!\n\nאנחנו שמחים להזמין אתכם ל[שם האירוע].\n\nתאריך: [תאריך]\nשעה: [שעה]\nמקום: [מיקום]\n\nאנא אשרו הגעה עד [תאריך].\nנשמח לראותכם!' },
  { id: 'thanks', label: 'Thank You', text: 'שלום!\n\nתודה רבה על השתתפותכם ב[שם האירוע].\nהייתה לנו שמחה גדולה לראותכם.\n\nמקווים להתראות שוב בקרוב! 😊' },
];

const EMOJIS = [
  '😊','😂','🙏','❤️','👍','🎉','✅','⭐',
  '📅','🕐','📍','📞','💬','📧','🔔','⚡',
  '🌟','💪','🤝','👋','🎊','🎁','🌹','🌺',
  '✨','🔥','💡','📢','🎯','💼','🏆','🎵',
  '😍','🥰','😎','🤩','😁','🙌','👏','💖',
  '🫶','🎈','🪄','🕊️','🌈','☀️','🌙','💫',
];

// Render WhatsApp markdown syntax to HTML for the preview
function renderWhatsApp(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Order matters — code block first so inner text isn't processed
  html = html.replace(/```([\s\S]*?)```/g, '<code style="font-family:monospace;font-size:12px;background:rgba(0,0,0,0.3);padding:1px 3px;border-radius:3px">$1</code>');
  html = html.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  html = html.replace(/~([^~\n]+)~/g, '<del>$1</del>');
  html = html.replace(/\n/g, '<br />');

  return html;
}

// ── Phone preview ─────────────────────────────────────────────────────────────

function WhatsAppPhonePreview({ to, message }: { to: string; message: string }) {
  return (
    <div className="shrink-0 w-[240px] flex flex-col items-center">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Preview</p>

      {/* Phone shell */}
      <div className="w-[240px] bg-[#111] rounded-[32px] border-[3px] border-[#333] shadow-2xl overflow-hidden flex flex-col">
        {/* WhatsApp top bar */}
        <div className="bg-[#075e54] px-3 pt-5 pb-2 flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-full bg-[#acbfc9]/30 flex items-center justify-center shrink-0">
            <Phone size={12} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-white truncate leading-tight">{to || '+972...'}</p>
            <p className="text-[9px] text-[#acbfc9] leading-tight">online</p>
          </div>
        </div>

        {/* Chat area */}
        <div className="bg-[#0d1418] flex-1 p-3 min-h-[280px] max-h-[380px] overflow-y-auto flex flex-col gap-2">
          {message ? (
            <div className="max-w-[90%] ml-auto">
              <div className="bg-[#005c4b] rounded-l-2xl rounded-tr-2xl px-3 py-2 shadow">
                <div
                  className="text-[12px] text-white leading-relaxed break-words"
                  dangerouslySetInnerHTML={{ __html: renderWhatsApp(message) }}
                />
                <p className="text-[9px] text-[#8da8a0] text-right mt-1 leading-tight">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} ✓✓
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-[11px] text-center mt-10 leading-relaxed px-2">
              Start typing to see your message preview...
            </p>
          )}
        </div>

        {/* Input bar mockup */}
        <div className="bg-[#1f2c33] px-2 py-2 flex items-center gap-2 shrink-0">
          <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1">
            <p className="text-[10px] text-slate-500">Message</p>
          </div>
          <div className="w-6 h-6 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
            <Send size={10} className="text-white ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────

export function WhatsAppComposer() {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { status: backendStatus } = useBackendStatus();
  const charCount = message.length;
  const isValid = to.trim() && message.trim();

  // Insert formatting markers around selection (or at cursor)
  const insertFormat = useCallback((before: string, after = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = message.slice(start, end);

    const next =
      message.slice(0, start) +
      before + selected + after +
      message.slice(end);

    setMessage(next);

    requestAnimationFrame(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start + before.length, start + before.length + selected.length);
      } else {
        const pos = start + before.length;
        el.setSelectionRange(pos, pos);
      }
    });
  }, [message]);

  const handleSend = async () => {
    if (!isValid) return;
    if (backendStatus === 'offline') {
      toast.error('Backend offline — cannot send messages right now');
      return;
    }
    setLoading(true);
    try {
      await messageApi.sendWhatsApp({
        to: to.trim(),
        message: message.trim(),
        scheduleAt: isScheduled && scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
      });
      toast.success(isScheduled ? 'WhatsApp message scheduled!' : 'WhatsApp message sent!');
      setTo(''); setMessage(''); setScheduleAt(''); setIsScheduled(false);
    } catch {
      toast.error('Failed to send WhatsApp message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-6 items-start">

      {/* ── Left: form ── */}
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

        {/* Recipient */}
        <Input
          label="Recipient (phone with country code)"
          placeholder="+972501234567"
          value={to}
          onChange={e => setTo(e.target.value)}
          type="tel"
        />

        {/* Templates */}
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

        {/* Message editor */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Message</label>

          {/* Formatting toolbar */}
          <div className="flex items-center gap-0.5 bg-slate-800 border border-slate-600 border-b-0 rounded-t-lg px-2 py-1.5">

            {/* Bold */}
            <button
              type="button"
              title="Bold — *text*"
              onClick={() => insertFormat('*', '*')}
              className="w-7 h-7 flex items-center justify-center rounded font-bold text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              B
            </button>

            {/* Italic */}
            <button
              type="button"
              title="Italic — _text_"
              onClick={() => insertFormat('_', '_')}
              className="w-7 h-7 flex items-center justify-center rounded italic text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              I
            </button>

            {/* Strikethrough */}
            <button
              type="button"
              title="Strikethrough — ~text~"
              onClick={() => insertFormat('~', '~')}
              className="w-7 h-7 flex items-center justify-center rounded line-through text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              S
            </button>

            {/* Monospace */}
            <button
              type="button"
              title="Monospace — ```text```"
              onClick={() => insertFormat('```', '```')}
              className="w-7 h-7 flex items-center justify-center rounded font-mono text-xs text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {'</>'}
            </button>

            <div className="w-px h-4 bg-slate-700 mx-1" />

            {/* Emoji picker */}
            <div className="relative">
              <button
                type="button"
                title="Emoji"
                onClick={() => setShowEmoji(v => !v)}
                className={clsx(
                  'w-7 h-7 flex items-center justify-center rounded text-base transition-colors',
                  showEmoji ? 'bg-slate-700' : 'hover:bg-slate-700',
                )}
              >
                😊
              </button>

              {showEmoji && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-xl p-2 shadow-2xl w-56">
                  <div className="grid grid-cols-8 gap-0.5">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          insertFormat(emoji);
                          setShowEmoji(false);
                        }}
                        className="text-[17px] rounded p-0.5 hover:bg-slate-700 transition-colors leading-none"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Char count pushed to the right */}
            <span className={clsx('ml-auto text-xs', charCount > 1000 ? 'text-amber-400' : 'text-slate-500')}>
              {charCount} / 4096
            </span>
          </div>

          {/* Textarea — using Textarea with ref (forwardRef supported) */}
          <Textarea
            ref={textareaRef}
            placeholder="Type your message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="min-h-[160px] rounded-t-none border-t-0 focus:ring-[#25d366]/50 focus:border-[#25d366]"
            dir="auto"
          />
        </div>

        {/* Schedule */}
        <div className="border border-slate-700 rounded-lg p-3 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isScheduled}
              onChange={e => setIsScheduled(e.target.checked)}
              className="accent-[#25d366]"
            />
            <Clock size={14} className="text-slate-400" />
            <span className="text-sm text-slate-300">Schedule for later</span>
          </label>
          {isScheduled && (
            <Input
              label="Send at"
              type="datetime-local"
              value={scheduleAt}
              onChange={e => setScheduleAt(e.target.value)}
            />
          )}
        </div>

        {/* Send */}
        <Button
          variant="whatsapp"
          className="w-full"
          onClick={handleSend}
          loading={loading}
          disabled={!isValid}
        >
          <Send size={15} />
          {isScheduled ? 'Schedule Message' : 'Send Now'}
        </Button>
      </div>

      {/* ── Right: phone preview ── */}
      <WhatsAppPhonePreview to={to} message={message} />
    </div>
  );
}
