/**
 * Layout/AppLayout.tsx
 * ---------------------
 * Root layout wrapper used by all pages.
 *
 * Structure:
 * - AppSidebar (fixed left [LTR] or right [RTL], 240px wide)
 * - <main> (flex-1, fills remaining width) — renders the active page via <Outlet>
 * - BackendStatus pill (fixed bottom-right [LTR] or bottom-left [RTL])
 * - Toaster — global toast notification container (sonner)
 *
 * RTL support:
 * - Sets dir="rtl" on the root div when language is Hebrew
 * - Swaps the sidebar side and main margin accordingly
 */

import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/shared/components/Sidebar/AppSidebar';
import { BackendStatus } from '@/shared/components/ui/BackendStatus';
import { Toaster } from 'sonner';
import { useT } from '@/shared/i18n/useT';
import { clsx } from 'clsx';

export function AppLayout() {
  const { isRTL } = useT();

  return (
    <div
      className="flex h-screen bg-app-bg overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <AppSidebar />
      {/* Offset main content to leave room for the fixed sidebar */}
      <main className={clsx('flex-1 flex flex-col overflow-hidden', isRTL ? 'mr-60' : 'ml-60')}>
        <Outlet />
      </main>
      <BackendStatus />
      <Toaster
        theme="dark"
        position={isRTL ? 'bottom-left' : 'bottom-right'}
        toastOptions={{
          classNames: {
            toast: 'bg-slate-800 border-slate-700 text-slate-100',
            description: 'text-slate-400',
          },
        }}
      />
    </div>
  );
}
