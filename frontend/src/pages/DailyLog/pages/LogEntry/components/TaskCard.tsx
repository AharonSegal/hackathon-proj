import { useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/shared/components/ui/Button';
import { Input, Textarea } from '@/shared/components/ui/Input';
import type { TaskFormState, TechSelection } from '../../../utils/types';
import CategoryPicker from './CategoryPicker';
import TechSelector from './TechSelector';
import LanguagePicker from './LanguagePicker';

interface Props {
  task: TaskFormState;
  index: number;
  error?: string;
  canRemove: boolean;
  onUpdate: (updates: Partial<TaskFormState>) => void;
  onClear: () => void;
  onRemove: () => void;
  isNew?: boolean;
}

export default function TaskCard({ task, index, error, canRemove, onUpdate, onClear, onRemove, isNew }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNew && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isNew]);

  return (
    <div
      ref={ref}
      className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-4"
    >
      {/* Card header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">Task {index + 1}</span>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onClear} type="button">Clear</Button>
          {canRemove && (
            <Button variant="danger" size="sm" onClick={onRemove} type="button" className="px-2">
              <Trash2 size={13} />
            </Button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400">Categories</label>
        <CategoryPicker selected={task.categories} onChange={(cats) => onUpdate({ categories: cats })} />
      </div>

      {/* Title */}
      <div>
        <Input
          label="Title *"
          value={task.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="What did you work on?"
          error={error}
        />
      </div>

      {/* Coding languages */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400">Coding Languages</label>
        <LanguagePicker
          selected={task.codingLanguages ?? []}
          onChange={(langs) => onUpdate({ codingLanguages: langs })}
        />
      </div>

      {/* Technologies */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400">Technologies</label>
        <TechSelector
          selected={task.technologies}
          onChange={(techs: TechSelection[]) => onUpdate({ technologies: techs })}
        />
      </div>

      {/* Team type */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400">Team type</label>
        <div className="flex rounded-lg border border-slate-600 p-0.5 w-fit">
          {(['solo', 'team'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onUpdate({ teamType: opt })}
              className={clsx(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors capitalize',
                task.teamType === opt
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-slate-100',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Team size */}
      {task.teamType === 'team' && (
        <Input
          label="Team size"
          type="number"
          min={2}
          max={500}
          value={task.teamSize ?? ''}
          onChange={(e) => onUpdate({ teamSize: e.target.value ? parseInt(e.target.value) : undefined })}
          placeholder="Number of people…"
          className="max-w-[160px]"
        />
      )}

      {/* Description */}
      <Textarea
        label="Description"
        value={task.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        placeholder="Optional details…"
        rows={3}
      />
    </div>
  );
}
