/**
 * NotesEditor/NoteCard.tsx
 * -------------------------
 * Single note card shown in the NotesList.
 *
 * Shows: title, content preview (first ~60 chars), tag chips (max 2 + overflow),
 * relative timestamp, hover-revealed pin / delete buttons.
 * Selected and pinned states are indicated with a colored left border.
 */

import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Pin, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { type Note } from '@/shared/types/note.types';

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

function formatNoteDate(iso: string): string {
  const date = new Date(iso);
  if (isToday(date))     return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

export function NoteCard({ note, isSelected, onSelect, onTogglePin, onDelete }: NoteCardProps) {
  const preview = note.content.trim().slice(0, 80) || null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      onClick={onSelect}
      className={clsx(
        'group relative cursor-pointer rounded-lg border p-3 transition-all duration-150 border-l-[3px]',
        isSelected
          ? 'border-primary-600 border-l-primary-500 bg-primary-900/20 shadow-sm'
          : note.pinned
          ? 'border-slate-700 border-l-primary-500 bg-slate-800/50 hover:bg-slate-800'
          : 'border-slate-700 border-l-transparent bg-slate-800/50 hover:bg-slate-800 hover:border-l-slate-600',
      )}
    >
      {/* Delete button — top-right, appears on hover */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete note"
        className="absolute right-2 top-2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-900/40 hover:text-rose-400"
      >
        <X className="h-3.5 w-3.5 text-slate-500 hover:text-rose-400" />
      </button>

      {/* Title */}
      <h3 className={clsx(
        'mb-1 pr-6 text-sm font-semibold leading-tight line-clamp-1',
        isSelected ? 'text-primary-400' : 'text-slate-100',
      )}>
        {note.title || 'Untitled Note'}
      </h3>

      {/* Content preview */}
      <p className="mb-2 text-[12px] leading-snug text-slate-500 line-clamp-2 min-h-[1rem]">
        {preview ?? <span className="italic">Empty note</span>}
      </p>

      {/* Bottom row: tags + timestamp + pin */}
      <div className="flex items-center justify-between gap-1">
        {/* Tag chips (max 2 shown) */}
        <div className="flex flex-wrap gap-1 flex-1 min-w-0 overflow-hidden">
          {note.tags.slice(0, 2).map(tag => (
            <span key={tag} className="inline-flex items-center px-1.5 py-0 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] shrink-0">
              {tag}
            </span>
          ))}
          {note.tags.length > 2 && (
            <span className="inline-flex items-center px-1.5 py-0 h-4 rounded-full border border-slate-600 text-slate-400 text-[10px] shrink-0">
              +{note.tags.length - 2}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-slate-500">{formatNoteDate(note.updatedAt)}</span>
          {/* Pin button */}
          <button
            onClick={e => { e.stopPropagation(); onTogglePin(); }}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
            className={clsx(
              'rounded p-0.5 transition-colors hover:bg-slate-700',
              note.pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
          >
            <Pin className={clsx(
              'h-3 w-3',
              note.pinned ? 'text-primary-400 fill-primary-400' : 'text-slate-500',
            )} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
