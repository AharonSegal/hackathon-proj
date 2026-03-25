/**
 * shared/hooks/useAttachments.ts
 * --------------------------------
 * Manages file attachments stored as base64 in localStorage.
 * Each attachment is linked to a note or event by entityId + entityType.
 *
 * Storage key: cache_v1_attachments
 * Max total size guard: 4 MB (localStorage is ~5-10 MB total)
 */

export interface Attachment {
  id: string;
  entityId: string;
  entityType: 'note' | 'event';
  filename: string;
  mimeType: string;
  sizeBytes: number;
  data: string;      // base64 data URL (e.g. "data:image/png;base64,...")
  createdAt: string;
}

const STORAGE_KEY = 'cache_v1_attachments';
const MAX_BYTES   = 4 * 1024 * 1024; // 4 MB safety ceiling

function loadAll(): Attachment[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}

function saveAll(list: Attachment[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
  catch { /* storage full */ }
}

/** Return total bytes currently used by all attachments */
function usedBytes(list: Attachment[]): number {
  return list.reduce((acc, a) => acc + a.sizeBytes, 0);
}

/** Human-readable file size */
export function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Detect a displayable icon label from MIME type */
export function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/'))       return '🖼';
  if (mimeType.startsWith('video/'))       return '🎬';
  if (mimeType.startsWith('audio/'))       return '🎵';
  if (mimeType === 'application/pdf')      return '📄';
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '🗜';
  return '📎';
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAttachments(entityId: string): Attachment[] {
  return loadAll().filter(a => a.entityId === entityId);
}

export function getAttachmentCount(entityId: string): number {
  return loadAll().filter(a => a.entityId === entityId).length;
}

/**
 * Add a file as an attachment. Returns the new Attachment or throws if:
 * - File > 3 MB individually
 * - Total storage would exceed MAX_BYTES
 */
export async function addAttachment(
  file: File,
  entityId: string,
  entityType: 'note' | 'event',
): Promise<Attachment> {
  if (file.size > 3 * 1024 * 1024) {
    throw new Error(`File is too large (${formatBytes(file.size)}). Maximum per file: 3 MB.`);
  }

  const all = loadAll();
  if (usedBytes(all) + file.size > MAX_BYTES) {
    throw new Error('Attachment storage is full (4 MB limit). Delete some attachments first.');
  }

  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  const attachment: Attachment = {
    id:         crypto.randomUUID(),
    entityId,
    entityType,
    filename:   file.name,
    mimeType:   file.type || 'application/octet-stream',
    sizeBytes:  file.size,
    data,
    createdAt:  new Date().toISOString(),
  };

  saveAll([...all, attachment]);
  return attachment;
}

export function deleteAttachment(id: string): void {
  saveAll(loadAll().filter(a => a.id !== id));
}

/** Download an attachment by triggering a hidden <a> click */
export function downloadAttachment(attachment: Attachment): void {
  const link = document.createElement('a');
  link.href     = attachment.data;
  link.download = attachment.filename;
  link.click();
}
