import { useState, useMemo } from 'react';
import styled from '@emotion/styled';
import { useApp } from '../../../context/AppContext';
import { SearchInput, Chip } from '../../../ui';
import { colors, spacing, typography, transitions } from '../../../theme';

interface Props {
  selected: string[];
  onChange: (langs: string[]) => void;
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs};
`;

const ChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.xxs};
`;

const DropdownList = styled.div`
  background: ${colors.bg.elevated};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: ${spacing.xs};
`;

const LangItem = styled.button<{ selected: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  padding: ${spacing.xs} ${spacing.sm};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: ${typography.size.sm};
  color: ${({ selected }) => selected ? colors.accent.primary : colors.text.primary};
  background: ${({ selected }) => selected ? colors.accent.muted : 'transparent'};
  font-weight: ${({ selected }) => selected ? typography.weight.medium : typography.weight.normal};
  transition: background ${transitions.fast};
  &:hover { background: ${({ selected }) => selected ? colors.accent.muted : colors.bg.hover}; }
`;

const EmptyMsg = styled.p`
  font-size: ${typography.size.sm};
  color: ${colors.text.tertiary};
  text-align: center;
  padding: ${spacing.sm} 0;
`;

export default function LanguagePicker({ selected, onChange }: Props) {
  const { state } = useApp();
  const [search, setSearch] = useState('');

  const languages = useMemo(() =>
    state.schema.technologies
      .filter((t) => t.group === 'languages')
      .map((t) => t.name)
      .sort(),
    [state.schema.technologies]
  );

  const filtered = useMemo(() =>
    languages.filter((l) => l.toLowerCase().includes(search.toLowerCase())),
    [languages, search]
  );

  const toggle = (lang: string) => {
    if (selected.includes(lang)) {
      onChange(selected.filter((l) => l !== lang));
    } else {
      onChange([...selected, lang]);
    }
  };

  return (
    <Wrap>
      {selected.length > 0 && (
        <ChipsRow>
          {selected.map((l) => (
            <Chip key={l} label={l} onRemove={() => toggle(l)} />
          ))}
        </ChipsRow>
      )}
      <SearchInput value={search} onChange={setSearch} placeholder="Search languages..." />
      <DropdownList>
        {filtered.length === 0 ? (
          <EmptyMsg>No languages found</EmptyMsg>
        ) : (
          filtered.map((lang) => (
            <LangItem
              key={lang}
              selected={selected.includes(lang)}
              onClick={() => toggle(lang)}
              type="button"
            >
              {selected.includes(lang) ? '✓ ' : ''}{lang}
            </LangItem>
          ))
        )}
      </DropdownList>
    </Wrap>
  );
}
