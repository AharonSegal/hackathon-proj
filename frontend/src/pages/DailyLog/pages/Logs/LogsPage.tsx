import { useState, useMemo } from 'react';
import { Trash2, Pencil, ChevronDown, ChevronUp, Users, User, Search } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { Button } from '@/shared/components/ui/Button';
import { Input, Textarea } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { Badge } from '@/shared/components/ui/Badge';
import { useApp } from '../../context/AppContext';
import type { Entry, TechSelection } from '../../utils/types';
import { formatDate, isInDateRange } from '../../utils/helpers';
import CategoryPicker from '../LogEntry/components/CategoryPicker';
import TechSelector from '../LogEntry/components/TechSelector';
import LanguagePicker from '../LogEntry/components/LanguagePicker';

const SELECT_CLS =
  'bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500';

/* ── Edit form ─────────────────────────────────────────────────────────────── */

interface EditFormProps {
  entry: Entry;
  onSave: (updated: Entry) => void;
  onCancel: () => void;
}

function EditForm({ entry, onSave, onCancel }: EditFormProps) {
  const [title, setTitle] = useState(entry.title);
  const [description, setDescription] = useState(entry.description || '');
  const [categories, setCategories] = useState<string[]>(entry.categories || []);
  const [technologies, setTechnologies] = useState<TechSelection[]>(entry.technologies || []);
  const [codingLanguages, setCodingLanguages] = useState<string[]>(entry.codingLanguages || []);
  const [teamType, setTeamType] = useState<'solo' | 'team'>(entry.teamType || 'solo');
  const [teamSize, setTeamSize] = useState<number | undefined>(entry.teamSize);
  const [titleError, setTitleError] = useState('');

  const handleSave = () => {
    if (!title.trim()) { setTitleError('Title is required'); return; }
    onSave({
      ...entry,
      title: title.trim(),
      description: description.trim(),
      categories,
      technologies,
      codingLanguages,
      teamType,
      teamSize: teamType === 'team' ? teamSize : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Categories</label>
        <CategoryPicker selected={categories} onChange={setCategories} />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Title <span className="text-rose-400">*</span>
        </label>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setTitleError(''); }}
          placeholder="What did you work on?"
          error={titleError || undefined}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Coding Languages</label>
        <LanguagePicker selected={codingLanguages} onChange={setCodingLanguages} />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Technologies</label>
        <TechSelector selected={technologies} onChange={setTechnologies} />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Team type</label>
        <div className="inline-flex rounded-lg border border-slate-600 p-0.5 gap-0.5">
          {(['solo', 'team'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTeamType(t)}
              className={clsx(
                'rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                teamType === t
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-slate-100',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {teamType === 'team' && (
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Team size</label>
          <Input
            type="number" min={2} max={500}
            value={teamSize ?? ''}
            onChange={(e) => setTeamSize(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Number of people..."
            className="max-w-[160px]"
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button onClick={handleSave} type="button">Save Changes</Button>
      </div>
    </div>
  );
}

/* ── Entry card ────────────────────────────────────────────────────────────── */

function EntryCard({ entry, onEdit, onDelete }: { entry: Entry; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasSubs = entry.technologies?.some((t) => t.subTechs?.length > 0);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs text-slate-400">{formatDate(entry.date)}</span>
            <span className="bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded text-xs font-semibold">
              Day #{entry.dayNumber}
            </span>
            <span className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-xs font-medium border border-slate-600">
              {entry.project}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              {entry.teamType === 'team' ? <Users size={12} /> : <User size={12} />}
              {entry.teamType === 'team'
                ? entry.teamSize ? `Team (${entry.teamSize})` : 'Team'
                : 'Solo'}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-slate-100 mb-1">{entry.title}</h3>

          {/* Description preview */}
          {entry.description && (
            <p className="text-sm text-slate-400 mb-2 line-clamp-2">{entry.description}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(entry.codingLanguages || []).map((l) => (
              <Badge key={l} color="indigo">{l}</Badge>
            ))}
            {(entry.categories || []).map((c) => (
              <Badge key={c} color="slate">{c}</Badge>
            ))}
            {(entry.technologies || []).map((t) => (
              <Badge key={t.tech} color="violet">{t.tech}</Badge>
            ))}
          </div>

          {/* Expand sub-techs */}
          {hasSubs && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-md px-2 py-1 transition-colors"
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? 'Hide sub-techs' : 'Show sub-techs'}
            </button>
          )}

          {expanded && (
            <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
              {entry.technologies.filter((t) => t.subTechs?.length > 0).map((t) => (
                <div key={t.tech}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.tech}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.subTechs.map((s) => <Badge key={s} color="sky">{s}</Badge>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" onClick={onEdit} type="button" className="px-2" title="Edit">
            <Pencil size={14} />
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete} type="button" className="px-2" title="Delete">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */

export default function LogsPage() {
  const { state, updateEntry, deleteEntry } = useApp();

  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null);

  const allProjects = useMemo(() => [...new Set(state.entries.map((e) => e.project))].sort(), [state.entries]);
  const allCategories = useMemo(() => [...new Set(state.entries.flatMap((e) => e.categories || []))].sort(), [state.entries]);

  const filtered = useMemo(() => {
    let result = state.entries.filter((e) => {
      if (!isInDateRange(e.date, dateRange)) return false;
      if (projectFilter !== 'all' && e.project !== projectFilter) return false;
      if (categoryFilter !== 'all' && !(e.categories || []).includes(categoryFilter)) return false;
      if (teamFilter !== 'all' && e.teamType !== teamFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.title.toLowerCase().includes(q) &&
          !(e.description || '').toLowerCase().includes(q) &&
          !(e.technologies || []).some((t) => t.tech.toLowerCase().includes(q)) &&
          !(e.codingLanguages || []).some((l) => l.toLowerCase().includes(q)) &&
          !(e.categories || []).some((c) => c.toLowerCase().includes(q))
        ) return false;
      }
      return true;
    });
    return result.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return sortOrder === 'desc' ? -d : d;
    });
  }, [state.entries, search, dateRange, projectFilter, categoryFilter, teamFilter, sortOrder]);

  const handleSaveEdit = async (updated: Entry) => {
    await updateEntry(updated);
    setEditingEntry(null);
    toast.success('Entry updated');
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;
    await deleteEntry(deletingEntry.id);
    setDeletingEntry(null);
    toast.success('Entry deleted');
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Edit modal */}
      <Modal open={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit Entry">
        {editingEntry && (
          <EditForm
            entry={editingEntry}
            onSave={handleSaveEdit}
            onCancel={() => setEditingEntry(null)}
          />
        )}
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deletingEntry} onClose={() => setDeletingEntry(null)} title="Delete Entry">
        <p className="text-sm text-slate-300 mb-6">
          Are you sure you want to delete{' '}
          <strong className="text-slate-100">"{deletingEntry?.title}"</strong>?
          {' '}This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeletingEntry(null)} type="button">Cancel</Button>
          <Button variant="danger" onClick={handleDelete} type="button">Delete</Button>
        </div>
      </Modal>

      {/* Filter bar */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title, tech, category..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
          />
        </div>

        {/* Selects */}
        <div className="flex flex-wrap gap-2">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={SELECT_CLS}>
            <option value="all">All time</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={SELECT_CLS}>
            <option value="all">All projects</option>
            {allProjects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={SELECT_CLS}>
            <option value="all">All categories</option>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className={SELECT_CLS}>
            <option value="all">All</option>
            <option value="solo">Solo</option>
            <option value="team">Team</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} className={SELECT_CLS}>
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-400">
        {filtered.length} of {state.entries.length} entries
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-400">
          <p className="font-medium text-slate-300">
            {state.entries.length === 0 ? 'No entries yet' : 'No matching entries'}
          </p>
          <p className="text-sm">
            {state.entries.length === 0
              ? 'Submit your first day log to see it here.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => setEditingEntry(entry)}
              onDelete={() => setDeletingEntry(entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
