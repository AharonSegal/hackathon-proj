/**
 * Events/EventsPage.tsx
 * ----------------------
 * Events management page at /events.
 *
 * Desktop: split panel — 280px list on the left, form panel fills the rest.
 * Mobile:  single-column with a back-button to switch between list and form.
 */

import { useState } from 'react';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { useEvents } from '@/shared/context/EventsContext';
import { useFolders } from '@/shared/context/FoldersContext';
import { EventsList } from './components/EventsList';
import { EventFormPanel } from './components/EventFormPanel';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Button } from '@/shared/components/ui/Button';
import { type CalendarEvent } from '@/shared/types/event.types';

export function EventsPage() {
  const {
    events, selectedEvent, setSelectedEvent,
    createEvent, updateEvent, deleteEvent,
    bulkDelete, bulkMoveToFolder, moveToFolder,
  } = useEvents();

  const { folders, createFolder, renameFolder, updateFolderColor, deleteFolder } = useFolders();

  const isMobile = useIsMobile();
  const [showForm, setShowForm] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  // null = create mode, CalendarEvent = edit mode, undefined = panel closed
  const [formMode, setFormMode] = useState<CalendarEvent | null | undefined>(undefined);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setFormMode(event);
    if (isMobile) setShowForm(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setFormMode(null);
    if (isMobile) setShowForm(true);
  };

  const handleCreateFolder = async () => {
    try {
      const folder = await createFolder();
      setSelectedFolderId(folder.id);
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent(id);
    if (selectedEvent?.id === id) {
      setSelectedEvent(null);
      setFormMode(undefined);
    }
    toast.success('Event deleted');
  };

  const handleDeleteFolder = (id: string) => {
    deleteFolder(id);
    if (selectedFolderId === id) setSelectedFolderId(null);
  };

  const handleSave = (data: Partial<CalendarEvent>) => {
    if (formMode === null) {
      // Create mode — need all required fields
      createEvent({
        title: data.title ?? 'Untitled Event',
        date: data.date ?? new Date().toISOString().slice(0, 10),
        allDay: data.allDay ?? true,
        color: data.color ?? 'indigo',
        tags: data.tags ?? [],
        folderId: data.folderId ?? null,
        recurrence: data.recurrence ?? 'none',
        recurrenceEnd: data.recurrenceEnd,
        startTime: data.startTime,
        endTime: data.endTime,
        description: data.description,
      });
      toast.success('Event created');
    } else if (formMode) {
      // Edit mode
      updateEvent(formMode.id, data);
      toast.success('Event updated');
    }
    setFormMode(undefined);
    if (isMobile) setShowForm(false);
  };

  const handleClose = () => {
    setFormMode(undefined);
    setSelectedEvent(null);
    if (isMobile) setShowForm(false);
  };

  // ── Mobile ─────────────────────────────────────────────────────────────────

  if (isMobile) {
    if (showForm && formMode !== undefined) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-slate-700 p-3 bg-slate-900">
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setFormMode(undefined); }} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Events
            </Button>
          </div>
          <EventFormPanel
            event={formMode}
            onSave={handleSave}
            onDelete={formMode ? () => handleDeleteEvent(formMode.id) : undefined}
            onClose={handleClose}
            folders={folders}
          />
        </div>
      );
    }

    return (
      <div className="h-full">
        <EventsList
          events={events}
          folders={folders}
          selectedEvent={selectedEvent}
          selectedFolderId={selectedFolderId}
          onSelectEvent={handleSelectEvent}
          onCreateEvent={handleCreateEvent}
          onDeleteEvent={handleDeleteEvent}
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

  // ── Desktop: split panel ───────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-[280px] shrink-0 border-r border-slate-700 bg-slate-900 flex flex-col">
        <EventsList
          events={events}
          folders={folders}
          selectedEvent={selectedEvent}
          selectedFolderId={selectedFolderId}
          onSelectEvent={handleSelectEvent}
          onCreateEvent={handleCreateEvent}
          onDeleteEvent={handleDeleteEvent}
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

      {/* Right panel */}
      <div className="flex-1 bg-slate-800 flex flex-col min-w-0">
        {formMode !== undefined ? (
          <EventFormPanel
            event={formMode}
            onSave={handleSave}
            onDelete={formMode ? () => handleDeleteEvent(formMode.id) : undefined}
            onClose={handleClose}
            folders={folders}
          />
        ) : (
          <div className="flex h-full items-center justify-center flex-col gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-2">
              <CalendarDays className="h-7 w-7 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-300">Select an event or create a new one</p>
            <button
              onClick={handleCreateEvent}
              className="mt-1 px-4 py-2 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              + New Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
