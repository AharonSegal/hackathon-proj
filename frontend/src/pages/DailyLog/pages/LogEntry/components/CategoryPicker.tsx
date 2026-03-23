import { useState } from 'react';
import styled from '@emotion/styled';
import { Plus } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Pill, Button, Input, Modal } from '../../../ui';
import { colors, spacing, typography } from '../../../theme';
import { capitalize, findSimilar } from '../../../utils/helpers';

interface Props {
  selected: string[];
  onChange: (cats: string[]) => void;
}

const Wrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.xs};
  align-items: center;
`;

const AddRow = styled.div`
  display: flex;
  gap: ${spacing.xs};
  align-items: center;
  margin-top: ${spacing.xs};
`;

const DuplicateAlert = styled.div`
  margin-top: ${spacing.xs};
  padding: ${spacing.xs} ${spacing.sm};
  background: ${colors.warning.muted};
  border: 1px solid ${colors.warning.primary};
  border-radius: 8px;
  color: ${colors.warning.text};
  font-size: ${typography.size.sm};
  font-weight: ${typography.weight.medium};
`;

const SimilarText = styled.p`
  color: ${colors.text.secondary};
  font-size: ${typography.size.md};
  line-height: 1.6;
`;

const SimilarName = styled.span`
  color: ${colors.accent.primary};
  font-weight: ${typography.weight.semibold};
`;

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
    setNewCat('');
    setDupAlert('');
    setAdding(false);
  };

  const handleAdd = () => {
    const formatted = capitalize(newCat.trim());
    if (!formatted) return;

    const existing = state.schema.categories.find((c) => c.toLowerCase() === formatted.toLowerCase());
    if (existing) {
      setDupAlert(`"${existing}" already exists`);
      return;
    }

    setDupAlert('');

    const similar = findSimilar(formatted, state.schema.categories);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarMatch({ input: formatted, match: similar });
      return;
    }

    doAdd(formatted);
  };

  return (
    <div>
      <Modal
        open={!!similarMatch}
        onClose={() => setSimilarMatch(null)}
        title="Similar category found"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              if (similarMatch) onChange([...selected, similarMatch.match]);
              setSimilarMatch(null);
              setNewCat('');
              setAdding(false);
            }}>
              Use "{similarMatch?.match}"
            </Button>
            <Button onClick={() => {
              if (similarMatch) doAdd(similarMatch.input);
              setSimilarMatch(null);
            }}>
              Create "{similarMatch?.input}" anyway
            </Button>
          </>
        }
      >
        <SimilarText>
          You're adding <SimilarName>"{similarMatch?.input}"</SimilarName>, but a similar category already exists: <SimilarName>"{similarMatch?.match}"</SimilarName>
          <br />Do you want to use the existing one or create a new one?
        </SimilarText>
      </Modal>

      <Wrap>
        {state.schema.categories.map((cat) => (
          <Pill key={cat} label={cat} selected={selected.includes(cat)} onClick={() => toggle(cat)} />
        ))}
        <Button variant="ghost" size="sm" onClick={() => { setAdding(!adding); setDupAlert(''); }} type="button" iconOnly>
          <Plus />
        </Button>
      </Wrap>

      {adding && (
        <>
          <AddRow>
            <Input
              value={newCat}
              onChange={(e) => { setNewCat(e.target.value); setDupAlert(''); }}
              placeholder="Category name..."
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
              style={{ flex: 1, height: '32px' }}
            />
            <Button size="sm" onClick={handleAdd} type="button">Add</Button>
          </AddRow>
          {dupAlert && <DuplicateAlert>{dupAlert}</DuplicateAlert>}
        </>
      )}
    </div>
  );
}
