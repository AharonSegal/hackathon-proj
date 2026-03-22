/**
 * Messages/components/MessageLogPanel.tsx
 * ----------------------------------------
 * Displays the list of sent, scheduled, and failed messages.
 *
 * Shows each message log entry with:
 * - Type icon (WhatsApp or Email)
 * - Subject or message preview
 * - Status badge (pending / sent / failed)
 * - Recipient and scheduled time
 * - Error message if the send failed
 */

import { MessageCircle, Mail, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { MessageLog } from '@/shared/types/event.types';
import { Badge } from '@/shared/components/ui/Badge';
import { useT } from '@/shared/i18n/useT';

/** Icon shown next to each log entry based on its delivery status */
const STATUS_ICON = {
  pending: <Clock size={13} className="text-amber-400" />,
  sent:    <CheckCircle2 size={13} className="text-emerald-400" />,
  failed:  <XCircle size={13} className="text-rose-400" />,
};

/** Badge color for each delivery status */
const STATUS_COLOR: Record<MessageLog['status'], 'amber' | 'emerald' | 'rose'> = {
  pending: 'amber',
  sent:    'emerald',
  failed:  'rose',
};

interface MessageLogPanelProps {
  logs: MessageLog[];
}

export function MessageLogPanel({ logs }: MessageLogPanelProps) {
  const t = useT();
  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-100">{t.message_log}</h2>
        <span className="text-xs text-slate-500">{logs.length} {t.messages_suffix}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">{t.no_messages_yet}</p>
        ) : (
          logs.map(log => (
            <div key={log.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              {/* Top row: type icon + subject/preview + status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {log.type === 'whatsapp'
                    ? <MessageCircle size={13} className="text-[#25d366] shrink-0" />
                    : <Mail size={13} className="text-blue-400 shrink-0" />}
                  <span className="text-sm text-slate-200 truncate">
                    {/* Show email subject if available, otherwise first 40 chars of message */}
                    {log.subject ?? log.message.slice(0, 40)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {STATUS_ICON[log.status]}
                  <Badge color={STATUS_COLOR[log.status]}>{log.status}</Badge>
                </div>
              </div>

              {/* Bottom row: recipient + timestamp */}
              <div className="mt-1 flex gap-3 text-xs text-slate-500">
                <span>{log.recipient}</span>
                <span>·</span>
                <span>
                  {new Date(log.scheduledAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Error message (only shown if delivery failed) */}
              {log.error && (
                <p className="mt-1 text-xs text-rose-400">{log.error}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
