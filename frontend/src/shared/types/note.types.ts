export const FOLDER_COLORS = {
  slate:   '#64748b',
  blue:    '#3b82f6',
  indigo:  '#6366f1',
  purple:  '#a855f7',
  pink:    '#ec4899',
  rose:    '#f43f5e',
  orange:  '#f97316',
  amber:   '#f59e0b',
  green:   '#22c55e',
  emerald: '#10b981',
  teal:    '#14b8a6',
  cyan:    '#06b6d4',
} as const;

export type FolderColorKey = keyof typeof FOLDER_COLORS;

export interface Folder {
  id: string;
  name: string;
  color: FolderColorKey;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  tags: string[];
  folderId: string | null;
}
