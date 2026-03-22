import { ReactNode } from 'react';
import { clsx } from 'clsx';

type Color = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate';

interface BadgeProps {
  children: ReactNode;
  color?: Color;
  className?: string;
}

const colorClasses: Record<Color, string> = {
  indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  sky: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  violet: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  slate: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export function Badge({ children, color = 'slate', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        colorClasses[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
