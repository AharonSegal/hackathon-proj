/**
 * shared/types/note.types.ts
 * ---------------------------
 * TypeScript interface for a note stored in localStorage.
 * Dates are stored as ISO strings (localStorage cannot store Date objects).
 */

export interface Note {
  id: string;
  title: string;
  content: string;       // plain text body
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
  pinned: boolean;
  tags: string[];
}
