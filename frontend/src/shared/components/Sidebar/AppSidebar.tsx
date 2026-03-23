/**
 * Sidebar/AppSidebar.tsx
 * -----------------------
 * Fixed navigation sidebar with logo, nav links, and settings link.
 *
 * RTL: when language is Hebrew, the sidebar moves to the right side and the
 * border flips from right to left. The active ChevronRight flips to ChevronLeft.
 * All labels come from the useT() hook.
 */

import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  MessageSquare,
  Settings,
  LayoutDashboard,
  NotebookPen,
  ListOrdered,
  ChevronRight,
  ChevronLeft,
  Trash2,
  CheckSquare,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useT } from '@/shared/i18n/useT';

export function AppSidebar() {
  const t = useT();
  const { isRTL } = t;

  // Nav items use translated labels from the i18n hook
  const NAV_ITEMS = [
    { to: '/dashboard',   label: t.nav_dashboard,   icon: LayoutDashboard },
    { to: '/calendar',    label: t.nav_calendar,    icon: CalendarDays },
    { to: '/events',      label: t.nav_events,      icon: ListOrdered },
    { to: '/daily-times', label: t.nav_daily_times, icon: Clock },
    { to: '/messages',    label: t.nav_messages,    icon: MessageSquare },
    { to: '/notes',       label: t.nav_notes,       icon: NotebookPen },
    { to: '/todos',       label: t.nav_todos,       icon: CheckSquare },
  ];

  // Active-indicator chevron: points toward the content area
  // LTR → content is on the right → ChevronRight
  // RTL → content is on the left  → ChevronLeft
  const ActiveChevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <aside className={clsx(
      'fixed inset-y-0 z-40 w-60 flex-col bg-slate-900',
      'hidden md:flex',
      isRTL ? 'right-0 border-l border-slate-800' : 'left-0 border-r border-slate-800',
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <CalendarDays size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">{t.app_name}</p>
          <p className="text-xs text-slate-500">{t.app_subtitle}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                {isActive && <ActiveChevron size={14} className="opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Trash + Settings at bottom */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-1">
        <NavLink
          to="/trash"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
            )
          }
        >
          <Trash2 size={17} />
          <span>{t.nav_trash}</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
            )
          }
        >
          <Settings size={17} />
          <span>{t.nav_settings}</span>
        </NavLink>
      </div>
    </aside>
  );
}
