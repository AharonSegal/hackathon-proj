/**
 * Layout/AppLayout.tsx
 * ---------------------
 * Root layout wrapper used by all pages.
 *
 * Structure:
 * - AppSidebar (fixed left [LTR] or right [RTL], 240px wide, desktop-only)
 * - <main> (flex-1, fills remaining width; full-width on mobile with pb-16 for bottom nav)
 * - MobileNav (fixed bottom tab bar, mobile-only)
 * - BackendStatus pill (fixed bottom-right [LTR] or bottom-left [RTL])
 * - Toaster — global toast notification container (sonner)
 *
 * RTL support:
 * - Sets dir="rtl" on the root div when language is Hebrew
 * - Swaps the sidebar side and main margin accordingly
 */

import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/shared/components/Sidebar/AppSidebar';
import { MobileNav } from '@/shared/components/Nav/MobileNav';
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
      {/* On desktop, offset content to leave room for the fixed sidebar.
          On mobile, take full width and add bottom padding for the mobile nav bar. */}
      <main className={clsx(
        'flex-1 flex flex-col overflow-hidden',
        'pb-16 md:pb-0',
        isRTL ? 'md:mr-60' : 'md:ml-60',
      )}>
        <Outlet />
      </main>
      <MobileNav />
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
