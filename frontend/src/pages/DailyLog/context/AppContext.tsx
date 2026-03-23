/**
 * pages/DailyLog/context/AppContext.tsx
 * ---------------------------------------
 * Global state container for the Daily Log feature.
 *
 * State managed: entries, schema, preferences, currentPage, isLoading.
 * All mutations are optimistic — the UI updates immediately, then the
 * matching REST API call fires in the background.
 *
 * Exports:
 * - AppProvider  — wrap the DailyLog subtree with this to provide context
 * - useApp()     — hook to read state and call mutations from any child
 *
 * Code Flow:
 * 1. AppProvider mounts → fires storage.loadAll() (3 parallel API calls)
 * 2. On success dispatches INIT → sets entries, schema, preferences, isLoading=false
 * 3. If no schema exists in DB, writes the default schema immediately
 * 4. Mutations (addEntries, updateEntry, deleteEntry, updateSchema,
 *    updatePreferences, clearData) dispatch local state changes first,
 *    then call the corresponding storageService function
 * 5. useApp() throws if called outside AppProvider (fail-fast)
 */

import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { Entry, Schema, Preferences, PageName } from '../utils/types';
import defaultSchema from '../utils/defaultSchema';
import * as storage from '../services/storageService';

interface AppState {
  entries: Entry[];
  schema: Schema;
  preferences: Preferences | null;
  currentPage: PageName;
  isLoading: boolean;
  loadError: string | null;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'INIT'; payload: { entries: Entry[]; schema: Schema; preferences: Preferences | null } }
  | { type: 'SET_PAGE'; payload: PageName }
  | { type: 'SET_ENTRIES'; payload: Entry[] }
  | { type: 'SET_SCHEMA'; payload: Schema }
  | { type: 'SET_PREFERENCES'; payload: Preferences }
  | { type: 'CLEAR_DATA' }
  | { type: 'SET_ERROR'; payload: string };

const initialState: AppState = {
  entries: [],
  schema: defaultSchema,
  preferences: null,
  currentPage: 'log',
  isLoading: true,
  loadError: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'INIT': return { ...state, ...action.payload, isLoading: false };
    case 'SET_PAGE': return { ...state, currentPage: action.payload };
    case 'SET_ENTRIES': return { ...state, entries: action.payload };
    case 'SET_SCHEMA': return { ...state, schema: action.payload };
    case 'SET_PREFERENCES': return { ...state, preferences: action.payload };
    case 'CLEAR_DATA': return { ...state, entries: [], preferences: null };
    case 'SET_ERROR': return { ...state, loadError: action.payload, isLoading: false };
    default: return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addEntries: (newEntries: Entry[]) => Promise<void>;
  updateEntry: (entry: Entry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  updateSchema: (schema: Schema) => Promise<void>;
  updatePreferences: (prefs: Preferences) => Promise<void>;
  clearData: () => Promise<void>;
  setPage: (page: PageName) => void;
  loadError: string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    async function init() {
      try {
        const { entries, schema, preferences } = await storage.loadAll();
        dispatch({
          type: 'INIT',
          payload: {
            entries,
            schema: schema ?? defaultSchema,
            preferences,
          },
        });
        if (!schema) await storage.setSchema(defaultSchema);
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load data. Check your connection.' });
      }
    }
    init();
  }, []);

  const addEntries = useCallback(async (newEntries: Entry[]) => {
    dispatch({ type: 'SET_ENTRIES', payload: [...state.entries, ...newEntries] });
    await Promise.all(newEntries.map((e) => storage.addEntry(e)));
  }, [state.entries]);

  const updateEntry = useCallback(async (entry: Entry) => {
    dispatch({ type: 'SET_ENTRIES', payload: state.entries.map((e) => (e.id === entry.id ? entry : e)) });
    await storage.putEntry(entry);
  }, [state.entries]);

  const deleteEntry = useCallback(async (id: string) => {
    dispatch({ type: 'SET_ENTRIES', payload: state.entries.filter((e) => e.id !== id) });
    await storage.removeEntry(id);
  }, [state.entries]);

  const updateSchema = useCallback(async (schema: Schema) => {
    dispatch({ type: 'SET_SCHEMA', payload: schema });
    await storage.setSchema(schema);
  }, []);

  const updatePreferences = useCallback(async (prefs: Preferences) => {
    dispatch({ type: 'SET_PREFERENCES', payload: prefs });
    await storage.setPreferences(prefs);
  }, []);

  const clearData = useCallback(async () => {
    dispatch({ type: 'CLEAR_DATA' });
    await storage.clearAllData();
  }, []);

  const setPage = useCallback((page: PageName) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, []);

  const value = useMemo(() => ({
    state, dispatch, addEntries, updateEntry, deleteEntry, updateSchema, updatePreferences, clearData, setPage,
    loadError: state.loadError,
  }), [state, dispatch, addEntries, updateEntry, deleteEntry, updateSchema, updatePreferences, clearData, setPage]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
