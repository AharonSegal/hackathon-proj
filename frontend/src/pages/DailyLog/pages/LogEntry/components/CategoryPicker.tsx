import { useState } from 'react';
import { Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useApp } from '../../../context/AppContext';
import { capitalize, findSimilar } from '../../../utils/helpers';

interface Props {
  selected: string[];
  onChange: (cats: string[]) => void;
}

export default function CategoryPicker({ selected, onChange }: Props) {
  const { state, updateSchema } = useApp();
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [dupAlert, setDupAlert] = useState('');
  const [similarMatch, setSimilarMatch] = useState<{ input: string; match: string } | null>(null);

  const toggle = (cat: string) => {
    onChange(selected.includes(cat) ? selected.filter((c) => c !== cat) : [...selected, cat]);
  };

  const doAdd = async (name: string) => {
    await updateSchema({ ...state.schema, categories: [...state.schema.categories, name] });
    onChange([...selected, name]);
    setNewCat(''); setDupAlert(''); setAdding(false);
  };

  const handleAdd = () => {
    const formatted = capitalize(newCat.trim());
    if (!formatted) return;
    const existing = state.schema.categories.find((c) => c.toLowerCase() === formatted.toLowerCase());
    if (existing) { setDupAlert(`"${existing}" already exists`); return; }
    setDupAlert('');
    const similar = findSimilar(formatted, state.schema.categories);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarMatch({ input: formatted, match: similar }); return;
    }
    doAdd(formatted);
  };

  return (
    <div className="space-y-2">
      <Modal open={!!similarMatch} onClose={() => setSimilarMatch(null)} title="Similar category found" size="sm">
        <p className="text-sm text-slate-300 leading-relaxed">
          You're adding <span className="font-semibold text-primary-400">"{similarMatch?.input}"</span>, but{' '}
          <span className="font-semibold text-primary-400">"{similarMatch?.match}"</span> already exists.
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => {
            if (similarMatch) onChange([...selected, similarMatch.match]);
            setSimilarMatch(null); setNewCat(''); setAdding(false);
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

      <div className="flex flex-wrap items-center gap-1.5">
        {state.schema.categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => toggle(cat)}
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
              selected.includes(cat)
                ? 'bg-primary-600 text-white border-primary-600'
                : 'border-slate-600 text-slate-300 hover:border-slate-400 hover:text-slate-100',
            )}
          >
            {cat}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setAdding(!adding); setDupAlert(''); }}
          className="flex items-center justify-center w-7 h-7 rounded-full border border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-100 transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>

      {adding && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              value={newCat}
              onChange={(e) => { setNewCat(e.target.value); setDupAlert(''); }}
              placeholder="Category name…"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
              error={dupAlert || undefined}
            />
            <Button size="sm" onClick={handleAdd} type="button" className="shrink-0">Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}
