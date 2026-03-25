import { FileText, FileJson, BarChart3 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useApp } from '../../context/AppContext';
import useDashboard from '../../hooks/useDashboard';
import { exportCSV, exportSchemaJSON } from '../../services/exportService';
import StatCards from './components/StatCards';
import Charts from './components/Charts';
import EntryHistory from './components/EntryHistory';

const SELECT_CLS =
  'flex-1 min-w-[130px] bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500';

export default function DashboardPage() {
  const { state } = useApp();
  const dash = useDashboard();

  if (state.entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-center text-slate-400">
        <BarChart3 size={40} className="text-slate-600" />
        <p className="font-semibold text-slate-300">No data yet</p>
        <p className="text-sm">Start logging your daily work to see analytics here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Export */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => exportCSV(state.entries)} type="button">
          <FileText size={14} /> Export CSV
        </Button>
        <Button variant="secondary" size="sm" onClick={() => exportSchemaJSON(state.schema)} type="button">
          <FileJson size={14} /> Export Schema
        </Button>
      </div>

      {/* Stat cards */}
      <StatCards stats={dash.stats} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={dash.dateFilter} onChange={(e) => dash.setDateFilter(e.target.value)} className={SELECT_CLS}>
          <option value="all">All Time</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
        </select>
        <select value={dash.projectFilter} onChange={(e) => dash.setProjectFilter(e.target.value)} className={SELECT_CLS}>
          <option value="all">All Projects</option>
          {state.schema.projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={dash.categoryFilter} onChange={(e) => dash.setCategoryFilter(e.target.value)} className={SELECT_CLS}>
          <option value="all">All Categories</option>
          {state.schema.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <Charts {...dash.chartData} />
      <EntryHistory history={dash.history} />
    </div>
  );
}
