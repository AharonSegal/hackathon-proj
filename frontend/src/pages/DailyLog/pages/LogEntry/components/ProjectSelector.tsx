import { useState } from 'react';
import styled from '@emotion/styled';
import { Plus } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Select, Button, Input, Modal } from '../../../ui';
import { colors, spacing, typography } from '../../../theme';
import { capitalize, findSimilar } from '../../../utils/helpers';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
`;

const AddRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
  margin-top: ${spacing.xs};
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
    <div>
      <Modal
        open={!!similarMatch}
        onClose={() => setSimilarMatch(null)}
        title="Similar project found"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              if (similarMatch) onChange(similarMatch.match);
              setSimilarMatch(null);
              setNewName('');
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
          You're adding <SimilarName>"{similarMatch?.input}"</SimilarName>, but a similar project already exists: <SimilarName>"{similarMatch?.match}"</SimilarName>
          <br />Do you want to use the existing one or create a new one?
        </SimilarText>
      </Modal>

      <Row>
        <Select value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
          {state.schema.projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
        <Button variant="secondary" size="sm" onClick={() => setAdding(!adding)} type="button">
          <Plus /> New
        </Button>
      </Row>
      {adding && (
        <AddRow>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name..."
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
            style={{ flex: 1 }}
          />
          <Button size="sm" onClick={handleAdd} type="button">Add</Button>
          <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewName(''); }} type="button">Cancel</Button>
        </AddRow>
      )}
    </div>
  );
}
