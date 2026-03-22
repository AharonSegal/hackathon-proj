/**
 * shared/context/NotesContext.tsx
 * --------------------------------
 * Global notes state persisted to localStorage.
 *
 * Mirrors the API of the Firebase-backed NotesContext from the
 * data_manage_app project, but stores everything locally so no
 * backend changes are needed.
 *
 * All operations are synchronous writes to localStorage; the state
 * update triggers a re-render immediately across the app.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import { type Note } from '@/shared/types/note.types';
import { SEED_NOTES } from '@/shared/data/notesSeedData';

const STORAGE_KEY = 'calendar_notes';

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

function loadNotes(): Note[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  // Key has never been set → first visit. Seed with mock data and persist it.
  if (raw === null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTES));
    return SEED_NOTES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Persist + update state together
  const commit = (next: Note[]) => {
    saveNotes(next);
    setNotes(next);
    // Keep selectedNote in sync with any field updates
    setSelectedNote(prev => prev ? (next.find(n => n.id === prev.id) ?? null) : null);
  };

  const createNote = () => {
    const note: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '[]',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      tags: [],
    };
    const next = [note, ...notes];
    saveNotes(next);
    setNotes(next);
    setSelectedNote(note); // select new note immediately
  };

  const updateNote = (id: string, content: string) => {
    commit(notes.map(n => n.id === id ? { ...n, content, updatedAt: new Date().toISOString() } : n));
  };

  const deleteNote = (id: string) => {
    commit(notes.filter(n => n.id !== id));
  };

  const togglePin = (id: string) => {
    commit(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n));
  };

  const renameNote = (id: string, title: string) => {
    commit(notes.map(n => n.id === id ? { ...n, title, updatedAt: new Date().toISOString() } : n));
  };

  const updateTags = (id: string, tags: string[]) => {
    commit(notes.map(n => n.id === id ? { ...n, tags, updatedAt: new Date().toISOString() } : n));
  };

  const restoreNote = (note: Note) => {
    const exists = notes.some(n => n.id === note.id);
    const next = exists ? notes.map(n => n.id === note.id ? note : n) : [note, ...notes];
    saveNotes(next);
    setNotes(next);
    setSelectedNote(note);
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
