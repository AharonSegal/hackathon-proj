import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { type Folder } from '@/shared/types/note.types';
import { foldersApi } from '@/shared/hooks/useApi';

const CACHE_KEY = 'cache_v1_folders';

function loadCache(): Folder[] {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); }
  catch { return []; }
}

function saveCache(folders: Folder[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(folders)); }
  catch { /* storage full */ }
}

interface FoldersContextValue {
  folders: Folder[];
  createFolder: () => Promise<Folder>;
  renameFolder: (id: string, name: string) => void;
  updateFolderColor: (id: string, color: string) => void;
  deleteFolder: (id: string) => void;
}

const FoldersContext = createContext<FoldersContextValue | null>(null);

export function FoldersProvider({ children }: { children: ReactNode }) {
  const [folders, setFoldersState] = useState<Folder[]>(loadCache);
  const foldersRef = useRef<Folder[]>(folders);

  const commit = (next: Folder[]) => {
    foldersRef.current = next;
    setFoldersState(next);
    saveCache(next);
  };

  useEffect(() => {
    foldersApi.getAll().then(data => commit(data)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createFolder = async (): Promise<Folder> => {
    const tempId = crypto.randomUUID();
    const temp: Folder = {
      id: tempId,
      name: 'New Folder',
      color: 'slate',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    commit([...foldersRef.current, temp]);
    const saved = await foldersApi.create({ id: tempId, name: 'New Folder', color: 'slate' });
    commit(foldersRef.current.map(f => f.id === tempId ? saved : f));
    return saved;
  };

  const renameFolder = (id: string, name: string) => {
    const snapshot = foldersRef.current;
    commit(snapshot.map(f => f.id === id ? { ...f, name, updatedAt: new Date().toISOString() } : f));
    foldersApi.update(id, { name }).catch(() => { commit(snapshot); toast.error('Failed to rename folder'); });
  };

  const updateFolderColor = (id: string, color: string) => {
    const snapshot = foldersRef.current;
    commit(snapshot.map(f => f.id === id ? { ...f, color: color as Folder['color'], updatedAt: new Date().toISOString() } : f));
    foldersApi.update(id, { color }).catch(() => { commit(snapshot); toast.error('Failed to update folder color'); });
  };

  const deleteFolder = (id: string) => {
    const snapshot = foldersRef.current;
    commit(snapshot.filter(f => f.id !== id));
    foldersApi.delete(id).catch(() => { commit(snapshot); toast.error('Failed to delete folder'); });
  };

  return (
    <FoldersContext.Provider value={{ folders, createFolder, renameFolder, updateFolderColor, deleteFolder }}>
      {children}
    </FoldersContext.Provider>
  );
}

export function useFolders() {
  const ctx = useContext(FoldersContext);
  if (!ctx) throw new Error('useFolders must be used within FoldersProvider');
  return ctx;
}
