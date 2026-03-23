/**
 * shared/context/TodosContext.tsx
 * --------------------------------
 * Global todos state backed by the Turso database via /api/todos.
 * Follows the same optimistic-update pattern as NotesContext.
 */

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { todosApi, type Todo } from '@/shared/hooks/useApi';

const CACHE_KEY = 'cache_v1_todos';

function loadCache(): Todo[] {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); }
  catch { return []; }
}

function saveCache(todos: Todo[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(todos)); }
  catch { /* storage full */ }
}

interface TodosContextValue {
  todos: Todo[];
  createTodo: (title: string) => void;
  completeTodo: (id: string) => void;
  updateTodo: (id: string, title: string) => void;
  deleteTodo: (id: string) => void;
}

const TodosContext = createContext<TodosContextValue | null>(null);

export function TodosProvider({ children }: { children: ReactNode }) {
  const [todos, setTodosState] = useState<Todo[]>(loadCache);
  const todosRef = useRef<Todo[]>(todos);

  const commit = (next: Todo[]) => {
    todosRef.current = next;
    setTodosState(next);
    saveCache(next);
  };

  useEffect(() => {
    todosApi.getAll().then(data => commit(data)).catch(() => { /* stay on cache */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTodo = (title: string) => {
    const todo: Todo = {
      id:          crypto.randomUUID(),
      title,
      completed:   false,
      completedAt: null,
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    };
    const snapshot = todosRef.current;
    commit([todo, ...snapshot]);

    todosApi.create({ id: todo.id, title })
      .then(saved => commit(todosRef.current.map(t => t.id === todo.id ? saved : t)))
      .catch(() => { commit(snapshot); toast.error('Failed to create todo'); });
  };

  const completeTodo = (id: string) => {
    const now = new Date().toISOString();
    const snapshot = todosRef.current;
    commit(snapshot.map(t =>
      t.id === id ? { ...t, completed: true, completedAt: now, updatedAt: now } : t,
    ));
    todosApi.update(id, { completed: true, completedAt: now })
      .catch(() => { commit(snapshot); toast.error('Failed to complete todo'); });
  };

  const updateTodo = (id: string, title: string) => {
    const snapshot = todosRef.current;
    commit(snapshot.map(t =>
      t.id === id ? { ...t, title, updatedAt: new Date().toISOString() } : t,
    ));
    todosApi.update(id, { title })
      .catch(() => { commit(snapshot); toast.error('Failed to update todo'); });
  };

  const deleteTodo = (id: string) => {
    const snapshot = todosRef.current;
    commit(snapshot.filter(t => t.id !== id));
    todosApi.delete(id).catch(() => { commit(snapshot); toast.error('Failed to delete todo'); });
  };

  return (
    <TodosContext.Provider value={{ todos, createTodo, completeTodo, updateTodo, deleteTodo }}>
      {children}
    </TodosContext.Provider>
  );
}

export function useTodos() {
  const ctx = useContext(TodosContext);
  if (!ctx) throw new Error('useTodos must be used within TodosProvider');
  return ctx;
}
