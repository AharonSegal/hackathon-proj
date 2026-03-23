import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, FileText, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { Button } from '@/shared/components/ui/Button';
import { Input, Textarea } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useApp } from '../../context/AppContext';
import defaultSchema, { GROUP_LABELS, GROUP_ORDER } from '../../utils/defaultSchema';
import { capitalize, findSimilar } from '../../utils/helpers';
import type { ProjectInfo } from '../../utils/types';

const INPUT_CLS =
  'w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500';

const SELECT_CLS =
  'bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500';

export default function SchemaManagerPage() {
  const { state, updateSchema, clearData } = useApp();
  const schema = state.schema;

  const [newProject, setNewProject] = useState('');
  const [addingProject, setAddingProject] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [techSearch, setTechSearch] = useState('');
  const [addingTech, setAddingTech] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechGroup, setNewTechGroup] = useState('languages');
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSub, setNewSub] = useState('');
  const [dupAlert, setDupAlert] = useState('');

  const [confirmModal, setConfirmModal] = useState<{ type: string; name?: string } | null>(null);
  const [similarModal, setSimilarModal] = useState<{ type: 'project' | 'category' | 'tech' | 'subTech'; input: string; match: string; techName?: string } | null>(null);

  // Project info modal
  const [projectInfoModal, setProjectInfoModal] = useState<string | null>(null);
  const [piTitle, setPiTitle] = useState('');
  const [piDescription, setPiDescription] = useState('');
  const [piTechStack, setPiTechStack] = useState<string[]>([]);
  const [piTeamType, setPiTeamType] = useState<'solo' | 'team'>('solo');
  const [piTeamSize, setPiTeamSize] = useState<number | undefined>(undefined);
  const [piTechSearch, setPiTechSearch] = useState('');

  const openProjectInfo = (projectName: string) => {
    const info = schema.projectInfos?.[projectName];
    setPiTitle(info?.title ?? '');
    setPiDescription(info?.description ?? '');
    setPiTechStack(info?.techStack ?? []);
    setPiTeamType(info?.teamType ?? 'solo');
    setPiTeamSize(info?.teamSize);
    setPiTechSearch('');
    setProjectInfoModal(projectName);
  };

  const saveProjectInfo = () => {
    if (!projectInfoModal) return;
    updateSchema({
      ...schema,
      projectInfos: {
        ...(schema.projectInfos ?? {}),
        [projectInfoModal]: {
          title: piTitle.trim(),
          description: piDescription.trim(),
          techStack: piTechStack,
          teamType: piTeamType,
          teamSize: piTeamType === 'team' ? piTeamSize : undefined,
        } as ProjectInfo,
      },
    });
    toast.success(`Project info saved for "${projectInfoModal}"`);
    setProjectInfoModal(null);
  };

  const allTechNames = schema.technologies.map((t) => t.name).sort();
  const filteredPiTechs = piTechSearch
    ? allTechNames.filter((n) => n.toLowerCase().includes(piTechSearch.toLowerCase()))
    : allTechNames;
  const togglePiTech = (name: string) =>
    setPiTechStack((prev) => prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]);

  // Projects CRUD
  const doAddProject = (name: string) => {
    updateSchema({ ...schema, projects: [...schema.projects, name] });
    setNewProject(''); setAddingProject(false);
    toast.success(`Project "${name}" added`);
  };
  const addProject = () => {
    const formatted = capitalize(newProject.trim());
    if (!formatted) return;
    const existing = schema.projects.find((p) => p.toLowerCase() === formatted.toLowerCase());
    if (existing) { setDupAlert(`"${existing}" already exists`); return; }
    setDupAlert('');
    const similar = findSimilar(formatted, schema.projects);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarModal({ type: 'project', input: formatted, match: similar }); return;
    }
    doAddProject(formatted);
  };
  const removeProject = (name: string) => {
    updateSchema({ ...schema, projects: schema.projects.filter((p) => p !== name) });
    toast.success(`Project "${name}" removed`);
    setConfirmModal(null);
  };

  // Categories CRUD
  const doAddCategory = (name: string) => {
    updateSchema({ ...schema, categories: [...schema.categories, name] });
    setNewCat(''); setAddingCat(false);
    toast.success(`Category "${name}" added`);
  };
  const addCategory = () => {
    const formatted = capitalize(newCat.trim());
    if (!formatted) return;
    const existing = schema.categories.find((c) => c.toLowerCase() === formatted.toLowerCase());
    if (existing) { setDupAlert(`"${existing}" already exists`); return; }
    setDupAlert('');
    const similar = findSimilar(formatted, schema.categories);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarModal({ type: 'category', input: formatted, match: similar }); return;
    }
    doAddCategory(formatted);
  };
  const removeCategory = (name: string) => {
    updateSchema({ ...schema, categories: schema.categories.filter((c) => c !== name) });
    toast.success(`Category "${name}" removed`);
    setConfirmModal(null);
  };

  // Technologies CRUD
  const doAddTech = (name: string) => {
    updateSchema({ ...schema, technologies: [...schema.technologies, { name, group: newTechGroup, subTechs: [] }] });
    setNewTechName(''); setAddingTech(false);
    toast.success(`Technology "${name}" added`);
  };
  const addTech = () => {
    const formatted = capitalize(newTechName.trim());
    if (!formatted) return;
    const existing = schema.technologies.find((x) => x.name.toLowerCase() === formatted.toLowerCase());
    if (existing) { setDupAlert(`"${existing.name}" already exists`); return; }
    setDupAlert('');
    const similar = findSimilar(formatted, schema.technologies.map((t) => t.name));
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarModal({ type: 'tech', input: formatted, match: similar }); return;
    }
    doAddTech(formatted);
  };
  const removeTech = (name: string) => {
    updateSchema({ ...schema, technologies: schema.technologies.filter((t) => t.name !== name) });
    toast.success(`Technology "${name}" removed`);
    setConfirmModal(null);
  };

  // Sub-techs CRUD
  const doAddSubTech = (techName: string, name: string) => {
    updateSchema({
      ...schema,
      technologies: schema.technologies.map((tech) =>
        tech.name === techName ? { ...tech, subTechs: [...tech.subTechs, name] } : tech
      ),
    });
    setNewSub(''); setAddingSubFor(null);
    toast.success(`Sub-tech "${name}" added to ${techName}`);
  };
  const addSubTech = (techName: string) => {
    const formatted = capitalize(newSub.trim());
    if (!formatted) return;
    const tech = schema.technologies.find((t) => t.name === techName);
    if (!tech) return;
    const existing = tech.subTechs.find((s) => s.toLowerCase() === formatted.toLowerCase());
    if (existing) { setDupAlert(`"${existing}" already exists`); return; }
    setDupAlert('');
    const similar = findSimilar(formatted, tech.subTechs);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarModal({ type: 'subTech', input: formatted, match: similar, techName }); return;
    }
    doAddSubTech(techName, formatted);
  };
  const removeSubTech = (techName: string, sub: string) => {
    updateSchema({
      ...schema,
      technologies: schema.technologies.map((tech) =>
        tech.name === techName ? { ...tech, subTechs: tech.subTechs.filter((s) => s !== sub) } : tech
      ),
    });
  };

  const filteredTechs = techSearch
    ? schema.technologies.filter((t) => t.name.toLowerCase().includes(techSearch.toLowerCase()))
    : schema.technologies;
  const techsByGroup: Record<string, typeof schema.technologies> = {};
  filteredTechs.forEach((t) => {
    if (!techsByGroup[t.group]) techsByGroup[t.group] = [];
    techsByGroup[t.group].push(t);
  });

  const projectInUse = (name: string) => state.entries.some((e) => e.project === name);
  const categoryInUse = (name: string) => state.entries.some((e) => e.categories.includes(name));
  const techInUse = (name: string) => state.entries.some((e) => e.technologies.some((t) => t.tech === name));

  const handleConfirm = () => {
    if (!confirmModal) return;
    if (confirmModal.type === 'project') removeProject(confirmModal.name!);
    else if (confirmModal.type === 'category') removeCategory(confirmModal.name!);
    else if (confirmModal.type === 'tech') removeTech(confirmModal.name!);
    else if (confirmModal.type === 'resetData') { clearData(); toast.success('All data cleared'); setConfirmModal(null); }
    else if (confirmModal.type === 'resetSchema') { updateSchema(defaultSchema); toast.success('Schema reset to defaults'); setConfirmModal(null); }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* ── Project info modal ─────────────────────────────────────── */}
      <Modal open={!!projectInfoModal} onClose={() => setProjectInfoModal(null)} title={`Project info — ${projectInfoModal}`}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Title</label>
            <Input value={piTitle} onChange={(e) => setPiTitle(e.target.value)} placeholder="Short project title..." />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tech stack</label>
            {piTechStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {piTechStack.map((t) => (
                  <span key={t} className="flex items-center gap-1 bg-slate-700 text-slate-200 rounded-full px-2.5 py-0.5 text-xs">
                    {t}
                    <button type="button" onClick={() => togglePiTech(t)} className="hover:text-white"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <input
              value={piTechSearch}
              onChange={(e) => setPiTechSearch(e.target.value)}
              placeholder="Search all technologies..."
              className={INPUT_CLS}
            />
            <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-44 overflow-y-auto mt-1">
              {filteredPiTechs.map((name) => (
                <button
                  key={name} type="button" onClick={() => togglePiTech(name)}
                  className={clsx(
                    'flex items-center gap-2 w-full text-left px-3 py-2 text-sm transition-colors',
                    piTechStack.includes(name)
                      ? 'text-primary-400 bg-primary-500/10 font-medium'
                      : 'text-slate-300 hover:bg-slate-800',
                  )}
                >
                  {piTechStack.includes(name) && <Check size={13} />}
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Team</label>
            <div className="inline-flex rounded-lg border border-slate-600 p-0.5 gap-0.5">
              {(['solo', 'team'] as const).map((t) => (
                <button
                  key={t} type="button" onClick={() => setPiTeamType(t)}
                  className={clsx(
                    'rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                    piTeamType === t ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-100',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {piTeamType === 'team' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Team size</label>
              <Input
                type="number" min={2} max={500}
                value={piTeamSize ?? ''}
                onChange={(e) => setPiTeamSize(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Number of people..."
                className="max-w-[160px]"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</label>
            <Textarea value={piDescription} onChange={(e) => setPiDescription(e.target.value)} placeholder="Short summary of the project..." rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
            <Button variant="ghost" onClick={() => setProjectInfoModal(null)} type="button">Cancel</Button>
            <Button onClick={saveProjectInfo} type="button">Save</Button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm delete/reset modal ─────────────────────────────── */}
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title="Confirm">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            {confirmModal?.type === 'resetData' && 'This will delete all entries and preferences. Schema will be kept. This cannot be undone.'}
            {confirmModal?.type === 'resetSchema' && 'This will reset the schema to defaults. All custom projects, categories, and technologies will be lost.'}
            {confirmModal?.name && `Are you sure you want to remove "${confirmModal.name}"?`}
          </p>
          {confirmModal?.name && (
            (confirmModal.type === 'project' && projectInUse(confirmModal.name)) ||
            (confirmModal.type === 'category' && categoryInUse(confirmModal.name)) ||
            (confirmModal.type === 'tech' && techInUse(confirmModal.name))
          ) && (
            <p className="flex items-center gap-1.5 text-sm text-amber-400">
              <AlertTriangle size={14} />
              This item is used in existing entries.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
            <Button variant="ghost" onClick={() => setConfirmModal(null)} type="button">Cancel</Button>
            <Button variant="danger" onClick={handleConfirm} type="button">
              {confirmModal?.type?.startsWith('reset') ? 'Reset' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Similar item modal ─────────────────────────────────────── */}
      <Modal open={!!similarModal} onClose={() => setSimilarModal(null)} title="Similar item found">
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Adding <span className="font-semibold text-primary-400">"{similarModal?.input}"</span> but{' '}
            <span className="font-semibold text-primary-400">"{similarModal?.match}"</span> already exists.
            Use the existing one or create a new one?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
            <Button variant="ghost" onClick={() => { setSimilarModal(null); setNewProject(''); setNewCat(''); setNewTechName(''); setNewSub(''); setAddingProject(false); setAddingCat(false); setAddingTech(false); setAddingSubFor(null); }} type="button">
              Use "{similarModal?.match}"
            </Button>
            <Button onClick={() => {
              if (!similarModal) return;
              if (similarModal.type === 'project') doAddProject(similarModal.input);
              else if (similarModal.type === 'category') doAddCategory(similarModal.input);
              else if (similarModal.type === 'tech') doAddTech(similarModal.input);
              else if (similarModal.type === 'subTech' && similarModal.techName) doAddSubTech(similarModal.techName, similarModal.input);
              setSimilarModal(null);
            }} type="button">
              Create anyway
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Projects section ───────────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-100">Projects</h2>
          <Button variant="secondary" size="sm" onClick={() => { setAddingProject(!addingProject); setDupAlert(''); }} type="button">
            <Plus size={14} /> Add
          </Button>
        </div>

        <div className="space-y-0.5">
          {schema.projects.map((p) => (
            <div key={p} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-slate-700/50 transition-colors">
              <span className="text-sm text-slate-200">
                {p}
                {schema.projectInfos?.[p]?.title && (
                  <span className="ml-2 bg-primary-500/20 text-primary-300 text-xs px-2 py-0.5 rounded-full">
                    {schema.projectInfos[p].title}
                  </span>
                )}
              </span>
              <div className="flex gap-1">
                <button
                  type="button" onClick={() => openProjectInfo(p)} title="Edit project info"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-primary-400 hover:bg-primary-500/10 transition-colors"
                >
                  <FileText size={14} />
                </button>
                <button
                  type="button" onClick={() => setConfirmModal({ type: 'project', name: p })}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {addingProject && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Input
                value={newProject}
                onChange={(e) => { setNewProject(e.target.value); setDupAlert(''); }}
                placeholder="Project name..."
                onKeyDown={(e) => e.key === 'Enter' && addProject()}
                autoFocus
                error={dupAlert || undefined}
              />
              <Button size="sm" onClick={addProject} type="button" className="shrink-0">Add</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Categories section ─────────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-100">Categories</h2>
          <Button variant="secondary" size="sm" onClick={() => { setAddingCat(!addingCat); setDupAlert(''); }} type="button">
            <Plus size={14} /> Add
          </Button>
        </div>

        <div className="space-y-0.5">
          {schema.categories.map((c) => (
            <div key={c} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-slate-700/50 transition-colors">
              <span className="text-sm text-slate-200">{c}</span>
              <button
                type="button" onClick={() => setConfirmModal({ type: 'category', name: c })}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {addingCat && (
          <div className="mt-3">
            <div className="flex gap-2">
              <Input
                value={newCat}
                onChange={(e) => { setNewCat(e.target.value); setDupAlert(''); }}
                placeholder="Category name..."
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                autoFocus
                error={dupAlert || undefined}
              />
              <Button size="sm" onClick={addCategory} type="button" className="shrink-0">Add</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Technologies section ───────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-100">Technologies</h2>
          <Button variant="secondary" size="sm" onClick={() => { setAddingTech(!addingTech); setDupAlert(''); }} type="button">
            <Plus size={14} /> Add
          </Button>
        </div>

        <input
          value={techSearch}
          onChange={(e) => setTechSearch(e.target.value)}
          placeholder="Filter technologies..."
          className={`${INPUT_CLS} mb-4`}
        />

        <div className="space-y-4">
          {GROUP_ORDER.map((group) => {
            const techs = techsByGroup[group];
            if (!techs?.length) return null;
            return (
              <div key={group}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                  {GROUP_LABELS[group]}
                </h4>
                <div className="space-y-2">
                  {techs.map((tech) => (
                    <div key={tech.name} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-200">{tech.name}</span>
                        <button
                          type="button" onClick={() => setConfirmModal({ type: 'tech', name: tech.name })}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {tech.subTechs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {tech.subTechs.map((sub) => (
                            <span key={sub} className="flex items-center gap-1 bg-slate-700 text-slate-200 rounded-full px-2 py-0.5 text-xs">
                              {sub}
                              <button type="button" onClick={() => removeSubTech(tech.name, sub)} className="hover:text-white transition-colors">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {addingSubFor === tech.name ? (
                        <div className="flex gap-1.5 mt-1">
                          <Input
                            value={newSub}
                            onChange={(e) => { setNewSub(e.target.value); setDupAlert(''); }}
                            placeholder={`Add sub-tech for ${tech.name}...`}
                            onKeyDown={(e) => e.key === 'Enter' && addSubTech(tech.name)}
                            autoFocus
                            error={dupAlert || undefined}
                          />
                          <Button size="sm" onClick={() => addSubTech(tech.name)} type="button" className="shrink-0">Add</Button>
                          <Button variant="ghost" size="sm" onClick={() => { setAddingSubFor(null); setNewSub(''); setDupAlert(''); }} type="button" className="shrink-0 px-2">
                            <X size={13} />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setAddingSubFor(tech.name)} type="button">
                          <Plus size={13} /> Add sub-tech
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {addingTech && (
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <Input
                value={newTechName}
                onChange={(e) => { setNewTechName(e.target.value); setDupAlert(''); }}
                placeholder="Tech name..."
                autoFocus
                error={dupAlert || undefined}
              />
              <select value={newTechGroup} onChange={(e) => setNewTechGroup(e.target.value)} className={SELECT_CLS}>
                {GROUP_ORDER.map((g) => <option key={g} value={g}>{GROUP_LABELS[g]}</option>)}
              </select>
              <Button size="sm" onClick={addTech} type="button" className="shrink-0">Add</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Danger zone ────────────────────────────────────────────── */}
      <div className="border border-rose-500/30 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-rose-400">Danger Zone</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={() => setConfirmModal({ type: 'resetData' })} type="button">
            <Trash2 size={14} /> Reset All Data
          </Button>
          <Button variant="danger" onClick={() => setConfirmModal({ type: 'resetSchema' })} type="button">
            <Trash2 size={14} /> Reset Schema to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
