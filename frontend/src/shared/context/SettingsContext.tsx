/**
 * shared/context/SettingsContext.tsx
 * ------------------------------------
 * Global app settings — persisted to localStorage, shared via React Context.
 *
 * All settings are available to every component via useSettings().
 * Changes take effect immediately across the entire app without a page reload.
 *
 * Exports:
 * - SettingsProvider — wrap the app root with this
 * - useSettings()    — returns { settings, updateSettings, resetSettings }
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '@/shared/types/settings.types';

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const STORAGE_KEY = 'calendar_settings';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  };

  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
