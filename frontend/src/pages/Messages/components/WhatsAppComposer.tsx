import { useState } from 'react';
import { MessageCircle, Send, Clock, Phone, Eye } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input, Textarea } from '@/shared/components/ui/Input';
import { messageApi } from '@/shared/hooks/useApi';
import { toast } from 'sonner';
import { clsx } from 'clsx';

const QUICK_TEMPLATES = [
  { id: 'reminder', label: 'Event Reminder', text: 'שלום! רצינו להזכיר לכם על האירוע המתקרב.\n\nפרטי האירוע:\n📅 תאריך: [תאריך]\n🕐 שעה: [שעה]\n📍 מיקום: [מיקום]\n\nמחכים לראותכם! 🙏' },
  { id: 'invite', label: 'Invitation', text: 'שלום!\n\nאנחנו שמחים להזמין אתכם ל[שם האירוע].\n\nתאריך: [תאריך]\nשעה: [שעה]\nמקום: [מיקום]\n\nאנא אשרו הגעה עד [תאריך].\nנשמח לראותכם!' },
  { id: 'thanks', label: 'Thank You', text: 'שלום!\n\nתודה רבה על השתתפותכם ב[שם האירוע].\nהייתה לנו שמחה גדולה לראותכם.\n\nמקווים להתראות שוב בקרוב! 😊' },
];

interface MessagePreviewProps {
  to: string;
  message: string;
}

function WhatsAppPreview({ to, message }: MessagePreviewProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700">
      {/* WhatsApp header */}
      <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center">
          <Phone size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{to || '+972...'}</p>
          <p className="text-[10px] text-[#acbfc9]">WhatsApp</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="bg-[#0d1418] p-4 min-h-[120px]">
        {message ? (
          <div className="max-w-[80%] ml-auto">
            <div className="bg-[#005c4b] rounded-l-xl rounded-tr-xl px-3 py-2">
              <p className="text-sm text-white whitespace-pre-wrap">{message}</p>
              <p className="text-[10px] text-[#8da8a0] text-right mt-1">12:00 ✓✓</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-600 text-sm text-center mt-8">Message preview...</p>
        )}
      </div>
    </div>
  );
}

export function WhatsAppComposer() {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  const charCount = message.length;
  const isValid = to.trim() && message.trim();

  const handleSend = async () => {
    if (!isValid) return;
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

  const applyTemplate = (text: string) => setMessage(text);

  return (
    <div className="space-y-4">
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
              onClick={() => applyTemplate(t.text)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-[#25d366] hover:text-[#25d366] transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <Textarea
          label="Message"
          placeholder="Type your message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="min-h-[140px] font-hebrew"
          dir="auto"
        />
        <div className="flex justify-between mt-1">
          <span className={clsx('text-xs', charCount > 1000 ? 'text-amber-400' : 'text-slate-500')}>
            {charCount} / 4096 chars
          </span>
          <button
            onClick={() => setShowPreview(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Eye size={12} />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>
      </div>

      {/* Preview */}
      {showPreview && <WhatsAppPreview to={to} message={message} />}

      {/* Schedule toggle */}
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

      {/* Send button */}
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
  );
}
