/**
 * Notes/NotesPage.tsx
 * --------------------
 * Global notes page at /notes.
 *
 * Desktop: split panel — 280px list on the left, editor fills the rest.
 * Mobile:  single-column with a back-button to switch between list and editor.
 *
 * All state lives in NotesContext (localStorage-backed).
 * Delete shows an undo toast using sonner's action API.
 */

import { useState } from 'react';
import { ArrowLeft, NotebookPen } from 'lucide-react';
import { toast } from 'sonner';
import { useNotes } from '@/shared/context/NotesContext';
import { useFolders } from '@/shared/context/FoldersContext';
import { NotesList } from '@/shared/components/NotesEditor/NotesList';
import { NotesEditor } from '@/shared/components/NotesEditor/NotesEditor';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { useNoteKeyboardShortcut } from '@/shared/hooks/useNoteKeyboardShortcut';
import { Button } from '@/shared/components/ui/Button';
import { type Note } from '@/shared/types/note.types';

export function NotesPage() {
  const {
    notes, selectedNote, setSelectedNote,
    createNote, updateNote, deleteNote,
    togglePin, renameNote, updateTags, restoreNote, moveToFolder,
    bulkDelete, bulkMoveToFolder,
  } = useNotes();

  const { folders, createFolder, renameFolder, updateFolderColor, deleteFolder } = useFolders();

  const isMobile = useIsMobile();
  const [showEditor, setShowEditor] = useState(false);
  // null = All Notes view; string = specific folder id
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    if (isMobile) setShowEditor(true);
  };

  const handleCreateNote = () => {
    createNote(selectedFolderId);
    if (isMobile) setShowEditor(true);
    toast.success('New note created');
  };

  const handleCreateFolder = async () => {
    try {
      const folder = await createFolder();
      setSelectedFolderId(folder.id);
    } catch {
      toast.error('Failed to create folder');
    }
  };

  useNoteKeyboardShortcut(handleCreateNote);

  const handleDelete = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const snapshot = { ...note };
    deleteNote(id);
    toast('Note deleted', {
      action: {
        label: 'Undo',
        onClick: () => restoreNote(snapshot),
      },
    });
  };

  const handleDeleteFolder = (id: string) => {
    deleteFolder(id);
    // If we were viewing this folder, go back to All Notes
    if (selectedFolderId === id) setSelectedFolderId(null);
  };

  // ── Mobile: single column ────────────────────────────────────────────────────

  if (isMobile) {
    if (showEditor && selectedNote) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-slate-700 p-3 bg-slate-900">
            <Button variant="ghost" size="sm" onClick={() => setShowEditor(false)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Notes
            </Button>
          </div>
          <NotesEditor
            key={selectedNote.id}
            note={selectedNote}
            onUpdate={updateNote}
            onRename={renameNote}
            onUpdateTags={updateTags}
            onTogglePin={togglePin}
            onDelete={handleDelete}
          />
        </div>
      );
    }

    return (
      <div className="h-full">
        <NotesList
          notes={notes}
          folders={folders}
          selectedNote={selectedNote}
          selectedFolderId={selectedFolderId}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          onTogglePin={togglePin}
          onDeleteNote={handleDelete}
          onMoveToFolder={moveToFolder}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={renameFolder}
          onUpdateFolderColor={updateFolderColor}
          onDeleteFolder={handleDeleteFolder}
          onSelectFolder={setSelectedFolderId}
          onBulkDelete={bulkDelete}
          onBulkMoveToFolder={bulkMoveToFolder}
        />
      </div>
    );
  }

  // ── Desktop: split panel ────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* Left panel — 280px fixed */}
      <div className="w-[280px] shrink-0 border-r border-slate-700 bg-slate-900 flex flex-col">
        <NotesList
          notes={notes}
          folders={folders}
          selectedNote={selectedNote}
          selectedFolderId={selectedFolderId}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          onTogglePin={togglePin}
          onDeleteNote={handleDelete}
          onMoveToFolder={moveToFolder}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={renameFolder}
          onUpdateFolderColor={updateFolderColor}
          onDeleteFolder={handleDeleteFolder}
          onSelectFolder={setSelectedFolderId}
          onBulkDelete={bulkDelete}
          onBulkMoveToFolder={bulkMoveToFolder}
        />
      </div>

      {/* Right panel — flex-1 */}
      <div className="flex-1 bg-slate-800 flex flex-col min-w-0">
        {selectedNote ? (
          <NotesEditor
            key={selectedNote.id}
            note={selectedNote}
            onUpdate={updateNote}
            onRename={renameNote}
            onUpdateTags={updateTags}
            onTogglePin={togglePin}
            onDelete={handleDelete}
          />
        ) : (
          /* Empty state when no note is selected */
          <div className="flex h-full items-center justify-center flex-col gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-2">
              <NotebookPen className="h-7 w-7 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-300">Select a note or create a new one</p>
            <p className="text-xs text-slate-500">
              Press{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-slate-600 text-[10px] font-mono bg-slate-900">
                N
              </kbd>{' '}
              to create a new note
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
