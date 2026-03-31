/**
 * pages/Todos/TodosPage.tsx
 * --------------------------
 * Hierarchical task system:
 *   - "Groups" are collapsible major task sections with assignable colors
 *   - Individual todos live inside groups or in the ungrouped section
 *   - Both groups and tasks within groups support drag-to-reorder
 *   - Group data (title, color, collapsed, taskIds) persists in localStorage
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactConfetti from 'react-confetti';
import {
  Rocket, CheckSquare, Check, Trash2, Flag, Calendar, Plus, Pencil,
  GripVertical, ChevronRight,
} from 'lucide-react';
import { useTodos } from '@/shared/context/TodosContext';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { TaskEditor, type TaskFormData } from './components/TaskEditor';
import type { Todo } from '@/shared/hooks/useApi';

// ── Group types & persistence ─────────────────────────────────────────────────

const GROUP_PALETTE = [
  '#6366f1','#f43f5e','#f59e0b','#10b981',
  '#0ea5e9','#8b5cf6','#f97316','#14b8a6',
  '#ec4899','#84cc16',
];

interface TaskGroup {
  id: string;
  title: string;
  color: string;
  collapsed: boolean;
  taskIds: string[]; // ordered todo IDs belonging to this group
}

const GROUPS_KEY = 'todo_groups_v1';
const loadGroups  = (): TaskGroup[] => { try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]'); } catch { return []; } };
const persistGroups = (g: TaskGroup[]) => localStorage.setItem(GROUPS_KEY, JSON.stringify(g));

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ── Rocket animation CSS ──────────────────────────────────────────────────────

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

const PRIORITY_COLORS: Record<number, string> = { 1:'#db4c3f', 2:'#f49c18', 3:'#4073ff', 4:'#808080' };

function formatDueDate(date: string): string {
  const d = new Date(date), today = new Date();
  today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}
function isOverdue(date: string) {
  const d = new Date(date), today = new Date(); today.setHours(0,0,0,0); return d < today;
}

type EditorMode = { mode: 'add' } | { mode: 'edit'; todo: Todo } | null;

// ── Task row (shared between group & ungrouped sections) ──────────────────────

interface TaskRowProps {
  todo: Todo;
  index: number;
  animPhase: { id: string; phase: 'shake'|'fly'|'out' } | null;
  removingIds: Set<string>;
  editingTodo: Todo | null;
  dragOverIndex: number | null;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDragEnd: () => void;
  onEdit: (todo: Todo) => void;
  onRocket: (id: string) => void;
}

function TaskRow({
  todo, index, animPhase, removingIds, editingTodo, dragOverIndex,
  onDragStart, onDragOver, onDragEnd, onEdit, onRocket,
}: TaskRowProps) {
  const isShaking     = animPhase?.id === todo.id && animPhase.phase === 'shake';
  const isFlying      = animPhase?.id === todo.id && animPhase.phase === 'fly';
  const isOut         = removingIds.has(todo.id);
  const isBeingEdited = editingTodo?.id === todo.id;
  const isDragging    = false; // tracked by ref, visual handled by opacity class
  const isDropTarget  = dragOverIndex === index;
  const pColor        = PRIORITY_COLORS[todo.priority ?? 4];
  const overdue       = todo.dueDate ? isOverdue(todo.dueDate) : false;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-lg bg-slate-800 border transition-all',
        isOut ? 'todo-out' : '',
        isBeingEdited ? 'opacity-40' : '',
        isDropTarget ? 'border-indigo-500 shadow-md shadow-indigo-900/30' : 'border-slate-700',
      ].join(' ')}
    >
      <div className="shrink-0 mt-0.5 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors" title="Drag to reorder">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-sm text-slate-100 block">{todo.title}</span>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {todo.dueDate && (
            <span className="flex items-center gap-1 text-xs" style={{ color: overdue ? '#db4c3f' : '#64748b' }}>
              <Calendar className="h-3 w-3" />{formatDueDate(todo.dueDate)}
            </span>
          )}
          {(todo.priority ?? 4) < 4 && (
            <span className="flex items-center gap-1 text-xs" style={{ color: pColor }}>
              <Flag className="h-3 w-3" fill={pColor} />P{todo.priority}
            </span>
          )}
          {todo.recurrence !== 'none' && (
            <span className="text-xs text-slate-500">{todo.recurrence}</span>
          )}
        </div>
      </div>

      <button onClick={() => onEdit(todo)} disabled={!!animPhase} title="Edit"
        className="p-1.5 rounded text-slate-600 hover:text-indigo-400 disabled:opacity-40 transition-colors shrink-0">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => onRocket(todo.id)} disabled={!!animPhase} title="Complete!"
        className="p-1.5 rounded text-slate-400 hover:text-indigo-400 disabled:opacity-40 transition-colors shrink-0">
        <Rocket className={`h-4 w-4 ${isShaking ? 'rocket-shake' : ''} ${isFlying ? 'rocket-fly' : ''}`} />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TodosPage() {
  const { todos, createTodo, completeTodo, deleteTodo, updateTodo } = useTodos();

  // ── Group state ────────────────────────────────────────────────
  const [groups, setGroups]         = useState<TaskGroup[]>(loadGroups);
  const [groupOrder, setGroupOrder] = useState<string[]>(() => loadGroups().map(g => g.id));
  const [editingGroupId, setEditingGroupId]     = useState<string | null>(null);
  const [editingGroupTitle, setEditingGroupTitle] = useState('');
  const [colorPickerGroupId, setColorPickerGroupId] = useState<string | null>(null);
  const [newGroupMode, setNewGroupMode]         = useState(false);
  const [newGroupTitle, setNewGroupTitle]       = useState('');

  // Keep groupOrder in sync when groups are added/removed
  useEffect(() => {
    setGroupOrder(prev => {
      const ids = groups.map(g => g.id);
      const existing = prev.filter(id => ids.includes(id));
      const added = ids.filter(id => !prev.includes(id));
      return [...existing, ...added];
    });
  }, [groups.map(g => g.id).join(',')]);

  const updateGroups = useCallback((fn: (prev: TaskGroup[]) => TaskGroup[]) => {
    setGroups(prev => { const next = fn(prev); persistGroups(next); return next; });
  }, []);

  const sortedGroups = groupOrder.map(id => groups.find(g => g.id === id)).filter(Boolean) as TaskGroup[];

  // ── Group DnD ──────────────────────────────────────────────────
  const groupDragIdx = useRef<number | null>(null);
  const [groupDragOver, setGroupDragOver] = useState<number | null>(null);

  const onGroupDragStart = (i: number) => { groupDragIdx.current = i; };
  const onGroupDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault(); setGroupDragOver(i);
    if (groupDragIdx.current === null || groupDragIdx.current === i) return;
    setGroupOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(groupDragIdx.current!, 1);
      next.splice(i, 0, moved);
      groupDragIdx.current = i;
      return next;
    });
  };
  const onGroupDragEnd = () => { groupDragIdx.current = null; setGroupDragOver(null); };

  // ── Per-group & ungrouped task order ───────────────────────────
  // Task order within each group is stored in group.taskIds.
  // For ungrouped tasks, we use local orderedIds.
  const allGroupedIds = new Set(groups.flatMap(g => g.taskIds));
  const activeTodos        = todos.filter(t => !t.completed);
  const completedTodos     = todos.filter(t =>  t.completed);
  const ungroupedActive    = activeTodos.filter(t => !allGroupedIds.has(t.id));

  const [ungroupedOrder, setUngroupedOrder] = useState<string[]>([]);
  const ungroupedKey = ungroupedActive.map(t => t.id).join(',');
  useEffect(() => {
    setUngroupedOrder(prev => {
      const ids = ungroupedKey ? ungroupedKey.split(',') : [];
      const existing = prev.filter(id => ids.includes(id));
      const added = ids.filter(id => !prev.includes(id));
      return [...existing, ...added];
    });
  }, [ungroupedKey]);

  const sortedUngrouped = ungroupedOrder
    .map(id => ungroupedActive.find(t => t.id === id))
    .filter(Boolean) as Todo[];

  // Ungrouped DnD
  const ungroupedDragIdx = useRef<number | null>(null);
  const [ungroupedDragOver, setUngroupedDragOver] = useState<number | null>(null);
  const onUngroupedDragStart = (i: number) => { ungroupedDragIdx.current = i; };
  const onUngroupedDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault(); setUngroupedDragOver(i);
    if (ungroupedDragIdx.current === null || ungroupedDragIdx.current === i) return;
    setUngroupedOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(ungroupedDragIdx.current!, 1);
      next.splice(i, 0, moved);
      ungroupedDragIdx.current = i;
      return next;
    });
  };
  const onUngroupedDragEnd = () => { ungroupedDragIdx.current = null; setUngroupedDragOver(null); };

  // Per-group task DnD (keyed by groupId)
  const groupTaskDragIdx  = useRef<Record<string, number | null>>({});
  const [groupTaskDragOver, setGroupTaskDragOver] = useState<Record<string, number | null>>({});

  const makeGroupTaskHandlers = (groupId: string) => ({
    onDragStart: (i: number) => { groupTaskDragIdx.current[groupId] = i; },
    onDragOver: (e: React.DragEvent, i: number) => {
      e.preventDefault();
      setGroupTaskDragOver(prev => ({ ...prev, [groupId]: i }));
      const di = groupTaskDragIdx.current[groupId];
      if (di === null || di === undefined || di === i) return;
      updateGroups(prev => prev.map(g => {
        if (g.id !== groupId) return g;
        const next = [...g.taskIds];
        const [moved] = next.splice(di, 1);
        next.splice(i, 0, moved);
        groupTaskDragIdx.current[groupId] = i;
        return { ...g, taskIds: next };
      }));
    },
    onDragEnd: () => {
      groupTaskDragIdx.current[groupId] = null;
      setGroupTaskDragOver(prev => ({ ...prev, [groupId]: null }));
    },
  });

  // ── Editor state ───────────────────────────────────────────────
  type EditorCtx = { groupId: string | null; mode: EditorMode };
  const [editorCtx, setEditorCtx] = useState<EditorCtx | null>(null);
  const pendingGroupAssign = useRef<string | null>(null);
  const prevTodoIds = useRef<Set<string>>(new Set(todos.map(t => t.id)));

  // Detect newly created todos and assign them to pending group
  const todoIdStr = todos.map(t => t.id).join(',');
  useEffect(() => {
    const currentIds = new Set(todos.map(t => t.id));
    if (pendingGroupAssign.current) {
      const gid = pendingGroupAssign.current;
      const newId = [...currentIds].find(id => !prevTodoIds.current.has(id));
      if (newId) {
        pendingGroupAssign.current = null;
        updateGroups(prev => prev.map(g =>
          g.id === gid ? { ...g, taskIds: [...g.taskIds, newId] } : g
        ));
      }
    }
    prevTodoIds.current = currentIds;
  }, [todoIdStr]);

  const handleSave = (data: TaskFormData) => {
    const ctx = editorCtx;
    if (ctx?.mode?.mode === 'edit') {
      updateTodo(ctx.mode.todo.id, {
        title: data.title, description: data.description || null,
        dueDate: data.dueDate, dueTime: data.dueTime, deadline: data.deadline,
        priority: data.priority, location: data.location || null,
        reminderConfig: data.reminders.length > 0 ? data.reminders : null,
        recurrence: data.recurrence, recurrenceEnd: data.recurrenceEnd, project: data.project,
      });
    } else {
      if (ctx?.groupId) pendingGroupAssign.current = ctx.groupId;
      createTodo({
        title: data.title, description: data.description || null,
        dueDate: data.dueDate, dueTime: data.dueTime, deadline: data.deadline,
        priority: data.priority, location: data.location || null,
        reminderConfig: data.reminders.length > 0 ? data.reminders : null,
        recurrence: data.recurrence, recurrenceEnd: data.recurrenceEnd, project: data.project,
      });
    }
    setEditorCtx(null);
  };

  // ── Rocket animation ───────────────────────────────────────────
  const [confetti, setConfetti]         = useState(false);
  const [animPhase, setAnimPhase]       = useState<{ id: string; phase: 'shake'|'fly'|'out' } | null>(null);
  const [removingIds, setRemovingIds]   = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRocket = (id: string) => {
    if (animPhase) return;
    setAnimPhase({ id, phase: 'shake' }); setConfetti(true);
    setTimeout(() => setAnimPhase({ id, phase: 'fly' }), 500);
    setTimeout(() => { setAnimPhase({ id, phase: 'out' }); setRemovingIds(p => new Set([...p, id])); }, 1500);
    setTimeout(() => {
      completeTodo(id); setAnimPhase(null);
      setRemovingIds(p => { const n = new Set(p); n.delete(id); return n; });
      // remove from group taskIds too
      updateGroups(prev => prev.map(g => ({ ...g, taskIds: g.taskIds.filter(tid => tid !== id) })));
    }, 2000);
    if (confettiTimer.current) clearTimeout(confettiTimer.current);
    confettiTimer.current = setTimeout(() => setConfetti(false), 4000);
  };

  const handleEdit = (todo: Todo) => setEditorCtx({ groupId: null, mode: { mode: 'edit', todo } });
  const editingTodo = editorCtx?.mode?.mode === 'edit' ? editorCtx.mode.todo : null;

  // ── Group CRUD ─────────────────────────────────────────────────
  const createGroup = () => {
    const title = newGroupTitle.trim() || 'New group';
    const g: TaskGroup = { id: uid(), title, color: GROUP_PALETTE[groups.length % GROUP_PALETTE.length], collapsed: false, taskIds: [] };
    updateGroups(prev => [...prev, g]);
    setNewGroupMode(false); setNewGroupTitle('');
  };

  const deleteGroup = (gid: string) => {
    updateGroups(prev => prev.filter(g => g.id !== gid));
  };

  const toggleCollapse = (gid: string) => {
    updateGroups(prev => prev.map(g => g.id === gid ? { ...g, collapsed: !g.collapsed } : g));
  };

  const setGroupColor = (gid: string, color: string) => {
    updateGroups(prev => prev.map(g => g.id === gid ? { ...g, color } : g));
    setColorPickerGroupId(null);
  };

  const commitGroupTitle = (gid: string) => {
    const t = editingGroupTitle.trim();
    if (t) updateGroups(prev => prev.map(g => g.id === gid ? { ...g, title: t } : g));
    setEditingGroupId(null);
  };

  // ── Render helpers ─────────────────────────────────────────────

  const renderEditor = (groupId: string | null) => {
    if (!editorCtx || editorCtx.groupId !== groupId) return null;
    return (
      <div className="mt-2 mb-1">
        <TaskEditor
          key={editingTodo?.id ?? 'new'}
          initialData={editingTodo ? {
            title: editingTodo.title, description: editingTodo.description ?? '',
            dueDate: editingTodo.dueDate, dueTime: editingTodo.dueTime, deadline: editingTodo.deadline,
            priority: editingTodo.priority as 1|2|3|4, location: editingTodo.location ?? '',
            reminders: editingTodo.reminderConfig ?? [], recurrence: editingTodo.recurrence,
            recurrenceEnd: editingTodo.recurrenceEnd, project: editingTodo.project, attachments: [],
          } : undefined}
          isEditing={editorCtx.mode?.mode === 'edit'}
          onSave={handleSave}
          onCancel={() => setEditorCtx(null)}
        />
      </div>
    );
  };

  // ── JSX ────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col" onClick={() => setColorPickerGroupId(null)}>
      <style>{ROCKET_STYLES}</style>

      {confetti && (
        <ReactConfetti
          width={window.innerWidth} height={window.innerHeight}
          numberOfPieces={200} recycle={false}
          colors={['#FFD700','#C0C0C0','#6366f1','#a855f7']}
          onConfettiComplete={() => setConfetti(false)}
          style={{ position:'fixed', top:0, left:0, zIndex:9999, pointerEvents:'none' }}
        />
      )}

      <PageHeader
        title="Todos"
        subtitle={activeTodos.length > 0 ? `${activeTodos.length} task${activeTodos.length !== 1 ? 's' : ''} remaining` : 'All done!'}
      />

      {/* Global add button (for ungrouped tasks) */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="max-w-2xl">
          {editorCtx?.groupId === null && editorCtx.mode !== null ? (
            renderEditor(null)
          ) : (
            <button
              onClick={() => setEditorCtx({ groupId: null, mode: { mode: 'add' } })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors w-full"
            >
              <Plus className="h-4 w-4" /><span className="text-sm">Add a task</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-2xl space-y-3">

          {/* ── Groups ─────────────────────────────────────────── */}
          {sortedGroups.map((group, gi) => {
            const groupTodos = group.taskIds
              .map(id => activeTodos.find(t => t.id === id))
              .filter(Boolean) as Todo[];
            const handlers = makeGroupTaskHandlers(group.id);
            const dov = groupTaskDragOver[group.id] ?? null;
            const isGroupDropTarget = groupDragOver === gi && groupDragIdx.current !== gi;

            return (
              <div
                key={group.id}
                draggable
                onDragStart={e => { e.stopPropagation(); onGroupDragStart(gi); }}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); onGroupDragOver(e, gi); }}
                onDragEnd={onGroupDragEnd}
                className={`rounded-xl border-2 transition-all ${isGroupDropTarget ? 'border-dashed opacity-60' : 'border-transparent'}`}
                style={{ background: group.color + '0d', borderColor: isGroupDropTarget ? group.color : 'transparent' }}
              >
                {/* Group header */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer select-none"
                  style={{ borderLeft: `4px solid ${group.color}` }}
                >
                  {/* Group drag handle */}
                  <GripVertical className="h-5 w-5 text-slate-600 hover:text-slate-400 shrink-0 cursor-grab active:cursor-grabbing" />

                  {/* Color dot / picker trigger */}
                  <div className="relative shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setColorPickerGroupId(colorPickerGroupId === group.id ? null : group.id); }}
                      className="w-4 h-4 rounded-full border-2 border-slate-600 hover:border-slate-400 transition-colors"
                      style={{ background: group.color }}
                      title="Change color"
                    />
                    {colorPickerGroupId === group.id && (
                      <div
                        className="absolute top-6 left-0 z-50 p-2 rounded-lg bg-slate-900 border border-slate-700 shadow-xl grid grid-cols-5 gap-1.5"
                        onClick={e => e.stopPropagation()}
                      >
                        {GROUP_PALETTE.map(c => (
                          <button
                            key={c}
                            onClick={() => setGroupColor(group.id, c)}
                            className="w-5 h-5 rounded-full hover:scale-110 transition-transform border-2"
                            style={{ background: c, borderColor: group.color === c ? '#fff' : 'transparent' }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Title (editable on double-click) */}
                  {editingGroupId === group.id ? (
                    <input
                      autoFocus
                      value={editingGroupTitle}
                      onChange={e => setEditingGroupTitle(e.target.value)}
                      onBlur={() => commitGroupTitle(group.id)}
                      onKeyDown={e => { if (e.key === 'Enter') commitGroupTitle(group.id); if (e.key === 'Escape') setEditingGroupId(null); }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 bg-transparent text-slate-100 font-semibold text-sm outline-none border-b border-indigo-500"
                    />
                  ) : (
                    <span
                      className="flex-1 text-slate-100 font-semibold text-sm"
                      onDoubleClick={() => { setEditingGroupId(group.id); setEditingGroupTitle(group.title); }}
                      title="Double-click to rename"
                    >
                      {group.title}
                    </span>
                  )}

                  {/* Task count badge */}
                  {groupTodos.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 shrink-0">
                      {groupTodos.length}
                    </span>
                  )}

                  {/* Add task to group */}
                  <button
                    onClick={e => { e.stopPropagation(); setEditorCtx({ groupId: group.id, mode: { mode: 'add' } }); if (group.collapsed) toggleCollapse(group.id); }}
                    className="p-1 rounded text-slate-500 hover:text-indigo-400 transition-colors shrink-0"
                    title="Add task to this group"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  {/* Delete group */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteGroup(group.id); }}
                    className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors shrink-0"
                    title="Delete group"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Collapse toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleCollapse(group.id); }}
                    className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                  >
                    <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${group.collapsed ? '' : 'rotate-90'}`} />
                  </button>
                </div>

                {/* Tasks inside group */}
                {!group.collapsed && (
                  <div className="pb-2 px-2 space-y-1.5">
                    {groupTodos.length === 0 && !editorCtx?.groupId && (
                      <p className="text-xs text-slate-600 text-center py-3 italic">No tasks yet — click + to add one</p>
                    )}
                    {groupTodos.map((todo, ti) => (
                      <TaskRow
                        key={todo.id}
                        todo={todo} index={ti}
                        animPhase={animPhase} removingIds={removingIds} editingTodo={editingTodo}
                        dragOverIndex={dov}
                        onDragStart={handlers.onDragStart}
                        onDragOver={handlers.onDragOver}
                        onDragEnd={handlers.onDragEnd}
                        onEdit={handleEdit}
                        onRocket={handleRocket}
                      />
                    ))}
                    {/* Inline editor for this group */}
                    {renderEditor(group.id)}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── New group input ─────────────────────────────────── */}
          {newGroupMode ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-600 bg-slate-800/50">
              <div className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
              <input
                autoFocus
                value={newGroupTitle}
                onChange={e => setNewGroupTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createGroup(); if (e.key === 'Escape') { setNewGroupMode(false); setNewGroupTitle(''); } }}
                placeholder="Group name…"
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-600 outline-none"
              />
              <button onClick={createGroup} className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">Create</button>
              <button onClick={() => { setNewGroupMode(false); setNewGroupTitle(''); }} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setNewGroupMode(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-700 text-slate-600 hover:text-slate-400 hover:border-slate-600 transition-colors w-full text-sm"
            >
              <Plus className="h-3.5 w-3.5" /> New group
            </button>
          )}

          {/* ── Ungrouped tasks ─────────────────────────────────── */}
          {sortedUngrouped.length > 0 && (
            <div className="space-y-1.5">
              {groups.length > 0 && (
                <p className="text-xs text-slate-600 font-medium px-1 pt-2">Other tasks</p>
              )}
              {sortedUngrouped.map((todo, i) => (
                <TaskRow
                  key={todo.id}
                  todo={todo} index={i}
                  animPhase={animPhase} removingIds={removingIds} editingTodo={editingTodo}
                  dragOverIndex={ungroupedDragOver}
                  onDragStart={onUngroupedDragStart}
                  onDragOver={onUngroupedDragOver}
                  onDragEnd={onUngroupedDragEnd}
                  onEdit={handleEdit}
                  onRocket={handleRocket}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {activeTodos.length === 0 && completedTodos.length === 0 && groups.length === 0 && (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                <CheckSquare className="h-7 w-7 text-slate-600" />
              </div>
              <p className="text-slate-300 font-medium">No tasks yet</p>
              <p className="text-slate-500 text-sm mt-1">Add a task or create a group to get started.</p>
            </div>
          )}

          {/* ── Completed section ───────────────────────────────── */}
          {completedTodos.length > 0 && (
            <div className="pt-2">
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
                  <Trash2 className="h-3 w-3" />Clear all
                </button>
              </div>
              {showCompleted && completedTodos.map(todo => (
                <div key={todo.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 mb-2">
                  <div className="w-5 h-5 rounded border-2 border-indigo-600/50 bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-indigo-400" />
                  </div>
                  <span className="flex-1 text-sm text-slate-500 line-through">{todo.title}</span>
                  <button onClick={() => deleteTodo(todo.id)} title="Delete" className="p-1 text-slate-600 hover:text-rose-400 transition-colors">
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
