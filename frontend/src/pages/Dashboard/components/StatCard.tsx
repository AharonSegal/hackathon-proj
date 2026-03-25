/**
 * Dashboard/components/StatCard.tsx
 * -----------------------------------
 * A single statistics card shown on the Dashboard.
 *
 * Displays one key metric with:
 * - A colored icon on the left
 * - A large number (the value)
 * - A small label below the number
 */

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Short label for the metric, e.g. "Total Events" */
  label: string;
  /** The metric value to display prominently */
  value: string | number;
  /** Tailwind bg class for the icon background, e.g. "bg-primary-600" */
  color: string;
}

export function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}
