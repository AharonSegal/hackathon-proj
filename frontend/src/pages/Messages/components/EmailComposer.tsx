import { useState } from 'react';
import { Mail, Send, Clock, Plus, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input, Textarea } from '@/shared/components/ui/Input';
import { messageApi } from '@/shared/hooks/useApi';
import { useBackendStatus } from '@/shared/hooks/useBackendStatus';
import { toast } from 'sonner';

export function EmailComposer() {
  const [toList, setToList] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [loading, setLoading] = useState(false);

  const addRecipient = () => {
    const email = toInput.trim();
    if (email && !toList.includes(email)) {
      setToList(prev => [...prev, email]);
      setToInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient();
    }
  };

  const removeRecipient = (email: string) => setToList(prev => prev.filter(e => e !== email));

  const backendStatus = useBackendStatus();
  const isValid = toList.length > 0 && subject.trim() && body.trim();

  const handleSend = async () => {
    if (!isValid) return;
    if (backendStatus === 'offline') {
      toast.error('Backend offline — cannot send messages right now');
      return;
    }
    setLoading(true);
    try {
      await messageApi.sendEmail({
        to: toList,
        subject: subject.trim(),
        body: body.trim(),
        scheduleAt: isScheduled && scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
      });
      toast.success(isScheduled ? 'Email scheduled!' : 'Email sent!');
      setToList([]); setSubject(''); setBody(''); setScheduleAt(''); setIsScheduled(false);
    } catch {
      toast.error('Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Mail size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Email Message</h3>
          <p className="text-xs text-slate-400">Send via SMTP</p>
        </div>
      </div>

      {/* To field */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">To</label>
        <div className="bg-slate-900 border border-slate-600 rounded-lg p-2 focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-colors">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {toList.map(email => (
              <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-900 text-primary-300 text-xs">
                {email}
                <button onClick={() => removeRecipient(email)} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              type="email"
              value={toInput}
              onChange={e => setToInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={addRecipient}
              placeholder="Add email address..."
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
            />
            <button onClick={addRecipient} className="p-1 text-slate-400 hover:text-slate-100">
              <Plus size={14} />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">Press Enter or comma to add</p>
      </div>

      {/* Subject */}
      <Input
        label="Subject"
        placeholder="Email subject..."
        value={subject}
        onChange={e => setSubject(e.target.value)}
      />

      {/* Body */}
      <Textarea
        label="Message body"
        placeholder="Write your email..."
        value={body}
        onChange={e => setBody(e.target.value)}
        className="min-h-[160px]"
        dir="auto"
      />

      {/* Schedule */}
      <div className="border border-slate-700 rounded-lg p-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isScheduled}
            onChange={e => setIsScheduled(e.target.checked)}
            className="accent-blue-500"
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

      <Button
        variant="email"
        className="w-full"
        onClick={handleSend}
        loading={loading}
        disabled={!isValid}
      >
        <Send size={15} />
        {isScheduled ? 'Schedule Email' : 'Send Now'}
      </Button>
    </div>
  );
}
