import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useApp } from '../../../context/AppContext';
import { capitalize, findSimilar } from '../../../utils/helpers';

const SELECT_CLS =
  'w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function ProjectSelector({ value, onChange }: Props) {
  const { state, updateSchema } = useApp();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [similarMatch, setSimilarMatch] = useState<{ input: string; match: string } | null>(null);

  const doAdd = async (name: string) => {
    const formatted = capitalize(name.trim());
    if (!formatted) return;
    if (state.schema.projects.some((p) => p.toLowerCase() === formatted.toLowerCase())) return;
    await updateSchema({ ...state.schema, projects: [...state.schema.projects, formatted] });
    onChange(formatted);
    setNewName('');
    setAdding(false);
  };

  const handleAdd = () => {
    const formatted = capitalize(newName.trim());
    if (!formatted) return;
    if (state.schema.projects.some((p) => p.toLowerCase() === formatted.toLowerCase())) return;
    const similar = findSimilar(formatted, state.schema.projects);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarMatch({ input: formatted, match: similar });
      return;
    }
    doAdd(formatted);
  };

  return (
    <div className="space-y-2">
      <Modal
        open={!!similarMatch}
        onClose={() => setSimilarMatch(null)}
        title="Similar project found"
        size="sm"
      >
        <p className="text-sm text-slate-300 leading-relaxed">
          You're adding <span className="font-semibold text-primary-400">"{similarMatch?.input}"</span>, but a similar project already exists:{' '}
          <span className="font-semibold text-primary-400">"{similarMatch?.match}"</span>.
          <br />Do you want to use the existing one or create a new one?
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => {
            if (similarMatch) onChange(similarMatch.match);
            setSimilarMatch(null); setNewName(''); setAdding(false);
          }}>
            Use "{similarMatch?.match}"
          </Button>
          <Button size="sm" onClick={() => {
            if (similarMatch) doAdd(similarMatch.input);
            setSimilarMatch(null);
          }}>
            Create anyway
          </Button>
        </div>
      </Modal>

      <div className="flex items-center gap-2">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLS}>
          {state.schema.projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <Button variant="secondary" size="sm" onClick={() => setAdding(!adding)} type="button" className="shrink-0">
          <Plus size={14} /> New
        </Button>
      </div>

      {adding && (
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name…"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <Button size="sm" onClick={handleAdd} type="button" className="shrink-0">Add</Button>
          <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewName(''); }} type="button" className="shrink-0">Cancel</Button>
        </div>
      )}
    </div>
  );
}
