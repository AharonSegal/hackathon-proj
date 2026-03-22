/**
 * Messages/MessagesPage.tsx
 * --------------------------
 * Page for composing and sending WhatsApp and Email messages.
 *
 * Layout changes depending on the active tab:
 * - WhatsApp tab: single full-width column (composer + phone preview), message log below
 * - Email tab: two-column grid (composer on left, message log on right)
 *
 * The message log auto-refreshes every 30 seconds.
 *
 * Process Flow:
 * 1. On mount → fetch message logs from /api/messages/logs
 * 2. Set up a 30-second interval to re-fetch logs (auto-refresh)
 * 3. User picks a tab → layout switches between WhatsApp and Email mode
 * 4. Composers call /api/messages/whatsapp or /api/messages/email directly
 * 5. After sending, the next auto-refresh cycle picks up the new log entry
 */

import { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { MessageCircle, Mail } from 'lucide-react';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { WhatsAppComposer } from './components/WhatsAppComposer';
import { EmailComposer } from './components/EmailComposer';
import { MessageLogPanel } from './components/MessageLogPanel';
import { MessageLog } from '@/shared/types/event.types';
import { messageApi } from '@/shared/hooks/useApi';
import { clsx } from 'clsx';

export function MessagesPage() {
  const [logs,      setLogs]      = useState<MessageLog[]>([]);
  const [activeTab, setActiveTab] = useState<string>('whatsapp');

  // Fetch logs on mount and auto-refresh every 30 seconds
  useEffect(() => {
    messageApi.getLogs().then(setLogs).catch(() => {});
    const interval = setInterval(() => {
      messageApi.getLogs().then(setLogs).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  /** Shared tab navigation bar — rendered above both layouts */
  const tabList = (
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
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Messages"
        subtitle="Send and schedule WhatsApp & Email messages"
      />

      <div className="flex-1 overflow-auto p-6">
        <Tabs.Root
          defaultValue="whatsapp"
          onValueChange={setActiveTab}
          className={clsx(
            'mx-auto',
            activeTab === 'whatsapp' ? 'max-w-6xl' : 'max-w-5xl',
          )}
        >
          {activeTab === 'whatsapp' ? (
            /* WhatsApp layout: full-width composer card, log panel below */
            <>
              {tabList}
              <Tabs.Content value="whatsapp">
                <div className="card mb-6">
                  <WhatsAppComposer />
                </div>
                <MessageLogPanel logs={logs} />
              </Tabs.Content>
              {/* Keep email tab content mounted but hidden so its state is preserved */}
              <Tabs.Content value="email" />
            </>
          ) : (
            /* Email layout: 2-column grid (composer | log) */
            <>
              {tabList}
              <Tabs.Content value="whatsapp" />
              <Tabs.Content value="email">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <EmailComposer />
                  </div>
                  <MessageLogPanel logs={logs} />
                </div>
              </Tabs.Content>
            </>
          )}
        </Tabs.Root>
      </div>
    </div>
  );
}
