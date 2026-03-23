/**
 * Nav/MobileNav.tsx
 * ------------------
 * Fixed bottom navigation bar — only shown on mobile (< 768 px).
 * Mirrors the sidebar nav links so the app is fully navigable on small screens.
 *
 * RTL: uses `dir` inherited from AppLayout, so the icon order naturally reverses
 * in Hebrew mode without any extra logic here.
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  MessageSquare,
  NotebookPen,
  ListOrdered,
  Settings,
  Trash2,
  CheckSquare,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useT } from '@/shared/i18n/useT';

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, labelKey: 'nav_dashboard'   },
  { to: '/events',      icon: ListOrdered,     labelKey: 'nav_events'      },
  { to: '/todos',       icon: CheckSquare,     labelKey: 'nav_todos'       },
  { to: '/notes',       icon: NotebookPen,     labelKey: 'nav_notes'       },
  { to: '/messages',    icon: MessageSquare,   labelKey: 'nav_messages'    },
  { to: '/calendar',    icon: CalendarDays,    labelKey: 'nav_calendar'    },
  { to: '/daily-times', icon: Clock,           labelKey: 'nav_daily_times' },
  { to: '/trash',       icon: Trash2,          labelKey: 'nav_trash'       },
  { to: '/settings',    icon: Settings,        labelKey: 'nav_settings'    },
] as const;

type LabelKey = (typeof NAV_ITEMS)[number]['labelKey'];

export function MobileNav() {
  const t = useT();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex md:hidden bg-slate-900 border-t border-slate-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              'flex-1 min-w-0 flex flex-col items-center justify-center py-2 gap-0.5',
              'text-[9px] font-medium transition-colors',
              isActive ? 'text-primary-400' : 'text-slate-500 active:text-slate-300',
            )
          }
        >
          <Icon size={18} strokeWidth={1.75} />
          <span className="truncate w-full text-center">{t[labelKey as LabelKey]}</span>
        </NavLink>
      ))}
    </nav>
  );
}
