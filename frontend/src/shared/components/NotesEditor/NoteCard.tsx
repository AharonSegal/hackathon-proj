/**
 * NotesEditor/NoteCard.tsx
 * -------------------------
 * Single note card shown in the NotesList.
 *
 * Shows: title, content preview (first ~60 chars), tag chips (max 2 + overflow),
 * relative timestamp, hover-revealed pin / delete buttons, drag handle,
 * and a "Move to folder" dropdown.
 */

import { useState } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Pin, X, Folder, GripVertical, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { type Note, type Folder as FolderType, FOLDER_COLORS } from '@/shared/types/note.types';
import { AttachmentModal } from '@/shared/components/Attachments/AttachmentModal';
import { getAttachmentCount } from '@/shared/hooks/useAttachments';

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  isMultiSelected: boolean;
  isSelectionMode: boolean;
  folders: FolderType[];
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onToggleMultiSelect: (e: React.MouseEvent) => void;
}

function formatNoteDate(iso: string): string {
  const date = new Date(iso);
  if (isToday(date))     return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

/** Extract plain text from a BlockNote JSON blocks string */
function getBlockPreview(raw: string): string | null {
  if (!raw || raw === '[]' || raw === '') return null;
  try {
    const blocks = JSON.parse(raw) as Array<{ content?: Array<{ type: string; text?: string }> }>;
    const text = blocks
      .flatMap(b => b.content ?? [])
      .filter(c => c.type === 'text' && c.text)
      .map(c => c.text!)
      .join('')
      .trim();
    return text.slice(0, 80) || null;
  } catch {
    return null;
  }
}

export function NoteCard({
  note, isSelected, isMultiSelected, isSelectionMode,
  folders, onSelect, onTogglePin, onDelete, onMoveToFolder, onToggleMultiSelect,
}: NoteCardProps) {
  const preview = getBlockPreview(note.content);
  const [folderMenuOpen,      setFolderMenuOpen]      = useState(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [attachCount,         setAttachCount]         = useState(() => getAttachmentCount(note.id));

  const currentFolder = note.folderId ? folders.find(f => f.id === note.folderId) : null;
  const currentFolderColor = currentFolder
    ? (FOLDER_COLORS[currentFolder.color as keyof typeof FOLDER_COLORS] ?? FOLDER_COLORS.slate)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      draggable
      onDragStartCapture={(e) => e.dataTransfer.setData('noteId', note.id)}
      onClick={onSelect}
      className={clsx(
        'group relative cursor-pointer rounded-lg border p-3 transition-all duration-150 border-l-[3px] flex gap-1.5',
        isMultiSelected
          ? 'border-indigo-500/50 border-l-indigo-500 bg-indigo-900/20 ring-2 ring-indigo-500/50 shadow-sm'
          : isSelected
          ? 'border-primary-600 border-l-primary-500 bg-primary-900/20 shadow-sm'
          : note.pinned
          ? 'border-slate-700 border-l-primary-500 bg-slate-800/50 hover:bg-slate-800'
          : 'border-slate-700 border-l-transparent bg-slate-800/50 hover:bg-slate-800 hover:border-l-slate-600',
      )}
    >
      {/* Checkbox — left of drag handle */}
      <div
        className={clsx(
          'shrink-0 flex items-start pt-0.5 transition-opacity',
          isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        onClick={e => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isMultiSelected}
          onChange={() => {}}
          onClick={e => { e.stopPropagation(); onToggleMultiSelect(e); }}
          className="accent-indigo-500 h-3.5 w-3.5 rounded cursor-pointer"
        />
      </div>

      {/* Drag handle */}
      <div
        className="shrink-0 flex items-start pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5 text-slate-600" />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
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

        {/* Folder indicator */}
        {currentFolder && (
          <div className="flex items-center gap-1 mb-1.5">
            <Folder className="h-2.5 w-2.5 shrink-0" style={{ color: currentFolderColor ?? undefined }} />
            <span className="text-[10px] text-slate-500 truncate">{currentFolder.name}</span>
          </div>
        )}

        {/* Bottom row: tags + timestamp + pin + folder move */}
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

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-slate-500">{formatNoteDate(note.updatedAt)}</span>

            {/* Move to folder button */}
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setFolderMenuOpen(o => !o); }}
                aria-label="Move to folder"
                className="rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700"
              >
                <Folder className="h-3 w-3 text-slate-500" />
              </button>
              {folderMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setFolderMenuOpen(false); }} />
                  <div className="absolute right-0 bottom-6 z-50 min-w-[140px] rounded-lg border border-slate-700 bg-slate-800 shadow-xl py-1">
                    <p className="px-3 py-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Move to</p>
                    <button
                      onClick={e => { e.stopPropagation(); onMoveToFolder(null); setFolderMenuOpen(false); }}
                      className={clsx(
                        'flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors',
                        note.folderId === null ? 'text-primary-400' : 'text-slate-300 hover:text-slate-100',
                      )}
                    >
                      <Folder className="h-3 w-3 text-slate-500" />
                      No Folder
                    </button>
                    {folders.map(folder => {
                      const color = FOLDER_COLORS[folder.color as keyof typeof FOLDER_COLORS] ?? FOLDER_COLORS.slate;
                      return (
                        <button
                          key={folder.id}
                          onClick={e => { e.stopPropagation(); onMoveToFolder(folder.id); setFolderMenuOpen(false); }}
                          className={clsx(
                            'flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors',
                            note.folderId === folder.id ? 'text-primary-400' : 'text-slate-300 hover:text-slate-100',
                          )}
                        >
                          <Folder className="h-3 w-3 shrink-0" style={{ color }} />
                          <span className="truncate">{folder.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Attachment button */}
            <button
              onClick={e => { e.stopPropagation(); setAttachmentModalOpen(true); }}
              aria-label="Attachments"
              className="relative rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700"
            >
              <Paperclip className="h-3 w-3 text-slate-500" />
              {attachCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-indigo-500 text-[8px] text-white flex items-center justify-center leading-none">
                  {attachCount}
                </span>
              )}
            </button>

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
      </div>

      {/* Attachment modal */}
      <AnimatePresence>
        {attachmentModalOpen && (
          <AttachmentModal
            entityId={note.id}
            entityType="note"
            entityTitle={note.title || 'Untitled Note'}
            onClose={() => { setAttachmentModalOpen(false); setAttachCount(getAttachmentCount(note.id)); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
