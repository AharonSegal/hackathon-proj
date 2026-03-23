import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

interface Props {
  selected: string[];
  onChange: (langs: string[]) => void;
}

export default function LanguagePicker({ selected, onChange }: Props) {
  const { state } = useApp();
  const [search, setSearch] = useState('');

  const languages = useMemo(() =>
    state.schema.technologies
      .filter((t) => t.group === 'languages')
      .map((t) => t.name)
      .sort(),
    [state.schema.technologies],
  );

  const filtered = useMemo(() =>
    languages.filter((l) => l.toLowerCase().includes(search.toLowerCase())),
    [languages, search],
  );

  const toggle = (lang: string) => {
    onChange(selected.includes(lang) ? selected.filter((l) => l !== lang) : [...selected, lang]);
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((l) => (
            <span key={l} className="flex items-center gap-1 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/30">
              {l}
              <button type="button" onClick={() => toggle(l)} className="hover:text-white transition-colors">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search languages…"
        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
      />
      <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900">
        {filtered.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-500">No languages found</p>
        ) : (
          filtered.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => toggle(lang)}
              className={clsx(
                'block w-full px-3 py-2 text-left text-sm transition-colors',
                selected.includes(lang)
                  ? 'text-primary-400 font-medium bg-primary-500/10'
                  : 'text-slate-300 hover:bg-slate-800',
              )}
            >
              {selected.includes(lang) ? '✓ ' : ''}{lang}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
