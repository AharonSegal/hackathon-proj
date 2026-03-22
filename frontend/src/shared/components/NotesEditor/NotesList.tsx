/**
 * NotesEditor/NotesList.tsx
 * --------------------------
 * Scrollable list panel — search bar, New button, Pinned / All Notes sections.
 * Delegates pin and delete logic to the parent page (which owns the undo toast).
 */

import { useState } from 'react';
import { Plus, Search, NotebookPen } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { type Note } from '@/shared/types/note.types';
import { NoteCard } from './NoteCard';
import { Button } from '@/shared/components/ui/Button';

interface NotesListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  onTogglePin: (id: string) => void;
  onDeleteNote: (id: string) => void;
}

const byUpdated = (a: Note, b: Note) =>
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

export function NotesList({
  notes, selectedNote, onSelectNote, onCreateNote, onTogglePin, onDeleteNote,
}: NotesListProps) {
  const [search, setSearch] = useState('');

  const filtered = notes.filter(n => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)) || n.content.toLowerCase().includes(q);
  });

  const pinned   = filtered.filter(n =>  n.pinned).sort(byUpdated);
  const unpinned = filtered.filter(n => !n.pinned).sort(byUpdated);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-700">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</h2>
        <Button size="sm" onClick={onCreateNote} className="h-7 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {/* Note cards */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        {filtered.length === 0 ? (
          <EmptyState search={search} onCreateNote={onCreateNote} />
        ) : (
          <AnimatePresence>
            {pinned.length > 0 && (
              <>
                <SectionHeader label="Pinned" />
                {pinned.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelected={selectedNote?.id === note.id}
                    onSelect={() => onSelectNote(note)}
                    onTogglePin={() => onTogglePin(note.id)}
                    onDelete={() => onDeleteNote(note.id)}
                  />
                ))}
              </>
            )}
            {unpinned.length > 0 && (
              <>
                <SectionHeader label={pinned.length > 0 ? 'All Notes' : 'Notes'} />
                {unpinned.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelected={selectedNote?.id === note.id}
                    onSelect={() => onSelectNote(note)}
                    onTogglePin={() => onTogglePin(note.id)}
                    onDelete={() => onDeleteNote(note.id)}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <motion.p layout className="px-1 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
      {label}
    </motion.p>
  );
}

function EmptyState({ search, onCreateNote }: { search: string; onCreateNote: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
        <NotebookPen className="h-5 w-5 text-slate-500" />
      </div>
      {search ? (
        <>
          <p className="text-sm font-medium text-slate-300">No results</p>
          <p className="text-xs text-slate-500">No notes match "{search}"</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-300">No notes yet</p>
          <p className="text-xs text-slate-500">Create your first note to get started</p>
          <Button size="sm" variant="ghost" onClick={onCreateNote} className="mt-1 text-xs h-7">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Note
          </Button>
        </>
      )}
    </div>
  );
}
