import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, X, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useApp } from '../../../context/AppContext';
import type { TechSelection } from '../../../utils/types';
import { GROUP_LABELS, GROUP_ORDER } from '../../../utils/defaultSchema';
import { capitalize, findSimilar } from '../../../utils/helpers';

interface Props {
  selected: TechSelection[];
  onChange: (techs: TechSelection[]) => void;
}

export default function TechSelector({ selected, onChange }: Props) {
  const { state, updateSchema } = useApp();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(
    () => Object.fromEntries(GROUP_ORDER.map((g) => [g, true])),
  );
  const [addingSub, setAddingSub] = useState<string | null>(null);
  const [newSub, setNewSub] = useState('');
  const [dupSubAlert, setDupSubAlert] = useState('');
  const [addingTech, setAddingTech] = useState<string | null>(null);
  const [newTech, setNewTech] = useState('');
  const [dupTechAlert, setDupTechAlert] = useState('');
  const [similarMatch, setSimilarMatch] = useState<{ input: string; match: string; techName: string } | null>(null);
  const [similarTech, setSimilarTech] = useState<{ input: string; match: string; group: string } | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, typeof state.schema.technologies> = {};
    state.schema.technologies.forEach((t) => {
      if (!g[t.group]) g[t.group] = [];
      if (!search || t.name.toLowerCase().includes(search.toLowerCase())) g[t.group].push(t);
    });
    return g;
  }, [state.schema.technologies, search]);

  const effectiveCollapsed = useMemo(() => {
    if (!search) return collapsed;
    return Object.fromEntries(GROUP_ORDER.map((g) => [g, !(grouped[g]?.length > 0)]));
  }, [search, grouped, collapsed]);

  const isSelected = (name: string) => selected.some((s) => s.tech === name);

  const toggleTech = (name: string) => {
    if (isSelected(name)) onChange(selected.filter((s) => s.tech !== name));
    else onChange([...selected, { tech: name, subTechs: [] }]);
  };

  const toggleSub = (techName: string, sub: string) => {
    onChange(selected.map((s) => {
      if (s.tech !== techName) return s;
      const has = s.subTechs.includes(sub);
      return { ...s, subTechs: has ? s.subTechs.filter((x) => x !== sub) : [...s.subTechs, sub] };
    }));
  };

  const doAddSub = async (techName: string, name: string) => {
    const updatedTechs = state.schema.technologies.map((t) =>
      t.name === techName && !t.subTechs.includes(name) ? { ...t, subTechs: [...t.subTechs, name] } : t,
    );
    await updateSchema({ ...state.schema, technologies: updatedTechs });
    toggleSub(techName, name);
    setNewSub(''); setAddingSub(null);
  };

  const handleAddSub = async (techName: string) => {
    const formatted = capitalize(newSub.trim());
    if (!formatted) return;
    const schemaTech = state.schema.technologies.find((t) => t.name === techName);
    if (!schemaTech) return;
    const existing = schemaTech.subTechs.find((s) => s.toLowerCase() === formatted.toLowerCase());
    if (existing) { setDupSubAlert(`"${existing}" already exists`); return; }
    setDupSubAlert('');
    const similar = findSimilar(formatted, schemaTech.subTechs);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarMatch({ input: formatted, match: similar, techName }); return;
    }
    doAddSub(techName, formatted);
  };

  const doAddTech = async (group: string, name: string) => {
    if (state.schema.technologies.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    await updateSchema({ ...state.schema, technologies: [...state.schema.technologies, { name, group, subTechs: [] }] });
    onChange([...selected, { tech: name, subTechs: [] }]);
    setNewTech(''); setAddingTech(null);
  };

  const handleAddTech = async (group: string) => {
    const formatted = capitalize(newTech.trim());
    if (!formatted) return;
    const existing = state.schema.technologies.find((t) => t.name.toLowerCase() === formatted.toLowerCase());
    if (existing) { setDupTechAlert(`"${existing.name}" already exists`); return; }
    setDupTechAlert('');
    const names = state.schema.technologies.filter((t) => t.group === group).map((t) => t.name);
    const similar = findSimilar(formatted, names);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarTech({ input: formatted, match: similar, group }); return;
    }
    doAddTech(group, formatted);
  };

  return (
    <div className="space-y-3">
      {/* Modals */}
      <Modal open={!!similarMatch} onClose={() => setSimilarMatch(null)} title="Similar sub-tech found" size="sm">
        <p className="text-sm text-slate-300">
          Adding <span className="font-semibold text-primary-400">"{similarMatch?.input}"</span> but{' '}
          <span className="font-semibold text-primary-400">"{similarMatch?.match}"</span> already exists.
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => { if (similarMatch) toggleSub(similarMatch.techName, similarMatch.match); setSimilarMatch(null); setNewSub(''); setAddingSub(null); }}>Use existing</Button>
          <Button size="sm" onClick={() => { if (similarMatch) doAddSub(similarMatch.techName, similarMatch.input); setSimilarMatch(null); }}>Create anyway</Button>
        </div>
      </Modal>
      <Modal open={!!similarTech} onClose={() => setSimilarTech(null)} title="Similar technology found" size="sm">
        <p className="text-sm text-slate-300">
          Adding <span className="font-semibold text-primary-400">"{similarTech?.input}"</span> but{' '}
          <span className="font-semibold text-primary-400">"{similarTech?.match}"</span> already exists.
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => { if (similarTech && !isSelected(similarTech.match)) toggleTech(similarTech.match); setSimilarTech(null); setNewTech(''); setAddingTech(null); }}>Use existing</Button>
          <Button size="sm" onClick={() => { if (similarTech) doAddTech(similarTech.group, similarTech.input); setSimilarTech(null); }}>Create anyway</Button>
        </div>
      </Modal>

      {/* Search + selected chips */}
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search technologies…"
          className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        />
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange([])} type="button">Clear</Button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span key={s.tech} className="flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
              {s.tech}
              <button type="button" onClick={() => toggleTech(s.tech)} className="hover:text-white transition-colors"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Groups */}
      {GROUP_ORDER.map((group) => {
        const techs = grouped[group];
        const isCollapsed = effectiveCollapsed[group];
        const selectedCount = techs?.filter((t) => isSelected(t.name)).length ?? 0;

        return (
          <div key={group} className="rounded-lg border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => { if (!search) setCollapsed((p) => ({ ...p, [group]: !p[group] })); }}
              className="flex w-full items-center justify-between bg-slate-700/50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                {GROUP_LABELS[group] ?? group}
                {selectedCount > 0 && (
                  <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-primary-300">{selectedCount} selected</span>
                )}
              </span>
              <span className="text-slate-500">{techs?.length ?? 0}</span>
            </button>

            {!isCollapsed && (
              <div className="p-2 space-y-2">
                {(techs?.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-500 px-1">No results</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {techs!.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => toggleTech(t.name)}
                        className={clsx(
                          'flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors mb-1',
                          isSelected(t.name)
                            ? 'border-primary-500 bg-primary-500/20 text-primary-300'
                            : 'border-slate-600 text-slate-300 hover:border-slate-400',
                        )}
                      >
                        {isSelected(t.name) && <Check size={11} />}
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}

                {addingTech === group ? (
                  <div className="space-y-1">
                    <div className="flex gap-1.5">
                      <Input
                        value={newTech}
                        onChange={(e) => { setNewTech(e.target.value); setDupTechAlert(''); }}
                        placeholder={`Add to ${GROUP_LABELS[group] ?? group}…`}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTech(group)}
                        autoFocus
                        error={dupTechAlert || undefined}
                      />
                      <Button size="sm" onClick={() => handleAddTech(group)} type="button" className="shrink-0">Add</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setAddingTech(null); setNewTech(''); setDupTechAlert(''); }} type="button" className="shrink-0 px-2"><X size={13} /></Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setAddingTech(group)} type="button">
                    <Plus size={13} /> Add to {GROUP_LABELS[group] ?? group}
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Sub-techs for selected */}
      {selected.map((sel) => {
        const schemaTech = state.schema.technologies.find((t) => t.name === sel.tech);
        if (!schemaTech) return null;
        return (
          <div key={sel.tech} className="rounded-lg border border-slate-700 bg-slate-900 p-3 space-y-2">
            <span className="text-xs font-semibold text-primary-400">Sub-techs: {sel.tech}</span>
            {schemaTech.subTechs.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {schemaTech.subTechs.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSub(sel.tech, sub)}
                    className={clsx(
                      'flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
                      sel.subTechs.includes(sub)
                        ? 'border-primary-500 bg-primary-500/20 text-primary-300'
                        : 'border-slate-600 text-slate-300 hover:border-slate-400',
                    )}
                  >
                    {sel.subTechs.includes(sub) && <Check size={11} />}
                    {sub}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No sub-technologies defined yet</p>
            )}
            {addingSub === sel.tech ? (
              <div className="space-y-1">
                <div className="flex gap-1.5">
                  <Input
                    value={newSub}
                    onChange={(e) => { setNewSub(e.target.value); setDupSubAlert(''); }}
                    placeholder={`Add sub-tech for ${sel.tech}…`}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSub(sel.tech)}
                    autoFocus
                    error={dupSubAlert || undefined}
                  />
                  <Button size="sm" onClick={() => handleAddSub(sel.tech)} type="button" className="shrink-0">Add</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setAddingSub(null); setNewSub(''); setDupSubAlert(''); }} type="button" className="shrink-0 px-2"><X size={13} /></Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setAddingSub(sel.tech)} type="button">
                <Plus size={13} /> Add sub-tech
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
