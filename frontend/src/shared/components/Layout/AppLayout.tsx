/**
 * Layout/AppLayout.tsx
 * ---------------------
 * Root layout wrapper used by all pages.
 *
 * Structure:
 * - AppSidebar (fixed left, 240px wide)
 * - <main> (flex-1, fills remaining width) — renders the active page via <Outlet>
 * - BackendStatus pill (fixed bottom-right) — shows "Backend offline" when needed
 * - Toaster — global toast notification container (sonner)
 */

import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/shared/components/Sidebar/AppSidebar';
import { BackendStatus } from '@/shared/components/ui/BackendStatus';
import { Toaster } from 'sonner';

export function AppLayout() {
  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      <AppSidebar />
      <main className="flex-1 ml-60 flex flex-col overflow-hidden">
        <Outlet />
      </main>
      <BackendStatus />
      <Toaster
        theme="dark"
        position="bottom-right"
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
