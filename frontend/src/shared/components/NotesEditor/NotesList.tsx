/**
 * NotesList.tsx — Sidebar list with folders + notes
 */
import { useState, useRef } from 'react';
import { Plus, Search, NotebookPen, Folder, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { type Note, type Folder as FolderType, FOLDER_COLORS } from '@/shared/types/note.types';
import { NoteCard } from './NoteCard';
import { Button } from '@/shared/components/ui/Button';

interface NotesListProps {
  notes: Note[];
  folders: FolderType[];
  selectedNote: Note | null;
  selectedFolderId: string | null | undefined;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  onTogglePin: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onMoveToFolder: (noteId: string, folderId: string | null) => void;
  onCreateFolder: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onUpdateFolderColor: (id: string, color: string) => void;
  onDeleteFolder: (id: string) => void;
  onSelectFolder: (folderId: string | null) => void;
}

const byUpdated = (a: Note, b: Note) =>
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

export function NotesList({
  notes, folders, selectedNote, selectedFolderId,
  onSelectNote, onCreateNote, onTogglePin, onDeleteNote,
  onMoveToFolder, onCreateFolder, onRenameFolder, onUpdateFolderColor,
  onDeleteFolder, onSelectFolder,
}: NotesListProps) {
  const [search, setSearch] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const filtered = notes.filter(n => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q));
  });

  // For "All Notes" view (selectedFolderId === null or undefined), show all.
  // For folder view, show only that folder's notes.
  const visibleNotes = (selectedFolderId === null || selectedFolderId === undefined)
    ? filtered
    : filtered.filter(n => n.folderId === selectedFolderId);

  const pinned   = visibleNotes.filter(n =>  n.pinned).sort(byUpdated);
  const unpinned = visibleNotes.filter(n => !n.pinned).sort(byUpdated);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolder(folderId === null ? '__all__' : folderId);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData('noteId');
    if (noteId) onMoveToFolder(noteId, folderId);
    setDragOverFolder(null);
  };

  const handleDragLeave = () => setDragOverFolder(null);

  // ── Folder count ───────────────────────────────────────────────────────────
  const folderNoteCount = (folderId: string) => notes.filter(n => n.folderId === folderId).length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-700">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</h2>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onCreateFolder} className="h-7 gap-1 text-xs text-slate-400 hover:text-slate-200">
            <Folder className="h-3.5 w-3.5" />
            Folder
          </Button>
          <Button size="sm" onClick={onCreateNote} className="h-7 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
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

      {/* Folder tree — hidden during search */}
      {!search && (
        <div className="border-b border-slate-700 py-1">
          {/* All Notes */}
          <div
            onClick={() => onSelectFolder(null)}
            onDragOver={e => handleDragOver(e, null)}
            onDrop={e => handleDrop(e, null)}
            onDragLeave={handleDragLeave}
            className={[
              'flex items-center gap-2 px-4 py-1.5 cursor-pointer text-xs transition-colors rounded-sm mx-1',
              (selectedFolderId === null || selectedFolderId === undefined)
                ? 'bg-slate-700/60 text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
              dragOverFolder === '__all__' ? 'bg-primary-900/30 border border-dashed border-primary-500' : '',
            ].join(' ')}
          >
            <NotebookPen className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 font-medium">All Notes</span>
            <span className="text-slate-600 text-[10px]">{notes.length}</span>
          </div>

          {/* Folders */}
          {folders.map(folder => (
            <FolderRow
              key={folder.id}
              folder={folder}
              isSelected={selectedFolderId === folder.id}
              isDragOver={dragOverFolder === folder.id}
              noteCount={folderNoteCount(folder.id)}
              onSelect={() => onSelectFolder(folder.id)}
              onDragOver={e => handleDragOver(e, folder.id)}
              onDrop={e => handleDrop(e, folder.id)}
              onDragLeave={handleDragLeave}
              onRename={name => onRenameFolder(folder.id, name)}
              onColorChange={color => onUpdateFolderColor(folder.id, color)}
              onDelete={() => onDeleteFolder(folder.id)}
            />
          ))}
        </div>
      )}

      {/* Note cards */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        {visibleNotes.length === 0 ? (
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
                    onMoveToFolder={folderId => onMoveToFolder(note.id, folderId)}
                    folders={folders}
                  />
                ))}
              </>
            )}
            {unpinned.length > 0 && (
              <>
                {pinned.length > 0 && <SectionHeader label="Notes" />}
                {unpinned.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelected={selectedNote?.id === note.id}
                    onSelect={() => onSelectNote(note)}
                    onTogglePin={() => onTogglePin(note.id)}
                    onDelete={() => onDeleteNote(note.id)}
                    onMoveToFolder={folderId => onMoveToFolder(note.id, folderId)}
                    folders={folders}
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

// ── FolderRow ──────────────────────────────────────────────────────────────────

interface FolderRowProps {
  folder: FolderType;
  isSelected: boolean;
  isDragOver: boolean;
  noteCount: number;
  onSelect: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onRename: (name: string) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

function FolderRow({
  folder, isSelected, isDragOver, noteCount,
  onSelect, onDragOver, onDrop, onDragLeave,
  onRename, onColorChange, onDelete,
}: FolderRowProps) {
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
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragLeave={onDragLeave}
        className={[
          'group flex items-center gap-2 px-4 py-1.5 cursor-pointer text-xs transition-colors rounded-sm mx-1',
          isSelected ? 'bg-slate-700/60 text-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
          isDragOver ? 'bg-primary-900/30 border border-dashed border-primary-500' : '',
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
            className="flex-1 bg-slate-700 rounded px-1 text-xs text-slate-100 outline-none border border-primary-500"
            autoFocus
          />
        ) : (
          <span className="flex-1 truncate font-medium">{folder.name}</span>
        )}
        <span className="text-slate-600 text-[10px] shrink-0">{noteCount}</span>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
          className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-slate-600 transition-opacity"
        >
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </div>

      {/* Dropdown menu */}
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

      {/* Color picker */}
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
