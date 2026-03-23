/**
 * pages/Todos/TodosPage.tsx
 * --------------------------
 * Checklist page with rocket-launch completion animation and confetti.
 * Task creation/editing uses the full Todoist-style TaskEditor.
 */

import { useState, useRef } from 'react';
import ReactConfetti from 'react-confetti';
import { Rocket, CheckSquare, Check, Trash2, Flag, Calendar, Plus, Pencil } from 'lucide-react';
import { useTodos } from '@/shared/context/TodosContext';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { TaskEditor, type TaskFormData } from './components/TaskEditor';
import type { Todo } from '@/shared/hooks/useApi';

const ROCKET_STYLES = `
  @keyframes rocketShake {
    0%,100% { transform: translateX(0) rotate(0deg); }
    15%     { transform: translateX(-3px) rotate(-8deg); }
    30%     { transform: translateX( 3px) rotate( 8deg); }
    45%     { transform: translateX(-3px) rotate(-5deg); }
    60%     { transform: translateX( 3px) rotate( 5deg); }
    75%     { transform: translateX(-2px) rotate(-3deg); }
    90%     { transform: translateX( 2px) rotate( 3deg); }
  }
  @keyframes rocketFly {
    0%   { transform: translate(0,0) rotate(0deg);          opacity: 1; }
    100% { transform: translate(200px,-200px) rotate(45deg); opacity: 0; }
  }
  @keyframes todoSlideOut {
    0%   { opacity: 1; transform: translateX(0);    max-height: 80px; margin-bottom: 0.5rem; }
    100% { opacity: 0; transform: translateX(24px); max-height: 0;    margin-bottom: 0; padding-top: 0; padding-bottom: 0; overflow: hidden; }
  }
  .rocket-shake { animation: rocketShake 0.5s ease-in-out; }
  .rocket-fly   { animation: rocketFly   1s   ease-in  forwards; }
  .todo-out     { animation: todoSlideOut 0.45s ease-out forwards; }
`;

const PRIORITY_COLORS: Record<number, string> = {
  1: '#db4c3f',
  2: '#f49c18',
  3: '#4073ff',
  4: '#808080',
};

