/**
 * Events/components/EventsList.tsx
 * ----------------------------------
 * Sidebar list of events with folder tree, search, and multi-select bulk actions.
 */

import { useState, useRef, useEffect } from 'react';
import { Plus, Search, CalendarDays, Folder, MoreHorizontal, Pencil, Trash2, FolderInput } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { type CalendarEvent } from '@/shared/types/event.types';
import { type Folder as FolderType, FOLDER_COLORS } from '@/shared/types/note.types';
import { EventCard } from './EventCard';
import { Button } from '@/shared/components/ui/Button';
import { GradientButton } from '@/shared/components/ui/GradientButton';

interface EventsListProps {
  events: CalendarEvent[];
  folders: FolderType[];
  selectedEvent: CalendarEvent | null;
  selectedFolderId: string | null | undefined;
  onSelectEvent: (event: CalendarEvent) => void;
  onCreateEvent: () => void;
  onDeleteEvent: (id: string) => void;
  onMoveToFolder: (eventId: string, folderId: string | null) => void;
  onCreateFolder: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onUpdateFolderColor: (id: string, color: string) => void;
  onDeleteFolder: (id: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkMoveToFolder: (ids: string[], folderId: string | null) => void;
}

const byDate = (a: CalendarEvent, b: CalendarEvent) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

export function EventsList({
  events, folders, selectedEvent, selectedFolderId,
  onSelectEvent, onCreateEvent, onDeleteEvent,
  onMoveToFolder, onCreateFolder, onRenameFolder, onUpdateFolderColor,
  onDeleteFolder, onSelectFolder, onBulkDelete, onBulkMoveToFolder,
}: EventsListProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number>(-1);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);

  const isSelectionMode = selectedIds.size > 0;

