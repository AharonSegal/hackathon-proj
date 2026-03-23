/**
 * Events/components/EventCard.tsx
 * ---------------------------------
 * Single event card shown in the EventsList sidebar.
 */

import { useState } from 'react';
import { X, Folder, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { type CalendarEvent, type EventColor, EVENT_COLOR_HEX } from '@/shared/types/event.types';
import { type Folder as FolderType, FOLDER_COLORS } from '@/shared/types/note.types';

interface EventCardProps {
  event: CalendarEvent;
  isSelected: boolean;
  isMultiSelected: boolean;
  isSelectionMode: boolean;
  folders: FolderType[];
  onSelect: () => void;
  onToggleMultiSelect: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onMoveToFolder: (folderId: string | null) => void;
}

function formatEventDate(dateStr: string, startTime?: string, endTime?: string, allDay?: boolean): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    const datePart = format(date, 'MMM d, yyyy');
    if (allDay) return datePart;
    if (startTime && endTime) return `${datePart} · ${startTime}–${endTime}`;
    if (startTime) return `${datePart} · ${startTime}`;
    return datePart;
  } catch {
    return dateStr;
  }
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export function EventCard({
  event, isSelected, isMultiSelected, isSelectionMode,
  folders, onSelect, onToggleMultiSelect, onDelete, onMoveToFolder,
}: EventCardProps) {
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);

  const currentFolder = event.folderId ? folders.find(f => f.id === event.folderId) : null;
  const currentFolderColor = currentFolder
    ? (FOLDER_COLORS[currentFolder.color as keyof typeof FOLDER_COLORS] ?? FOLDER_COLORS.slate)
    : null;

  const colorHex = EVENT_COLOR_HEX[event.color as EventColor] ?? EVENT_COLOR_HEX.indigo;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      onClick={onSelect}
      className={clsx(
        'group relative cursor-pointer rounded-lg border p-3 transition-all duration-150 flex gap-2.5',
        isMultiSelected
          ? 'border-indigo-500/50 bg-indigo-900/20 ring-2 ring-indigo-500/50 shadow-sm'
          : isSelected
          ? 'border-indigo-600 bg-indigo-900/20 shadow-sm'
          : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800',
      )}
    >
      {/* Checkbox */}
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

      {/* Color dot */}
      <div
        className="w-3 h-3 rounded-full shrink-0 mt-0.5"
        style={{ backgroundColor: colorHex }}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Delete button */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete event"
          className="absolute right-2 top-2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-900/40"
        >
          <X className="h-3.5 w-3.5 text-slate-500 hover:text-rose-400" />
        </button>

        {/* Title */}
        <h3 className={clsx(
          'mb-0.5 pr-6 text-sm font-semibold leading-tight line-clamp-1',
          isSelected ? 'text-indigo-400' : 'text-slate-100',
        )}>
          {event.title || 'Untitled Event'}
        </h3>

        {/* Date / time */}
        <p className="text-[11px] text-slate-400 mb-1.5">
          {formatEventDate(event.date, event.startTime, event.endTime, event.allDay)}
        </p>

        {/* Recurrence */}
        {event.recurrence && event.recurrence !== 'none' && (
          <div className="flex items-center gap-1 mb-1.5">
            <RefreshCw className="h-2.5 w-2.5 text-slate-500 shrink-0" />
            <span className="text-[10px] text-slate-500">{RECURRENCE_LABELS[event.recurrence]}</span>
          </div>
        )}

        {/* Folder indicator */}
        {currentFolder && (
          <div className="flex items-center gap-1 mb-1.5">
            <Folder className="h-2.5 w-2.5 shrink-0" style={{ color: currentFolderColor ?? undefined }} />
            <span className="text-[10px] text-slate-500 truncate">{currentFolder.name}</span>
          </div>
        )}

        {/* Bottom row: tags + folder move */}
        <div className="flex items-center justify-between gap-1">
          {/* Tag chips (max 2) */}
          <div className="flex flex-wrap gap-1 flex-1 min-w-0 overflow-hidden">
            {(event.tags ?? []).slice(0, 2).map(tag => (
              <span key={tag} className="inline-flex items-center px-1.5 py-0 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] shrink-0">
                {tag}
              </span>
            ))}
            {(event.tags ?? []).length > 2 && (
              <span className="inline-flex items-center px-1.5 py-0 h-4 rounded-full border border-slate-600 text-slate-400 text-[10px] shrink-0">
                +{event.tags.length - 2}
              </span>
            )}
          </div>

          {/* Move to folder button */}
          <div className="relative shrink-0">
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
                      event.folderId === null ? 'text-indigo-400' : 'text-slate-300 hover:text-slate-100',
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
                          event.folderId === folder.id ? 'text-indigo-400' : 'text-slate-300 hover:text-slate-100',
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
        </div>
      </div>
    </motion.div>
  );
}
