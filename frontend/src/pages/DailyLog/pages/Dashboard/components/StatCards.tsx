import { Calendar, ListChecks, Cpu, FolderKanban, TrendingUp, Flame } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Stats {
  daysLogged: number;
  totalTasks: number;
  topTech: string;
  topProject: string;
  thisWeekCount: number;
  currentStreak: number;
  longestStreak: number;
}

const cards: { key: keyof Stats; label: string; icon: LucideIcon; iconCls: string }[] = [
  { key: 'daysLogged',     label: 'Days Logged',  icon: Calendar,     iconCls: 'bg-indigo-500/20 text-indigo-400' },
  { key: 'totalTasks',     label: 'Total Tasks',  icon: ListChecks,   iconCls: 'bg-emerald-500/20 text-emerald-400' },
  { key: 'topTech',        label: 'Top Tech',     icon: Cpu,          iconCls: 'bg-violet-500/20 text-violet-400' },
  { key: 'topProject',     label: 'Top Project',  icon: FolderKanban, iconCls: 'bg-amber-500/20 text-amber-400' },
  { key: 'thisWeekCount',  label: 'This Week',    icon: TrendingUp,   iconCls: 'bg-sky-500/20 text-sky-400' },
  { key: 'currentStreak',  label: 'Cur. Streak',  icon: Flame,        iconCls: 'bg-rose-500/20 text-rose-400' },
  { key: 'longestStreak',  label: 'Best Streak',  icon: Flame,        iconCls: 'bg-amber-500/20 text-amber-400' },
];

export default function StatCards({ stats }: { stats: Stats }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
      {cards.map(({ key, label, icon: Icon, iconCls }) => (
        <div
          key={key}
          className="flex-shrink-0 min-w-[140px] sm:flex-1 sm:min-w-[160px] bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2 hover:border-slate-500 transition-colors"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconCls}`}>
            <Icon size={18} />
          </div>
          <span className="text-2xl font-bold text-slate-100 leading-none">{stats[key]}</span>
          <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
        </div>
      ))}
    </div>
  );
}
