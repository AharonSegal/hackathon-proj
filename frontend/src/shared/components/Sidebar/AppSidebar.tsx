import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  MessageSquare,
  Settings,
  LayoutDashboard,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/daily-times', label: 'Daily Times', icon: Clock },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
];

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <CalendarDays size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">לוח שנה</p>
          <p className="text-xs text-slate-500">Calendar App</p>
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
                {isActive && <ChevronRight size={14} className="opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="px-3 py-4 border-t border-slate-800">
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
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
