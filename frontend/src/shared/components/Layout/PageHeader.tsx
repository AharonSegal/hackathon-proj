import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-800 shrink-0">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl font-semibold text-slate-100 leading-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs sm:text-sm text-slate-400 leading-snug">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
