/**
 * NotesEditor/NotesEditor.tsx
 * ----------------------------
 * Full editor panel for a single note.
 *
 * - Inline editable title (saves on blur or Enter)
 * - Tag chips with add (Enter/comma) and remove (×) controls
 * - Pin / Delete toolbar
 * - Auto-resizing textarea for content (saves 1 s after user stops typing)
 * - "Edited X ago" timestamp
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pin, Trash2, Tag, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { type Note } from '@/shared/types/note.types';
import { Button } from '@/shared/components/ui/Button';

interface NotesEditorProps {
  note: Note;
  onUpdate: (id: string, content: string) => void;
  onRename: (id: string, title: string) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotesEditor({ note, onUpdate, onRename, onUpdateTags, onTogglePin, onDelete }: NotesEditorProps) {
  const [titleValue,  setTitleValue]  = useState(note.title);
  const [content,     setContent]     = useState(note.content);
  const [tagInput,    setTagInput]    = useState('');
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync title when switching notes
  useEffect(() => {
    setTitleValue(note.title);
    setContent(note.content);
  }, [note.id]);

  // Auto-resize textarea on content change
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  // Debounced content save — 1 s after last keystroke
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onUpdate(note.id, val), 1000);
  };

  // Flush any pending save on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const handleTitleBlur = useCallback(() => {
    const trimmed = titleValue.trim() || 'Untitled Note';
    setTitleValue(trimmed);
    if (trimmed !== note.title) onRename(note.id, trimmed);
  }, [titleValue, note.id, note.title, onRename]);

  // Add tag on Enter or comma
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const tag = tagInput.trim().replace(/,$/, '');
    if (!tag || note.tags.includes(tag)) { setTagInput(''); return; }
    onUpdateTags(note.id, [...note.tags, tag]);
    setTagInput('');
  };

  const removeTag = (tag: string) => onUpdateTags(note.id, note.tags.filter(t => t !== tag));

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="border-b border-slate-700 px-6 py-4 flex flex-col gap-3">
        {/* Editable title */}
        <input
          value={titleValue}
          onChange={e => setTitleValue(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="Untitled Note"
          className="w-full bg-transparent text-xl font-semibold text-slate-100 outline-none border-none placeholder:text-slate-600 focus:ring-0 p-0 leading-tight"
        />

        {/* Tag chips + input */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag size={12} className="text-slate-500 shrink-0" />
          {note.tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-900/50 text-primary-300 text-xs">
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tag…"
            className="h-5 text-xs bg-transparent text-slate-400 placeholder:text-slate-600 outline-none border-none min-w-[70px]"
          />
        </div>

        {/* Toolbar row: timestamp + pin + delete */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Edited {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePin(note.id)}
              className="h-7 px-2 gap-1.5 text-xs"
            >
              <Pin className={clsx(
                'h-3.5 w-3.5',
                note.pinned ? 'fill-primary-400 text-primary-400' : 'text-slate-500',
              )} />
              {note.pinned ? 'Pinned' : 'Pin'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(note.id)}
              className="h-7 px-2 gap-1.5 text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-900/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content textarea ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <textarea
          ref={textareaRef}
          dir="auto"
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing…"
          className="w-full resize-none bg-transparent text-sm text-slate-200 leading-relaxed placeholder:text-slate-600 outline-none border-none focus:ring-0 min-h-[300px]"
          style={{ height: 'auto' }}
        />
      </div>
    </div>
  );
}
