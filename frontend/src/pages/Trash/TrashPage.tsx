/**
 * pages/Trash/TrashPage.tsx
 * --------------------------
 * Trash bin — shows soft-deleted notes and events grouped by category.
 * Items can be restored or permanently deleted. "Empty Trash" clears all.
 */

import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, NotebookPen, CalendarDays, BookOpen, X } from 'lucide-react';
import { toast } from 'sonner';
import { trashApi, type TrashNote, type TrashEvent, type TrashWorklogEntry } from '@/shared/hooks/useApi';
import { PageHeader } from '@/shared/components/Layout/PageHeader';

type TrashItem = (TrashNote | TrashEvent) & { _selected?: boolean };

export function TrashPage() {
  const [notes, setNotes]       = useState<TrashNote[]>([]);
  const [events, setEvents]     = useState<TrashEvent[]>([]);
  const [worklogs, setWorklogs] = useState<TrashWorklogEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trashApi.getAll();
      setNotes(data.notes);
      setEvents(data.events);
      setWorklogs(data.worklogs ?? []);
    } catch {
      toast.error('Failed to load trash');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (trashId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(trashId)) next.delete(trashId);
      else next.add(trashId);
      return next;
    });
  };

  const handleRestore = async (trashId: string) => {
    try {
      await trashApi.restore(trashId);
      setNotes(prev     => prev.filter(n => n.trashId !== trashId));
      setEvents(prev    => prev.filter(e => e.trashId !== trashId));
      setWorklogs(prev  => prev.filter(w => w.trashId !== trashId));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(trashId); return next; });
      toast.success('Restored');
    } catch {
      toast.error('Failed to restore');
    }
  };

  const handleDeletePermanently = async (trashId: string) => {
    try {
      await trashApi.deletePermanently(trashId);
      setNotes(prev     => prev.filter(n => n.trashId !== trashId));
      setEvents(prev    => prev.filter(e => e.trashId !== trashId));
      setWorklogs(prev  => prev.filter(w => w.trashId !== trashId));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(trashId); return next; });
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleBulkRestore = async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map(id => trashApi.restore(id).catch(() => null)));
    setNotes(prev     => prev.filter(n => !ids.includes(n.trashId)));
    setEvents(prev    => prev.filter(e => !ids.includes(e.trashId)));
    setWorklogs(prev  => prev.filter(w => !ids.includes(w.trashId)));
    setSelectedIds(new Set());
    toast.success(`Restored ${ids.length} item${ids.length > 1 ? 's' : ''}`);
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map(id => trashApi.deletePermanently(id).catch(() => null)));
    setNotes(prev     => prev.filter(n => !ids.includes(n.trashId)));
    setEvents(prev    => prev.filter(e => !ids.includes(e.trashId)));
    setWorklogs(prev  => prev.filter(w => !ids.includes(w.trashId)));
    setSelectedIds(new Set());
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Permanently delete everything in trash? This cannot be undone.')) return;
    try {
      await trashApi.emptyAll();
      setNotes([]);
      setEvents([]);
      setWorklogs([]);
      setSelectedIds(new Set());
      toast.success('Trash emptied');
    } catch {
      toast.error('Failed to empty trash');
    }
  };

  const totalCount = notes.length + events.length + worklogs.length;
  const hasItems   = totalCount > 0;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Trash"
        subtitle={hasItems ? `${totalCount} item${totalCount !== 1 ? 's' : ''}` : 'Empty'}
        actions={
          hasItems ? (
            <button
              onClick={handleEmptyTrash}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-rose-400 border border-rose-800/50 hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Empty Trash
            </button>
          ) : undefined
        }
      />

      {/* Bulk toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-6 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-xs text-slate-400">{selectedIds.size} selected</span>
          <button
            onClick={handleBulkRestore}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-800/40 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Restore
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-rose-400 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/40 transition-colors"
          >
            <Trash2 className="h-3 w-3" /> Delete Permanently
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-slate-500 hover:text-slate-300 px-2 py-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {loading && (
          <p className="text-sm text-slate-500 text-center py-12">Loading...</p>
        )}

        {!loading && !hasItems && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <Trash2 className="h-7 w-7 text-slate-600" />
            </div>
            <p className="text-slate-300 font-medium">Trash is empty</p>
            <p className="text-slate-500 text-sm mt-1">Deleted notes and events appear here</p>
          </div>
        )}

        {/* Notes section */}
        {notes.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <NotebookPen className="h-4 w-4 text-slate-500" />
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Notes ({notes.length})
              </h2>
            </div>
            <div className="space-y-2">
              {notes.map(note => (
                <TrashItemRow
                  key={note.trashId}
                  trashId={note.trashId}
                  title={note.title}
                  subtitle={`Deleted ${formatDate(note.deletedAt)}`}
                  isSelected={selectedIds.has(note.trashId)}
                  onToggleSelect={() => toggleSelect(note.trashId)}
                  onRestore={() => handleRestore(note.trashId)}
                  onDelete={() => handleDeletePermanently(note.trashId)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Events section */}
        {events.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Events ({events.length})
              </h2>
            </div>
            <div className="space-y-2">
              {events.map(event => (
                <TrashItemRow
                  key={event.trashId}
                  trashId={event.trashId}
                  title={event.title}
                  subtitle={`${event.date} · deleted ${formatDate(event.deletedAt)}`}
                  isSelected={selectedIds.has(event.trashId)}
                  onToggleSelect={() => toggleSelect(event.trashId)}
                  onRestore={() => handleRestore(event.trashId)}
                  onDelete={() => handleDeletePermanently(event.trashId)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Work Logs section */}
        {worklogs.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-slate-500" />
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Work Logs ({worklogs.length})
              </h2>
            </div>
            <div className="space-y-2">
              {worklogs.map(entry => (
                <TrashItemRow
                  key={entry.trashId}
                  trashId={entry.trashId}
                  title={entry.title}
                  subtitle={`${entry.date} · ${entry.project} · deleted ${formatDate(entry.deletedAt)}`}
                  isSelected={selectedIds.has(entry.trashId)}
                  onToggleSelect={() => toggleSelect(entry.trashId)}
                  onRestore={() => handleRestore(entry.trashId)}
                  onDelete={() => handleDeletePermanently(entry.trashId)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

interface TrashItemRowProps {
  trashId: string;
  title: string;
  subtitle: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

function TrashItemRow({
  trashId, title, subtitle, isSelected, onToggleSelect, onRestore, onDelete,
}: TrashItemRowProps) {
  return (
    <div
      className={[
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        isSelected
          ? 'bg-slate-700/60 border-indigo-700/50'
          : 'bg-slate-800 border-slate-700 hover:border-slate-600',
      ].join(' ')}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="w-4 h-4 rounded accent-indigo-500 cursor-pointer shrink-0"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-100 truncate">{title || 'Untitled'}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onRestore}
          title="Restore"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-indigo-400 hover:bg-indigo-950/40 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </button>
        <button
          onClick={onDelete}
          title="Delete permanently"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
