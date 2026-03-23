/**
 * shared/components/Attachments/AttachmentModal.tsx
 * ---------------------------------------------------
 * Popup for viewing and adding attachments on a note or event.
 *
 * Features:
 * - Drag-and-drop zone (dashed border, highlights on hover)
 * - "Browse files" button
 * - List of existing attachments with icon, name, size, download + delete
 * - Error toast on oversized / storage-full attempts
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, Download, Trash2, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  type Attachment,
  getAttachments,
  addAttachment,
  deleteAttachment,
  downloadAttachment,
  formatBytes,
  fileIcon,
} from '@/shared/hooks/useAttachments';

interface AttachmentModalProps {
  entityId: string;
  entityType: 'note' | 'event';
  entityTitle: string;
  onClose: () => void;
}

export function AttachmentModal({ entityId, entityType, entityTitle, onClose }: AttachmentModalProps) {
  const [attachments, setAttachments]   = useState<Attachment[]>(() => getAttachments(entityId));
  const [isDragging,  setIsDragging]    = useState(false);
  const [isUploading, setIsUploading]   = useState(false);
  const [error,       setError]         = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reload list when entityId changes
  useEffect(() => {
    setAttachments(getAttachments(entityId));
  }, [entityId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const processFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const att = await addAttachment(file, entityId, entityType);
      setAttachments(prev => [...prev, att]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [entityId, entityType]);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    deleteAttachment(id);
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2
                   w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700
                   shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Paperclip className="h-4 w-4 text-indigo-400" />
            <div>
              <p className="text-sm font-semibold text-slate-100">Attachments</p>
              <p className="text-[10px] text-slate-500 truncate max-w-[220px]">{entityTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Shared hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onFileChange}
          />

          {/* Desktop: full drag-and-drop zone (hidden on mobile) */}
          <div
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'relative hidden sm:flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed',
              'py-8 px-4 cursor-pointer transition-all duration-200 select-none',
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                : 'border-slate-700 bg-slate-800/40 hover:border-indigo-600/60 hover:bg-slate-800/60',
            )}
          >
            <div className={clsx(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
              isDragging ? 'bg-indigo-500/20' : 'bg-slate-800',
            )}>
              <Upload className={clsx('h-5 w-5', isDragging ? 'text-indigo-400' : 'text-slate-500')} />
            </div>

            {isDragging ? (
              <p className="text-sm font-semibold text-indigo-400">Drop to attach</p>
            ) : isUploading ? (
              <p className="text-sm text-slate-400">Uploading…</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-300">
                  Drag &amp; drop a file here
                </p>
                <span className="text-xs text-slate-500">or</span>
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Browse files
                </button>
                <p className="text-[10px] text-slate-600">Any file type · Max 3 MB per file</p>
              </>
            )}
          </div>

          {/* Mobile: browse-only (no drag zone) */}
          <div className="sm:hidden flex flex-col items-center gap-3 py-4">
            {isUploading ? (
              <p className="text-sm text-slate-400">Uploading…</p>
            ) : (
              <>
                <button
                  type="button"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors flex items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Browse files
                </button>
                <p className="text-[10px] text-slate-500">Any file type · Max 3 MB per file</p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-rose-950/50 border border-rose-800/50 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Attachment list */}
          {attachments.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-1">
                {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
              </p>
              <AnimatePresence>
                {attachments.map(att => (
                  <motion.div
                    key={att.id}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{    opacity: 0, x: 20 }}
                    transition={{ duration: 0.12 }}
                    className="group flex items-center gap-3 rounded-lg border border-slate-800
                               bg-slate-800/50 px-3 py-2.5 hover:bg-slate-800 transition-colors"
                  >
                    {/* File type emoji */}
                    <span className="text-xl shrink-0 leading-none">{fileIcon(att.mimeType)}</span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{att.filename}</p>
                      <p className="text-[10px] text-slate-500">{formatBytes(att.sizeBytes)}</p>
                    </div>

                    {/* Preview thumbnail for images */}
                    {att.mimeType.startsWith('image/') && (
                      <img
                        src={att.data}
                        alt={att.filename}
                        className="h-8 w-8 rounded object-cover border border-slate-700 shrink-0"
                      />
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => downloadAttachment(att)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(att.id)}
                        className="p-1 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {attachments.length === 0 && !isDragging && (
            <p className="text-center text-xs text-slate-600 py-2">No attachments yet</p>
          )}
        </div>
      </motion.div>
    </>
  );
}
