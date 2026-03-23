import { useState, useMemo } from 'react';
import styled from '@emotion/styled';
import { ChevronDown, ChevronRight, Plus, X, Check } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import type { TechSelection } from '../../../utils/types';
import { GROUP_LABELS, GROUP_ORDER } from '../../../utils/defaultSchema';
import { SearchInput, Chip, Button, Input, Modal } from '../../../ui';
import { colors, spacing, typography, transitions } from '../../../theme';
import { capitalize, findSimilar } from '../../../utils/helpers';

interface Props {
  selected: TechSelection[];
  onChange: (techs: TechSelection[]) => void;
}

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm};
`;

const ChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.xxs};
`;

const TopRow = styled.div`
  display: flex;
  gap: ${spacing.xs};
  align-items: center;
`;

const GroupHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: ${colors.bg.elevated};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  cursor: pointer;
  color: ${colors.text.secondary};
  font-size: ${typography.size.xs};
  font-weight: ${typography.weight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: ${spacing.xs} ${spacing.sm};
  transition: all ${transitions.fast};
  &:hover { color: ${colors.text.primary}; border-color: ${colors.border.light}; }
  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const GroupHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
`;

const GroupCount = styled.span`
  background: ${colors.accent.muted};
  color: ${colors.accent.primary};
  border-radius: 10px;
  padding: 1px 6px;
  font-size: ${typography.size.xs};
  font-weight: ${typography.weight.semibold};
`;

const TechGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0 ${spacing.xs};
  padding: ${spacing.xs} 0;
`;

const TechBtn = styled.button<{ checked: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px ${spacing.xs};
  border: 1px solid ${({ checked }) => checked ? colors.accent.primary : colors.border.default};
  border-radius: 6px;
  background: ${({ checked }) => checked ? colors.accent.muted : 'transparent'};
  color: ${({ checked }) => checked ? colors.accent.primary : colors.text.secondary};
  font-size: ${typography.size.sm};
  cursor: pointer;
  transition: all ${transitions.fast};
  margin-bottom: 4px;
  &:hover {
    border-color: ${colors.accent.primary};
    color: ${colors.accent.primary};
    background: ${colors.accent.muted};
  }
  svg { width: 12px; height: 12px; }
`;

const SubTechBox = styled.div`
  background: ${colors.bg.elevated};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  padding: ${spacing.sm};
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs};
`;

const SubLabel = styled.span`
  font-size: ${typography.size.xs};
  font-weight: ${typography.weight.semibold};
  color: ${colors.accent.primary};
`;

const SubTechGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0 ${spacing.xs};
`;

const AddRow = styled.div`
  display: flex;
  gap: ${spacing.xs};
  align-items: center;
`;

const GroupBody = styled.div`
  padding: ${spacing.xs} ${spacing.sm} ${spacing.sm};
  border: 1px solid ${colors.border.default};
  border-top: none;
  border-radius: 0 0 8px 8px;
  margin-top: -1px;
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

export default function TechSelector({ selected, onChange }: Props) {
  const { state, updateSchema } = useApp();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(
    () => Object.fromEntries(GROUP_ORDER.map((g) => [g, true]))
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
    const techsByGroup: Record<string, typeof state.schema.technologies> = {};
    state.schema.technologies.forEach((t) => {
      if (!techsByGroup[t.group]) techsByGroup[t.group] = [];
      if (!search || t.name.toLowerCase().includes(search.toLowerCase())) {
        techsByGroup[t.group].push(t);
      }
    });
    return techsByGroup;
  }, [state.schema.technologies, search]);

  const effectiveCollapsed = useMemo(() => {
    if (!search) return collapsed;
    const result: Record<string, boolean> = {};
    GROUP_ORDER.forEach((g) => {
      result[g] = !(grouped[g]?.length > 0);
    });
    return result;
  }, [search, grouped, collapsed]);

  const isSelected = (name: string) => selected.some((s) => s.tech === name);

  const toggleTech = (name: string) => {
    if (isSelected(name)) {
      onChange(selected.filter((s) => s.tech !== name));
    } else {
      onChange([...selected, { tech: name, subTechs: [] }]);
    }
  };

  const toggleSub = (techName: string, sub: string) => {
    onChange(
      selected.map((s) => {
        if (s.tech !== techName) return s;
        const has = s.subTechs.includes(sub);
        return { ...s, subTechs: has ? s.subTechs.filter((x) => x !== sub) : [...s.subTechs, sub] };
      })
    );
  };

  const clearAll = () => onChange([]);

  const doAddSub = async (techName: string, name: string) => {
    const updatedTechs = state.schema.technologies.map((t) =>
      t.name === techName && !t.subTechs.includes(name)
        ? { ...t, subTechs: [...t.subTechs, name] }
        : t
    );
    await updateSchema({ ...state.schema, technologies: updatedTechs });
    toggleSub(techName, name);
    setNewSub('');
    setAddingSub(null);
  };

  const handleAddSub = async (techName: string) => {
    const formatted = capitalize(newSub.trim());
    if (!formatted) return;
    const schemaTech = state.schema.technologies.find((t) => t.name === techName);
    if (!schemaTech) return;
    const existing = schemaTech.subTechs.find((s) => s.toLowerCase() === formatted.toLowerCase());
    if (existing) {
      setDupSubAlert(`"${existing}" already exists`);
      return;
    }
    setDupSubAlert('');
    const similar = findSimilar(formatted, schemaTech.subTechs);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarMatch({ input: formatted, match: similar, techName });
      return;
    }
    doAddSub(techName, formatted);
  };

  const doAddTech = async (group: string, name: string) => {
    if (state.schema.technologies.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    const updated = [...state.schema.technologies, { name, group, subTechs: [] }];
    await updateSchema({ ...state.schema, technologies: updated });
    onChange([...selected, { tech: name, subTechs: [] }]);
    setNewTech('');
    setAddingTech(null);
  };

  const handleAddTech = async (group: string) => {
    const formatted = capitalize(newTech.trim());
    if (!formatted) return;
    const existing = state.schema.technologies.find((t) => t.name.toLowerCase() === formatted.toLowerCase());
    if (existing) {
      setDupTechAlert(`"${existing.name}" already exists`);
      return;
    }
    setDupTechAlert('');
    const techNames = state.schema.technologies.filter((t) => t.group === group).map((t) => t.name);
    const similar = findSimilar(formatted, techNames);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarTech({ input: formatted, match: similar, group });
      return;
    }
    doAddTech(group, formatted);
  };

  const toggleGroup = (g: string) => {
    if (search) return;
    setCollapsed((prev) => ({ ...prev, [g]: !prev[g] }));
  };

  return (
    <Section>
      <Modal
        open={!!similarMatch}
        onClose={() => setSimilarMatch(null)}
        title="Similar sub-tech found"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              if (similarMatch) toggleSub(similarMatch.techName, similarMatch.match);
              setSimilarMatch(null); setNewSub(''); setAddingSub(null);
            }}>
              Use "{similarMatch?.match}"
            </Button>
            <Button onClick={() => {
              if (similarMatch) doAddSub(similarMatch.techName, similarMatch.input);
              setSimilarMatch(null);
            }}>
              Create "{similarMatch?.input}" anyway
            </Button>
          </>
        }
      >
        <SimilarText>
          You're adding <SimilarName>"{similarMatch?.input}"</SimilarName>, but a similar sub-tech already exists: <SimilarName>"{similarMatch?.match}"</SimilarName>
          <br />Do you want to use the existing one or create a new one?
        </SimilarText>
      </Modal>

      <Modal
        open={!!similarTech}
        onClose={() => setSimilarTech(null)}
        title="Similar technology found"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              if (similarTech && !isSelected(similarTech.match)) toggleTech(similarTech.match);
              setSimilarTech(null); setNewTech(''); setAddingTech(null);
            }}>
              Use "{similarTech?.match}"
            </Button>
            <Button onClick={() => {
              if (similarTech) doAddTech(similarTech.group, similarTech.input);
              setSimilarTech(null);
            }}>
              Create "{similarTech?.input}" anyway
            </Button>
          </>
        }
      >
        <SimilarText>
          You're adding <SimilarName>"{similarTech?.input}"</SimilarName>, but a similar technology already exists: <SimilarName>"{similarTech?.match}"</SimilarName>
          <br />Do you want to use the existing one or create a new one?
        </SimilarText>
      </Modal>

      <TopRow>
        <SearchInput value={search} onChange={setSearch} placeholder="Search technologies..." />
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} type="button">Clear</Button>
        )}
      </TopRow>

      {selected.length > 0 && (
        <ChipsRow>
          {selected.map((s) => (
            <Chip key={s.tech} label={s.tech} onRemove={() => toggleTech(s.tech)} />
          ))}
        </ChipsRow>
      )}

      {GROUP_ORDER.map((group) => {
        const techs = grouped[group];
        const isCollapsed = effectiveCollapsed[group];
        const selectedCount = techs?.filter((t) => isSelected(t.name)).length ?? 0;

        return (
          <div key={group}>
            <GroupHeader onClick={() => toggleGroup(group)} type="button">
              <GroupHeaderLeft>
                {isCollapsed ? <ChevronRight /> : <ChevronDown />}
                {GROUP_LABELS[group] ?? group}
                {selectedCount > 0 && <GroupCount>{selectedCount} selected</GroupCount>}
              </GroupHeaderLeft>
              {techs?.length !== undefined && (
                <span style={{ fontSize: typography.size.xs, color: colors.text.tertiary }}>
                  {techs.length} {search ? 'results' : 'items'}
                </span>
              )}
            </GroupHeader>

            {!isCollapsed && (
              <GroupBody>
                {(techs?.length ?? 0) === 0 ? (
                  <span style={{ fontSize: typography.size.sm, color: colors.text.tertiary }}>No results</span>
                ) : (
                  <TechGrid>
                    {techs!.map((t) => (
                      <TechBtn
                        key={t.name}
                        checked={isSelected(t.name)}
                        onClick={() => toggleTech(t.name)}
                        type="button"
                      >
                        {isSelected(t.name) && <Check />}
                        {t.name}
                      </TechBtn>
                    ))}
                  </TechGrid>
                )}

                {addingTech === group ? (
                  <>
                    <AddRow>
                      <Input
                        value={newTech}
                        onChange={(e) => { setNewTech(e.target.value); setDupTechAlert(''); }}
                        placeholder={`Add technology to ${GROUP_LABELS[group] ?? group}...`}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTech(group)}
                        autoFocus
                        style={{ flex: 1, height: '30px', fontSize: typography.size.sm }}
                      />
                      <Button size="sm" onClick={() => handleAddTech(group)} type="button">Add</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setAddingTech(null); setNewTech(''); setDupTechAlert(''); }} type="button">
                        <X />
                      </Button>
                    </AddRow>
                    {dupTechAlert && <DuplicateAlert>{dupTechAlert}</DuplicateAlert>}
                  </>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setAddingTech(group)} type="button" style={{ marginTop: spacing.xs }}>
                    <Plus /> Add to {GROUP_LABELS[group] ?? group}
                  </Button>
                )}
              </GroupBody>
            )}
          </div>
        );
      })}

      {selected.map((sel) => {
        const schemaTech = state.schema.technologies.find((t) => t.name === sel.tech);
        if (!schemaTech) return null;

        return (
          <SubTechBox key={sel.tech}>
            <SubLabel>Sub-techs: {sel.tech}</SubLabel>
            {schemaTech.subTechs.length > 0 ? (
              <SubTechGrid>
                {schemaTech.subTechs.map((sub) => (
                  <TechBtn
                    key={sub}
                    checked={sel.subTechs.includes(sub)}
                    onClick={() => toggleSub(sel.tech, sub)}
                    type="button"
                  >
                    {sel.subTechs.includes(sub) && <Check />}
                    {sub}
                  </TechBtn>
                ))}
              </SubTechGrid>
            ) : (
              <span style={{ fontSize: typography.size.sm, color: colors.text.tertiary }}>
                No sub-technologies defined yet
              </span>
            )}
            {addingSub === sel.tech ? (
              <>
                <AddRow>
                  <Input
                    value={newSub}
                    onChange={(e) => { setNewSub(e.target.value); setDupSubAlert(''); }}
                    placeholder={`Add sub-tech for ${sel.tech}...`}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSub(sel.tech)}
                    autoFocus
                    style={{ flex: 1, height: '30px', fontSize: typography.size.sm }}
                  />
                  <Button size="sm" onClick={() => handleAddSub(sel.tech)} type="button">Add</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setAddingSub(null); setNewSub(''); setDupSubAlert(''); }} type="button">
                    <X />
                  </Button>
                </AddRow>
                {dupSubAlert && <DuplicateAlert>{dupSubAlert}</DuplicateAlert>}
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setAddingSub(sel.tech)} type="button">
                <Plus /> Add sub-tech
              </Button>
            )}
          </SubTechBox>
        );
      })}
    </Section>
  );
}
