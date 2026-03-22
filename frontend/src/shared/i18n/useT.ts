/**
 * shared/i18n/useT.ts
 * --------------------
 * Hook that returns the translation object for the current language setting.
 *
 * Usage:
 *   const t = useT();
 *   <h1>{t.dashboard_title}</h1>
 *
 * The language is read from settings.language ('en' | 'he').
 * Also returns isRTL = true when the language is Hebrew.
 */

import { useSettings } from '@/shared/context/SettingsContext';
import { translations, Translations } from './translations';

export function useT(): Translations & { isRTL: boolean } {
  const { settings } = useSettings();
  const lang = settings.language ?? 'he';
  return { ...translations[lang], isRTL: lang === 'he' };
}