function formatDueDate(date: string): string {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(date: string): boolean {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

type EditorMode = { mode: 'add' } | { mode: 'edit'; todo: Todo } | null;

export function TodosPage() {
  const { todos, createTodo, completeTodo, deleteTodo, updateTodo } = useTodos();
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const [animPhase, setAnimPhase] = useState<{ id: string; phase: 'shake' | 'fly' | 'out' } | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = (data: TaskFormData) => {
    if (editorMode?.mode === 'edit') {
      updateTodo(editorMode.todo.id, {
        title: data.title,
        description: data.description || null,
        dueDate: data.dueDate,
        dueTime: data.dueTime,
        deadline: data.deadline,
        priority: data.priority,
        location: data.location || null,
        reminderConfig: data.reminders.length > 0 ? data.reminders : null,
        recurrence: data.recurrence,
        recurrenceEnd: data.recurrenceEnd,
        project: data.project,
      });
    } else {
      createTodo({
        title: data.title,
        description: data.description || null,
        dueDate: data.dueDate,
        dueTime: data.dueTime,
        deadline: data.deadline,
        priority: data.priority,
        location: data.location || null,
        reminderConfig: data.reminders.length > 0 ? data.reminders : null,
        recurrence: data.recurrence,
        recurrenceEnd: data.recurrenceEnd,
        project: data.project,
      });
    }
    setEditorMode(null);
  };

  const handleRocket = (id: string) => {
    if (animPhase) return;

    setAnimPhase({ id, phase: 'shake' });
    setConfetti(true);
    setTimeout(() => setAnimPhase({ id, phase: 'fly' }), 500);
    setTimeout(() => {
      setAnimPhase({ id, phase: 'out' });
      setRemovingIds(prev => new Set([...prev, id]));
    }, 1500);
    setTimeout(() => {
      completeTodo(id);
      setAnimPhase(null);
      setRemovingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 2000);

    if (confettiTimer.current) clearTimeout(confettiTimer.current);
    confettiTimer.current = setTimeout(() => setConfetti(false), 4000);
  };

  const activeTodos    = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t =>  t.completed);

  const editingTodo = editorMode?.mode === 'edit' ? editorMode.todo : null;

  return (
    <div className="flex h-full flex-col">
      <style>{ROCKET_STYLES}</style>

      {confetti && (
        <ReactConfetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={200}
          recycle={false}
          colors={['#FFD700', '#C0C0C0', '#6366f1', '#a855f7']}
          onConfettiComplete={() => setConfetti(false)}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
        />
      )}

      <PageHeader
        title="Todos"
        subtitle={activeTodos.length > 0 ? `${activeTodos.length} task${activeTodos.length !== 1 ? 's' : ''} remaining` : 'All done!'}
      />

      {/* Editor / Add button area */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="max-w-2xl">
          {editorMode ? (
            <TaskEditor
              key={editingTodo?.id ?? 'new'}
              initialData={editingTodo ? {
                title:       editingTodo.title,
                description: editingTodo.description ?? '',
                dueDate:     editingTodo.dueDate,
                dueTime:     editingTodo.dueTime,
                deadline:    editingTodo.deadline,
                priority:    editingTodo.priority as 1 | 2 | 3 | 4,
                location:    editingTodo.location ?? '',
                reminders:   editingTodo.reminderConfig ?? [],
                recurrence:  editingTodo.recurrence,
                recurrenceEnd: editingTodo.recurrenceEnd,
                project:     editingTodo.project,
                attachments: [],
              } : undefined}
              isEditing={editorMode.mode === 'edit'}
              onSave={handleSave}
              onCancel={() => setEditorMode(null)}
            />
          ) : (
            <button
              onClick={() => setEditorMode({ mode: 'add' })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors w-full"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Add a task</span>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-2xl space-y-2">
          {activeTodos.length === 0 && completedTodos.length === 0 && (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                <CheckSquare className="h-7 w-7 text-slate-600" />
              </div>
              <p className="text-slate-300 font-medium">No tasks yet</p>
              <p className="text-slate-500 text-sm mt-1">Add a task above and launch it with the rocket!</p>
            </div>
          )}

          {activeTodos.map(todo => {
            const isShaking = animPhase?.id === todo.id && animPhase.phase === 'shake';
            const isFlying  = animPhase?.id === todo.id && animPhase.phase === 'fly';
            const isOut     = removingIds.has(todo.id);
            const isBeingEdited = editingTodo?.id === todo.id;
            const pColor = PRIORITY_COLORS[todo.priority ?? 4];
            const overdue = todo.dueDate ? isOverdue(todo.dueDate) : false;

            return (
              <div
                key={todo.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 ${isOut ? 'todo-out' : ''} ${isBeingEdited ? 'opacity-50' : ''}`}
              >
                {/* Checkbox visual */}
                <div className="w-5 h-5 rounded border-2 shrink-0 mt-0.5" style={{ borderColor: pColor }} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-100 block">{todo.title}</span>
                  {/* Meta row */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {todo.dueDate && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: overdue ? '#db4c3f' : '#64748b' }}>
                        <Calendar className="h-3 w-3" />
                        {formatDueDate(todo.dueDate)}
                      </span>
                    )}
                    {todo.priority < 4 && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: pColor }}>
                        <Flag className="h-3 w-3" fill={pColor} />
                        P{todo.priority}
                      </span>
                    )}
                    {todo.location && (() => {
                      try {
                        const p = JSON.parse(todo.location);
                        const label = p.address || p.place || p.other || '';
                        return label ? <span className="text-xs text-slate-500 truncate max-w-24">{label}</span> : null;
                      } catch {
                        return <span className="text-xs text-slate-500 truncate max-w-24">{todo.location}</span>;
                      }
                    })()}
                    {todo.recurrence !== 'none' && (
                      <span className="text-xs text-slate-500">{todo.recurrence}</span>
                    )}
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => setEditorMode({ mode: 'edit', todo })}
                  disabled={!!animPhase}
                  title="Edit task"
                  className="p-1.5 rounded text-slate-600 hover:text-indigo-400 disabled:opacity-40 transition-colors shrink-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>

                {/* Rocket button */}
                <button
                  onClick={() => handleRocket(todo.id)}
                  disabled={!!animPhase}
                  title="Complete with rocket!"
                  className="p-1.5 rounded text-slate-400 hover:text-indigo-400 disabled:opacity-40 transition-colors shrink-0"
                >
                  <Rocket
                    className={`h-4 w-4 ${isShaking ? 'rocket-shake' : ''} ${isFlying ? 'rocket-fly' : ''}`}
                  />
                </button>
              </div>
            );
          })}

          {/* Completed section */}
          {completedTodos.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowCompleted(o => !o)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  {showCompleted ? 'Hide' : 'Show'} completed ({completedTodos.length})
                </button>
                <button
                  onClick={() => completedTodos.forEach(t => deleteTodo(t.id))}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-rose-400 transition-colors"
                  title="Clear all completed"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear all
                </button>
              </div>

              {showCompleted && completedTodos.map(todo => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 mb-2"
                >
                  <div className="w-5 h-5 rounded border-2 border-indigo-600/50 bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-indigo-400" />
                  </div>
                  <span className="flex-1 text-sm text-slate-500 line-through">{todo.title}</span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    title="Delete"
                    className="p-1 text-slate-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
