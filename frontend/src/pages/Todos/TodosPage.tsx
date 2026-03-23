/**
 * pages/Todos/TodosPage.tsx
 * --------------------------
 * Checklist page with rocket-launch completion animation and confetti.
 *
 * Completion sequence per item:
 *  1. Click rocket → shake animation (0.5 s)
 *  2. Rocket flies off screen (1 s, starts at 0.5 s)
 *  3. Item fades/slides out (starts at 1.5 s)
 *  4. Confetti fires full-screen for ~3 s (recycle=false)
 */

import { useState, useRef } from 'react';
import ReactConfetti from 'react-confetti';
import { Rocket, Plus, CheckSquare, Check, Trash2 } from 'lucide-react';
import { useTodos } from '@/shared/context/TodosContext';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { GradientButton } from '@/shared/components/ui/GradientButton';

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

export function TodosPage() {
  const { todos, createTodo, completeTodo, deleteTodo } = useTodos();
  const [input, setInput] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [confetti, setConfetti] = useState(false);

  // Track which item is mid-animation and what phase
  const [animPhase, setAnimPhase] = useState<{ id: string; phase: 'shake' | 'fly' | 'out' } | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAdd = () => {
    const title = input.trim();
    if (!title) return;
    createTodo(title);
    setInput('');
  };

  const handleRocket = (id: string) => {
    if (animPhase) return; // one at a time

    // Phase 1 – shake (0–500 ms) + fire confetti immediately
    setAnimPhase({ id, phase: 'shake' });
    setConfetti(true);

    // Phase 2 – fly (500–1500 ms)
    setTimeout(() => setAnimPhase({ id, phase: 'fly' }), 500);

    // Phase 3 – slide item out (1500–1950 ms)
    setTimeout(() => {
      setAnimPhase({ id, phase: 'out' });
      setRemovingIds(prev => new Set([...prev, id]));
    }, 1500);

    // Mark complete + clean up (2000 ms)
    setTimeout(() => {
      completeTodo(id);
      setAnimPhase(null);
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2000);

    // Stop confetti after 4 s
    if (confettiTimer.current) clearTimeout(confettiTimer.current);
    confettiTimer.current = setTimeout(() => setConfetti(false), 4000);
  };

  const activeTodos    = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t =>  t.completed);

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
        subtitle="Rocket-launch your tasks"
      />

      {/* Add input */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex gap-2 max-w-2xl">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add a new task..."
            className="flex-1 h-9 px-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 placeholder:text-slate-500 transition-colors"
          />
          <GradientButton
            text="Add"
            icon={Plus}
            onClick={handleAdd}
            disabled={!input.trim()}
            size="md"
          />
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

            return (
              <div
                key={todo.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 ${isOut ? 'todo-out' : ''}`}
              >
                {/* Empty checkbox (visual only — rocket = complete) */}
                <div className="w-5 h-5 rounded border-2 border-slate-600 shrink-0" />

                {/* Title */}
                <span className="flex-1 text-sm text-slate-100">{todo.title}</span>

                {/* Rocket button */}
                <button
                  onClick={() => handleRocket(todo.id)}
                  disabled={!!animPhase}
                  title="Complete with rocket!"
                  className="p-1.5 rounded text-slate-400 hover:text-indigo-400 disabled:opacity-40 transition-colors"
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
              <button
                onClick={() => setShowCompleted(o => !o)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-3 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                {showCompleted ? 'Hide' : 'Show'} completed ({completedTodos.length})
              </button>

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
