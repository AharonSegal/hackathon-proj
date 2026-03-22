/**
 * shared/context/NotesContext.tsx
 * --------------------------------
 * Global notes state backed by the Turso database via /api/notes.
 *
 * Strategy:
 * - On mount: render from localStorage cache immediately, then fetch from API
 *   and replace (same pattern as events).
 * - All mutations are optimistic: state + cache update instantly, then API call
 *   fires in the background. On API failure the change is reverted + toast shown.
 * - Content updates (every keystroke) are debounced 1.5 s before hitting the DB.
 * - notesRef always holds the latest notes array, preventing stale-closure bugs
 *   in async callbacks.
 */

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { type Note } from '@/shared/types/note.types';
import { notesApi } from '@/shared/hooks/useApi';

const CACHE_KEY = 'cache_v1_notes';

function loadCache(): Note[] {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); }
  catch { return []; }
}

function saveCache(notes: Note[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(notes)); }
  catch { /* storage full — ignore */ }
}

interface NotesContextValue {
  notes: Note[];
  selectedNote: Note | null;
  setSelectedNote: (note: Note | null) => void;
  createNote: () => void;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  renameNote: (id: string, title: string) => void;
  updateTags: (id: string, tags: string[]) => void;
  restoreNote: (note: Note) => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotesState] = useState<Note[]>(loadCache);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // notesRef always tracks the latest notes to avoid stale closures in async callbacks
  const notesRef = useRef<Note[]>(notes);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Commit a new notes array to state + ref + cache, keep selectedNote in sync */
  const commit = (next: Note[]) => {
    notesRef.current = next;
    setNotesState(next);
    saveCache(next);
    setSelectedNote(prev => prev ? (next.find(n => n.id === prev.id) ?? null) : null);
  };

  // ── Fetch from DB on mount ────────────────────────────────────────────────
  useEffect(() => {
    notesApi.getAll().then(data => commit(data)).catch(() => { /* stay on cache */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createNote = () => {
    const note: Note = {
      id:        crypto.randomUUID(),
      title:     'Untitled Note',
      content:   '[]',
      pinned:    false,
      tags:      [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const snapshot = notesRef.current;
    commit([note, ...snapshot]);
    setSelectedNote(note);

    notesApi.create(note)
      .then(saved => commit(notesRef.current.map(n => n.id === note.id ? saved : n)))
      .catch(() => { commit(snapshot); toast.error('Failed to create note'); });
  };

  const updateNote = (id: string, content: string) => {
    const next = notesRef.current.map(n =>
      n.id === id ? { ...n, content, updatedAt: new Date().toISOString() } : n,
    );
    commit(next);

    // Debounce DB write — content changes on every keystroke
    if (contentTimer.current) clearTimeout(contentTimer.current);
    contentTimer.current = setTimeout(() => {
      notesApi.update(id, { content }).catch(() => toast.error('Auto-save failed'));
    }, 1500);
  };

  const deleteNote = (id: string) => {
    const snapshot = notesRef.current;
    commit(snapshot.filter(n => n.id !== id));

    notesApi.delete(id).catch(() => { commit(snapshot); toast.error('Failed to delete note'); });
  };

  const togglePin = (id: string) => {
    const note = notesRef.current.find(n => n.id === id);
    if (!note) return;
    const snapshot = notesRef.current;
    commit(snapshot.map(n =>
      n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n,
    ));
    notesApi.update(id, { pinned: !note.pinned })
      .catch(() => { commit(snapshot); toast.error('Failed to update note'); });
  };

  const renameNote = (id: string, title: string) => {
    const snapshot = notesRef.current;
    commit(snapshot.map(n =>
      n.id === id ? { ...n, title, updatedAt: new Date().toISOString() } : n,
    ));
    notesApi.update(id, { title })
      .catch(() => { commit(snapshot); toast.error('Failed to rename note'); });
  };

  const updateTags = (id: string, tags: string[]) => {
    const snapshot = notesRef.current;
    commit(snapshot.map(n =>
      n.id === id ? { ...n, tags, updatedAt: new Date().toISOString() } : n,
    ));
    notesApi.update(id, { tags })
      .catch(() => { commit(snapshot); toast.error('Failed to update tags'); });
  };

  const restoreNote = (note: Note) => {
    const snapshot = notesRef.current;
    const exists = snapshot.some(n => n.id === note.id);
    const next = exists
      ? snapshot.map(n => n.id === note.id ? note : n)
      : [note, ...snapshot];
    commit(next);
    setSelectedNote(note);

    notesApi.create(note)
      .catch(() => { commit(snapshot); toast.error('Failed to restore note'); });
  };

  return (
    <NotesContext.Provider value={{
      notes, selectedNote, setSelectedNote,
      createNote, updateNote, deleteNote,
      togglePin, renameNote, updateTags, restoreNote,
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within NotesProvider');
  return ctx;
}
