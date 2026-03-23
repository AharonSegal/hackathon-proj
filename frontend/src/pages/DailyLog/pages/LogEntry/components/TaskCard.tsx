import { useRef, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Trash2 } from 'lucide-react';
import type { TaskFormState, TechSelection } from '../../../utils/types';
import { Card, CardHeader, CardTitle, Button, Input, TextArea, InputLabel, InputError, Toggle } from '../../../ui';
import { colors, spacing, typography } from '../../../theme';
import CategoryPicker from './CategoryPicker';
import TechSelector from './TechSelector';
import LanguagePicker from './LanguagePicker';

interface Props {
  task: TaskFormState;
  index: number;
  error?: string;
  canRemove: boolean;
  onUpdate: (updates: Partial<TaskFormState>) => void;
  onClear: () => void;
  onRemove: () => void;
  isNew?: boolean;
}

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.md};
`;

const FieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xxs};
`;

const teamOptions = [
  { value: 'solo', label: 'Solo' },
  { value: 'team', label: 'Team' },
];

export default function TaskCard({ task, index, error, canRemove, onUpdate, onClear, onRemove, isNew }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (isNew && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isNew]);

  return (
    <Card ref={ref} highlighted={focused} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      <CardHeader>
        <CardTitle size={typography.size.md}>Task {index + 1}</CardTitle>
        <div style={{ display: 'flex', gap: spacing.xs }}>
          <Button variant="ghost" size="sm" onClick={onClear} type="button">Clear</Button>
          {canRemove && (
            <Button variant="danger" size="sm" onClick={onRemove} type="button" iconOnly>
              <Trash2 />
            </Button>
          )}
        </div>
      </CardHeader>

      <Body>
        <FieldBlock>
          <InputLabel>Categories</InputLabel>
          <CategoryPicker selected={task.categories} onChange={(cats) => onUpdate({ categories: cats })} />
        </FieldBlock>

        <FieldBlock>
          <InputLabel required>Title</InputLabel>
          <Input
            value={task.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="What did you work on?"
            hasError={!!error}
          />
          {error && <InputError>{error}</InputError>}
        </FieldBlock>

        <FieldBlock>
          <InputLabel>Coding Languages</InputLabel>
          <LanguagePicker
            selected={task.codingLanguages ?? []}
            onChange={(langs) => onUpdate({ codingLanguages: langs })}
          />
        </FieldBlock>

        <FieldBlock>
          <InputLabel>Technologies</InputLabel>
          <TechSelector
            selected={task.technologies}
            onChange={(techs: TechSelection[]) => onUpdate({ technologies: techs })}
          />
        </FieldBlock>

        <FieldBlock>
          <InputLabel>Team type</InputLabel>
          <Toggle
            options={teamOptions}
            value={task.teamType}
            onChange={(val) => onUpdate({ teamType: val as 'solo' | 'team' })}
          />
        </FieldBlock>

        {task.teamType === 'team' && (
          <FieldBlock>
            <InputLabel>Team size</InputLabel>
            <Input
              type="number"
              min={2}
              max={500}
              value={task.teamSize ?? ''}
              onChange={(e) => onUpdate({ teamSize: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="Number of people..."
              style={{ maxWidth: 160 }}
            />
          </FieldBlock>
        )}

        <FieldBlock>
          <InputLabel>Description</InputLabel>
          <TextArea
            value={task.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Optional details..."
            rows={3}
          />
        </FieldBlock>
      </Body>
    </Card>
  );
}
