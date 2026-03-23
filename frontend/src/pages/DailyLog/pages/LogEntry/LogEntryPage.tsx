import { useState, useEffect, useRef } from 'react';
import { Plus, Send, RotateCcw, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/Button';
import useLogEntry from '../../hooks/useLogEntry';
import { useApp } from '../../context/AppContext';
import { formatDate, getTodayStr } from '../../utils/helpers';
import ProjectSelector from './components/ProjectSelector';
import TaskCard from './components/TaskCard';

export default function LogEntryPage() {
  const { state } = useApp();
  const log = useLogEntry();
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const todayStr = getTodayStr();

  const existingCount = state.entries.filter((e) => e.date === log.selectedDate).length;
  const isToday = log.selectedDate === todayStr;

  const handleSubmit = async () => {
    const ok = await log.submit();
    if (ok) {
      toast.success(`Day log submitted! (${existingCount + log.tasks.length} total for ${isToday ? 'today' : formatDate(log.selectedDate)})`);
    } else {
      toast.error('Please fill in all required fields.');
    }
  };

  const handleAddTask = () => {
    log.addTask();
    setTimeout(() => {
      setLastAdded(log.tasks[log.tasks.length - 1]?.id ?? null);
    }, 0);
  };

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmitRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      {/* Date header */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800 p-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-primary-400 shrink-0" />
          <input
            type="date"
            value={log.selectedDate}
            max={todayStr}
            onChange={(e) => log.setSelectedDate(e.target.value || todayStr)}
            className="bg-transparent text-sm text-slate-100 focus:outline-none [color-scheme:dark]"
          />
          <span className="rounded-md bg-primary-500/20 px-2 py-0.5 text-xs font-semibold text-primary-300">
            Day #{log.dayNumber}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={log.clearAll} type="button">
          <RotateCcw size={13} /> Clear
        </Button>
      </div>

      {/* Existing entries banner */}
      {existingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <CheckCircle2 size={14} className="shrink-0" />
          {existingCount} {existingCount === 1 ? 'entry' : 'entries'} already logged
          {isToday ? ' today' : ` for ${formatDate(log.selectedDate)}`} — adding more below
        </div>
      )}

      {/* Project */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400">Project</label>
        <ProjectSelector value={log.project} onChange={log.setProject} />
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {log.tasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            index={i}
            error={log.errors[task.id]}
            canRemove={log.tasks.length > 1}
            onUpdate={(updates) => log.updateTask(task.id, updates)}
            onClear={() => log.clearTask(task.id)}
            onRemove={() => log.removeTask(task.id)}
            isNew={task.id === lastAdded}
          />
        ))}
      </div>

      <Button variant="secondary" onClick={handleAddTask} type="button" className="w-full">
        <Plus size={16} /> Add Task
      </Button>

      {/* Submit */}
      <div className="pt-2">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={log.isSubmitting}
          loading={log.isSubmitting}
          className="w-full"
          type="button"
        >
          <Send size={16} />
          {log.isSubmitting ? 'Submitting…' : 'Submit Day Log'}
          <span className="ml-2 text-xs opacity-60">⌘↵</span>
        </Button>
      </div>
    </div>
  );
}