  const filtered = events.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.title.toLowerCase().includes(q) || (e.tags ?? []).some(t => t.toLowerCase().includes(q));
  });

  const visibleEvents = (selectedFolderId === null || selectedFolderId === undefined)
    ? filtered
    : filtered.filter(e => e.folderId === selectedFolderId);

  const sortedEvents = [...visibleEvents].sort(byDate);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedIds(new Set()); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleToggleMultiSelect = (event: CalendarEvent, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (e.shiftKey && lastSelectedIdx >= 0) {
        const start = Math.min(lastSelectedIdx, idx);
        const end   = Math.max(lastSelectedIdx, idx);
        sortedEvents.slice(start, end + 1).forEach(ev => next.add(ev.id));
      } else {
        if (next.has(event.id)) next.delete(event.id);
        else next.add(event.id);
      }
      return next;
    });
    setLastSelectedIdx(idx);
  };

  const selectAll = () => {
    if (selectedIds.size === sortedEvents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedEvents.map(e => e.id)));
    }
  };

  const folderEventCount = (folderId: string) => events.filter(e => e.folderId === folderId).length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-700">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Events</h2>
        <div className="flex items-center gap-1">
          <GradientButton size="sm" icon={Folder} text="Folder" onClick={onCreateFolder} />
          <GradientButton size="sm" icon={Plus}   text="New"    onClick={onCreateEvent} />
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Folder tree */}
      {!search && (
        <div className="border-b border-slate-700 py-1">
          <div
            onClick={() => onSelectFolder(null)}
            className={[
              'flex items-center gap-2 px-4 py-1.5 cursor-pointer text-xs transition-colors rounded-sm mx-1',
              (selectedFolderId === null || selectedFolderId === undefined)
                ? 'bg-slate-700/60 text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ].join(' ')}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 font-medium">All Events</span>
            <span className="text-slate-600 text-[10px]">{events.length}</span>
          </div>

          {folders.map(folder => (
            <EventFolderRow
              key={folder.id}
              folder={folder}
              isSelected={selectedFolderId === folder.id}
              eventCount={folderEventCount(folder.id)}
              onSelect={() => onSelectFolder(folder.id)}
              onRename={name => onRenameFolder(folder.id, name)}
              onColorChange={color => onUpdateFolderColor(folder.id, color)}
              onDelete={() => onDeleteFolder(folder.id)}
            />
          ))}
        </div>
      )}

      {/* Event cards */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        {sortedEvents.length === 0 ? (
          <EmptyState search={search} onCreateEvent={onCreateEvent} />
        ) : (
          <AnimatePresence>
            {sortedEvents.map((event, idx) => (
              <EventCard
                key={event.id}
                event={event}
                isSelected={selectedEvent?.id === event.id}
                isMultiSelected={selectedIds.has(event.id)}
                isSelectionMode={isSelectionMode}
                folders={folders}
                onSelect={() => onSelectEvent(event)}
                onToggleMultiSelect={e => handleToggleMultiSelect(event, idx, e)}
                onDelete={() => onDeleteEvent(event.id)}
                onMoveToFolder={folderId => onMoveToFolder(event.id, folderId)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Bulk action toolbar */}
      {isSelectionMode && (
        <div className="border-t border-slate-700 bg-slate-900 px-3 py-2 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-medium">
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={selectAll} className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800">
                {selectedIds.size === sortedEvents.length ? 'Deselect All' : `Select All (${sortedEvents.length})`}
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-slate-500 hover:text-slate-300 px-1 py-1 rounded hover:bg-slate-800">
                ✕ Clear
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onBulkDelete([...selectedIds]); setSelectedIds(new Set()); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-rose-950/50 border border-rose-800/50 text-xs text-rose-400 hover:bg-rose-900/50"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
            <div className="relative flex-1">
              <button
                onClick={() => setMoveMenuOpen(o => !o)}
                className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700"
              >
                <FolderInput className="h-3 w-3" /> Move to Folder ▾
              </button>
              {moveMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMoveMenuOpen(false)} />
                  <div className="absolute bottom-8 left-0 z-50 min-w-[160px] rounded-lg border border-slate-700 bg-slate-800 shadow-xl py-1">
                    <button
                      onClick={() => { onBulkMoveToFolder([...selectedIds], null); setSelectedIds(new Set()); setMoveMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                    >
                      <Folder className="h-3 w-3" /> No Folder
                    </button>
                    {folders.map(folder => (
                      <button
                        key={folder.id}
                        onClick={() => { onBulkMoveToFolder([...selectedIds], folder.id); setSelectedIds(new Set()); setMoveMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        <Folder className="h-3 w-3" style={{ color: FOLDER_COLORS[folder.color as keyof typeof FOLDER_COLORS] ?? FOLDER_COLORS.slate }} />
                        {folder.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── EventFolderRow ─────────────────────────────────────────────────────────────

interface EventFolderRowProps {
  folder: FolderType;
  isSelected: boolean;
  eventCount: number;
  onSelect: () => void;
  onRename: (name: string) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

function EventFolderRow({
  folder, isSelected, eventCount,
  onSelect, onRename, onColorChange, onDelete,
}: EventFolderRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const color = FOLDER_COLORS[folder.color as keyof typeof FOLDER_COLORS] ?? FOLDER_COLORS.slate;

  const commitRename = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== folder.name) onRename(trimmed);
    else setNameValue(folder.name);
    setRenaming(false);
  };

  const startRename = () => {
    setNameValue(folder.name);
    setMenuOpen(false);
    setRenaming(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  return (
    <div className="relative">
      <div
        onClick={onSelect}
        className={[
          'group flex items-center gap-2 px-4 py-1.5 cursor-pointer text-xs transition-colors rounded-sm mx-1',
          isSelected ? 'bg-slate-700/60 text-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
        ].join(' ')}
      >
        <Folder className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        {renaming ? (
          <input
            ref={inputRef}
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setNameValue(folder.name); setRenaming(false); }
            }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-slate-700 rounded px-1 text-xs text-slate-100 outline-none border border-indigo-500"
            autoFocus
          />
        ) : (
          <span className="flex-1 truncate font-medium">{folder.name}</span>
        )}
        <span className="text-slate-600 text-[10px] shrink-0">{eventCount}</span>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
          className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-slate-600 transition-opacity"
        >
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-7 z-50 min-w-[140px] rounded-lg border border-slate-700 bg-slate-800 shadow-xl py-1">
            <button onClick={startRename} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-slate-100">
              <Pencil className="h-3 w-3" /> Rename
            </button>
            <button
              onClick={e => { e.stopPropagation(); setColorPickerOpen(o => !o); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              Change Color
            </button>
            <div className="border-t border-slate-700 mt-1 pt-1">
              <button onClick={() => { onDelete(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        </>
      )}

      {colorPickerOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setColorPickerOpen(false)} />
          <div className="absolute right-2 top-7 z-50 rounded-lg border border-slate-700 bg-slate-800 shadow-xl p-2">
            <p className="text-[10px] text-slate-500 mb-2 px-1">Folder Color</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(FOLDER_COLORS) as [string, string][]).map(([key, hex]) => (
                <button
                  key={key}
                  onClick={() => { onColorChange(key); setColorPickerOpen(false); }}
                  className={`w-5 h-5 rounded-full transition-all hover:scale-110 ${folder.color === key ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-800' : ''}`}
                  style={{ backgroundColor: hex }}
                  title={key}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ search, onCreateEvent }: { search: string; onCreateEvent: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
        <CalendarDays className="h-5 w-5 text-slate-500" />
      </div>
      {search ? (
        <>
          <p className="text-sm font-medium text-slate-300">No results</p>
          <p className="text-xs text-slate-500">No events match "{search}"</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-300">No events yet</p>
          <p className="text-xs text-slate-500">Create your first event to get started</p>
          <GradientButton size="sm" icon={Plus} text="New Event" onClick={onCreateEvent} className="mt-1" />
        </>
      )}
    </div>
  );
}
