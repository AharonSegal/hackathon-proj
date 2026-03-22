import { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { MessageCircle, Mail, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { WhatsAppComposer } from './components/WhatsAppComposer';
import { EmailComposer } from './components/EmailComposer';
import { MessageLog } from '@/shared/types/event.types';
import { messageApi } from '@/shared/hooks/useApi';
import { Badge } from '@/shared/components/ui/Badge';
import { clsx } from 'clsx';

const STATUS_ICON = {
  pending: <Clock size={13} className="text-amber-400" />,
  sent: <CheckCircle2 size={13} className="text-emerald-400" />,
  failed: <XCircle size={13} className="text-rose-400" />,
};

const STATUS_COLOR: Record<MessageLog['status'], 'amber' | 'emerald' | 'rose'> = {
  pending: 'amber',
  sent: 'emerald',
  failed: 'rose',
};

export function MessagesPage() {
  const [logs, setLogs] = useState<MessageLog[]>([]);

  useEffect(() => {
    messageApi.getLogs().then(setLogs).catch(() => {});
    const interval = setInterval(() => {
      messageApi.getLogs().then(setLogs).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Messages"
        subtitle="Send and schedule WhatsApp & Email messages"
      />

      <div className="flex-1 overflow-hidden p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Composers */}
          <div className="space-y-6 overflow-y-auto">
            <Tabs.Root defaultValue="whatsapp">
              <Tabs.List className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 mb-4">
                <Tabs.Trigger
                  value="whatsapp"
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors',
                    'data-[state=active]:bg-[#25d366] data-[state=active]:text-white',
                    'data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-slate-100',
                  )}
                >
                  <MessageCircle size={15} />
                  WhatsApp
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="email"
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors',
                    'data-[state=active]:bg-blue-600 data-[state=active]:text-white',
                    'data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-slate-100',
                  )}
                >
                  <Mail size={15} />
                  Email
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="whatsapp">
                <div className="card">
                  <WhatsAppComposer />
                </div>
              </Tabs.Content>

              <Tabs.Content value="email">
                <div className="card">
                  <EmailComposer />
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </div>

          {/* Message log */}
          <div className="card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-100">Message Log</h2>
              <span className="text-xs text-slate-500">{logs.length} messages</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No messages yet</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {log.type === 'whatsapp'
                          ? <MessageCircle size={13} className="text-[#25d366] shrink-0" />
                          : <Mail size={13} className="text-blue-400 shrink-0" />}
                        <span className="text-sm text-slate-200 truncate">
                          {log.subject ?? log.message.slice(0, 40)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {STATUS_ICON[log.status]}
                        <Badge color={STATUS_COLOR[log.status]}>{log.status}</Badge>
                      </div>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-slate-500">
                      <span>{log.recipient}</span>
                      <span>·</span>
                      <span>
                        {new Date(log.scheduledAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {log.error && (
                      <p className="mt-1 text-xs text-rose-400">{log.error}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
