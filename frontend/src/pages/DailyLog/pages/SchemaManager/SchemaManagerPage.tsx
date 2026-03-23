/**
 * pages/DailyLog/pages/SchemaManager/SchemaManagerPage.tsx
 * ----------------------------------------------------------
 * Settings page for customising the Daily Log schema — the set of projects,
 * categories, and technologies that appear in the log entry form.
 *
 * Purpose: lets the user add / remove / reorder projects, categories, and
 * technology entries without needing to edit code.
 *
 * Sections:
 * - Projects      — add/remove project names; optionally attach project info
 *                   (description, tags, team info) via ProjectInfo cards
 * - Categories    — add/remove category labels
 * - Technologies  — add/remove technology entries grouped by tech group;
 *                   each tech can have sub-technologies
 *
 * Features:
 * - Fuzzy duplicate detection via findSimilar() (warns before adding)
 * - Danger zone: "Reset to Defaults" restores the bundled defaultSchema
 * - Danger zone: "Clear All Data" wipes all worklog_entries from the DB
 * - All changes are persisted immediately via AppContext.updateSchema()
 * - Bulk JSON import/export of the entire schema
 */

import { useState } from 'react';
import styled from '@emotion/styled';
import { Plus, Trash2, AlertTriangle, FileText, X, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import useToast from '../../hooks/useToast';
import defaultSchema, { GROUP_LABELS, GROUP_ORDER } from '../../utils/defaultSchema';
import { Card, CardHeader, CardTitle, Button, Input, TextArea, InputLabel, Chip, Modal, Toast, SearchInput, Toggle } from '../../ui';
import { colors, spacing, typography, transitions } from '../../theme';
import { capitalize, findSimilar } from '../../utils/helpers';
import type { ProjectInfo } from '../../utils/types';

const Section = styled.div`
  margin-bottom: ${spacing.lg};
`;

const ListItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacing.xs} ${spacing.sm};
  border-radius: 6px;
  transition: background ${transitions.fast};
  &:hover { background: ${colors.bg.hover}; }
`;

const ItemLabel = styled.span`
  font-size: ${typography.size.md};
  color: ${colors.text.primary};
`;

const RemBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: ${colors.text.tertiary};
  cursor: pointer;
  border-radius: 6px;
  transition: all ${transitions.fast};
  &:hover { background: ${colors.danger.muted}; color: ${colors.danger.primary}; }
  svg { width: 14px; height: 14px; }
`;

const AddRow = styled.div`
  display: flex;
  gap: ${spacing.xs};
  align-items: center;
  margin-top: ${spacing.sm};
`;

const GroupLabel = styled.h4`
  font-size: ${typography.size.xs};
  font-weight: ${typography.weight.semibold};
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: ${spacing.md} 0 ${spacing.xs};
`;

const TechCard = styled.div`
  background: ${colors.bg.elevated};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  padding: ${spacing.sm} ${spacing.md};
  margin-bottom: ${spacing.xs};
  transition: all ${transitions.normal};
  &:hover { border-color: ${colors.border.light}; }
`;

const TechHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${spacing.xs};
`;

const SubTechRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.xxs};
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

const DangerZone = styled.div`
  border: 1px solid ${colors.danger.primary}40;
  border-radius: 12px;
  padding: ${spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm};
`;

const PiFormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xxs};
`;

const TechPickerWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs};
`;

const TechPickerList = styled.div`
  background: ${colors.bg.elevated};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  max-height: 180px;
  overflow-y: auto;
  padding: ${spacing.xs};
`;

const TechPickerItem = styled.button<{ selected: boolean }>`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
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
  svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

const ChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.xxs};
`;

const InfoBadge = styled.span`
  font-size: ${typography.size.xs};
  color: ${colors.accent.primary};
  background: ${colors.accent.muted};
  border-radius: 10px;
  padding: 1px 7px;
  font-weight: ${typography.weight.medium};
  margin-left: ${spacing.xs};
`;

export default function SchemaManagerPage() {
  const { state, updateSchema, clearData } = useApp();
  const { toasts, addToast, removeToast } = useToast();
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

  const [confirmModal, setConfirmModal] = useState<{ type: string; name?: string } | null>(null);
  const [similarModal, setSimilarModal] = useState<{ type: 'project' | 'category' | 'tech' | 'subTech'; input: string; match: string; techName?: string } | null>(null);
  const [dupAlert, setDupAlert] = useState('');

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
    addToast('success', `Project info saved for "${projectInfoModal}"`);
    setProjectInfoModal(null);
  };

  const allTechNames = schema.technologies.map((t) => t.name).sort();
  const filteredPiTechs = piTechSearch
    ? allTechNames.filter((n) => n.toLowerCase().includes(piTechSearch.toLowerCase()))
    : allTechNames;

  const togglePiTech = (name: string) => {
    setPiTechStack((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const doAddProject = (name: string) => {
    updateSchema({ ...schema, projects: [...schema.projects, name] });
    setNewProject('');
    setAddingProject(false);
    addToast('success', `Project "${name}" added`);
  };

  const addProject = () => {
    const formatted = capitalize(newProject.trim());
    if (!formatted) return;
    const existing = schema.projects.find((p) => p.toLowerCase() === formatted.toLowerCase());
    if (existing) { setDupAlert(`"${existing}" already exists`); return; }
    setDupAlert('');
    const similar = findSimilar(formatted, schema.projects);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarModal({ type: 'project', input: formatted, match: similar });
      return;
    }
    doAddProject(formatted);
  };

  const removeProject = (name: string) => {
    updateSchema({ ...schema, projects: schema.projects.filter((p) => p !== name) });
    addToast('success', `Project "${name}" removed`);
    setConfirmModal(null);
  };

  const doAddCategory = (name: string) => {
    updateSchema({ ...schema, categories: [...schema.categories, name] });
    setNewCat('');
    setAddingCat(false);
    addToast('success', `Category "${name}" added`);
  };

  const addCategory = () => {
    const formatted = capitalize(newCat.trim());
    if (!formatted) return;
    const existing = schema.categories.find((c) => c.toLowerCase() === formatted.toLowerCase());
    if (existing) { setDupAlert(`"${existing}" already exists`); return; }
    setDupAlert('');
    const similar = findSimilar(formatted, schema.categories);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarModal({ type: 'category', input: formatted, match: similar });
      return;
    }
    doAddCategory(formatted);
  };

  const removeCategory = (name: string) => {
    updateSchema({ ...schema, categories: schema.categories.filter((c) => c !== name) });
    addToast('success', `Category "${name}" removed`);
    setConfirmModal(null);
  };

  const doAddTech = (name: string) => {
    updateSchema({ ...schema, technologies: [...schema.technologies, { name, group: newTechGroup, subTechs: [] }] });
    setNewTechName('');
    setAddingTech(false);
    addToast('success', `Technology "${name}" added`);
  };

  const addTech = () => {
    const formatted = capitalize(newTechName.trim());
    if (!formatted) return;
    const existing = schema.technologies.find((x) => x.name.toLowerCase() === formatted.toLowerCase());
    if (existing) { setDupAlert(`"${existing.name}" already exists`); return; }
    setDupAlert('');
    const techNames = schema.technologies.map((t) => t.name);
    const similar = findSimilar(formatted, techNames);
    if (similar && similar.toLowerCase() !== formatted.toLowerCase()) {
      setSimilarModal({ type: 'tech', input: formatted, match: similar });
      return;
    }
    doAddTech(formatted);
  };

  const removeTech = (name: string) => {
    updateSchema({ ...schema, technologies: schema.technologies.filter((t) => t.name !== name) });
    addToast('success', `Technology "${name}" removed`);
    setConfirmModal(null);
  };

  const doAddSubTech = (techName: string, name: string) => {
    updateSchema({
      ...schema,
      technologies: schema.technologies.map((tech) =>
        tech.name === techName ? { ...tech, subTechs: [...tech.subTechs, name] } : tech
      ),
    });
    setNewSub('');
    setAddingSubFor(null);
    addToast('success', `Sub-tech "${name}" added to ${techName}`);
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
      setSimilarModal({ type: 'subTech', input: formatted, match: similar, techName });
      return;
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

  return (
    <div>
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Project Info Modal */}
      <Modal
        open={!!projectInfoModal}
        onClose={() => setProjectInfoModal(null)}
        title={`Project info — ${projectInfoModal}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <PiFormField>
            <InputLabel>Title</InputLabel>
            <Input value={piTitle} onChange={(e) => setPiTitle(e.target.value)} placeholder="Short project title..." />
          </PiFormField>
          <PiFormField>
            <InputLabel>Tech stack</InputLabel>
            <TechPickerWrap>
              {piTechStack.length > 0 && (
                <ChipsRow>
                  {piTechStack.map((t) => (
                    <Chip key={t} label={t} onRemove={() => togglePiTech(t)} />
                  ))}
                </ChipsRow>
              )}
              <SearchInput value={piTechSearch} onChange={setPiTechSearch} placeholder="Search all technologies..." />
              <TechPickerList>
                {filteredPiTechs.map((name) => (
                  <TechPickerItem key={name} selected={piTechStack.includes(name)} onClick={() => togglePiTech(name)} type="button">
                    {piTechStack.includes(name) && <Check />}
                    {name}
                  </TechPickerItem>
                ))}
              </TechPickerList>
            </TechPickerWrap>
          </PiFormField>
          <PiFormField>
            <InputLabel>Team</InputLabel>
            <Toggle
              options={[{ value: 'solo', label: 'Solo' }, { value: 'team', label: 'Team' }]}
              value={piTeamType}
              onChange={(val) => setPiTeamType(val as 'solo' | 'team')}
            />
          </PiFormField>
          {piTeamType === 'team' && (
            <PiFormField>
              <InputLabel>Team size</InputLabel>
              <Input
                type="number" min={2} max={500}
                value={piTeamSize ?? ''}
                onChange={(e) => setPiTeamSize(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Number of people..."
                style={{ maxWidth: 160 }}
              />
            </PiFormField>
          )}
          <PiFormField>
            <InputLabel>Description</InputLabel>
            <TextArea value={piDescription} onChange={(e) => setPiDescription(e.target.value)} placeholder="Short summary of the project..." rows={3} />
          </PiFormField>
          <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end', paddingTop: spacing.xs }}>
            <Button variant="ghost" onClick={() => setProjectInfoModal(null)} type="button">Cancel</Button>
            <Button onClick={saveProjectInfo} type="button">Save</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title="Confirm Deletion"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmModal(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!confirmModal) return;
                if (confirmModal.type === 'project') removeProject(confirmModal.name!);
                else if (confirmModal.type === 'category') removeCategory(confirmModal.name!);
                else if (confirmModal.type === 'tech') removeTech(confirmModal.name!);
                else if (confirmModal.type === 'resetData') { clearData(); addToast('success', 'All data cleared'); setConfirmModal(null); }
                else if (confirmModal.type === 'resetSchema') { updateSchema(defaultSchema); addToast('success', 'Schema reset to defaults'); setConfirmModal(null); }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p style={{ color: colors.text.secondary }}>
          {confirmModal?.type === 'resetData' && 'This will delete all entries and preferences. Schema will be kept. This cannot be undone.'}
          {confirmModal?.type === 'resetSchema' && 'This will reset the schema to defaults. All custom projects, categories, and technologies will be lost.'}
          {confirmModal?.name && `Are you sure you want to remove "${confirmModal.name}"?`}
          {confirmModal?.name && (
            (confirmModal.type === 'project' && projectInUse(confirmModal.name)) ||
            (confirmModal.type === 'category' && categoryInUse(confirmModal.name)) ||
            (confirmModal.type === 'tech' && techInUse(confirmModal.name))
          ) && (
            <span style={{ display: 'block', marginTop: spacing.xs, color: colors.warning.text }}>
              <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              This item is used in existing entries.
            </span>
          )}
        </p>
      </Modal>

      {/* Similar item modal */}
      <Modal
        open={!!similarModal}
        onClose={() => setSimilarModal(null)}
        title={`Similar ${similarModal?.type === 'subTech' ? 'sub-tech' : similarModal?.type} found`}
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setSimilarModal(null);
              setNewProject(''); setNewCat(''); setNewTechName(''); setNewSub('');
              setAddingProject(false); setAddingCat(false); setAddingTech(false); setAddingSubFor(null);
            }}>
              Use "{similarModal?.match}"
            </Button>
            <Button onClick={() => {
              if (!similarModal) return;
              if (similarModal.type === 'project') doAddProject(similarModal.input);
              else if (similarModal.type === 'category') doAddCategory(similarModal.input);
              else if (similarModal.type === 'tech') doAddTech(similarModal.input);
              else if (similarModal.type === 'subTech' && similarModal.techName) doAddSubTech(similarModal.techName, similarModal.input);
              setSimilarModal(null);
            }}>
              Create "{similarModal?.input}" anyway
            </Button>
          </>
        }
      >
        <p style={{ color: colors.text.secondary, fontSize: typography.size.md, lineHeight: 1.6 }}>
          You're adding <span style={{ color: colors.accent.primary, fontWeight: typography.weight.semibold }}>"{similarModal?.input}"</span>, but a similar item already exists: <span style={{ color: colors.accent.primary, fontWeight: typography.weight.semibold }}>"{similarModal?.match}"</span>
          <br />Do you want to use the existing one or create a new one?
        </p>
      </Modal>

      {/* Projects */}
      <Section>
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <Button variant="secondary" size="sm" onClick={() => setAddingProject(!addingProject)} type="button">
              <Plus /> Add
            </Button>
          </CardHeader>
          {schema.projects.map((p) => (
            <ListItem key={p}>
              <ItemLabel>
                {p}
                {schema.projectInfos?.[p]?.title && (
                  <InfoBadge>{schema.projectInfos[p].title}</InfoBadge>
                )}
              </ItemLabel>
              <div style={{ display: 'flex', gap: spacing.xxs }}>
                <RemBtn onClick={() => openProjectInfo(p)} type="button" title="Edit project info" style={{ color: colors.accent.primary }}>
                  <FileText />
                </RemBtn>
                <RemBtn onClick={() => setConfirmModal({ type: 'project', name: p })} type="button"><Trash2 /></RemBtn>
              </div>
            </ListItem>
          ))}
          {addingProject && (
            <>
              <AddRow>
                <Input value={newProject} onChange={(e) => { setNewProject(e.target.value); setDupAlert(''); }} placeholder="Project name..." onKeyDown={(e) => e.key === 'Enter' && addProject()} autoFocus style={{ flex: 1 }} />
                <Button size="sm" onClick={addProject} type="button">Add</Button>
              </AddRow>
              {dupAlert && <DuplicateAlert>{dupAlert}</DuplicateAlert>}
            </>
          )}
        </Card>
      </Section>

      {/* Categories */}
      <Section>
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <Button variant="secondary" size="sm" onClick={() => setAddingCat(!addingCat)} type="button">
              <Plus /> Add
            </Button>
          </CardHeader>
          {schema.categories.map((c) => (
            <ListItem key={c}>
              <ItemLabel>{c}</ItemLabel>
              <RemBtn onClick={() => setConfirmModal({ type: 'category', name: c })} type="button"><Trash2 /></RemBtn>
            </ListItem>
          ))}
          {addingCat && (
            <>
              <AddRow>
                <Input value={newCat} onChange={(e) => { setNewCat(e.target.value); setDupAlert(''); }} placeholder="Category name..." onKeyDown={(e) => e.key === 'Enter' && addCategory()} autoFocus style={{ flex: 1 }} />
                <Button size="sm" onClick={addCategory} type="button">Add</Button>
              </AddRow>
              {dupAlert && <DuplicateAlert>{dupAlert}</DuplicateAlert>}
            </>
          )}
        </Card>
      </Section>

      {/* Technologies */}
      <Section>
        <Card>
          <CardHeader>
            <CardTitle>Technologies</CardTitle>
            <Button variant="secondary" size="sm" onClick={() => setAddingTech(!addingTech)} type="button">
              <Plus /> Add
            </Button>
          </CardHeader>
          <div style={{ marginBottom: spacing.md }}>
            <SearchInput value={techSearch} onChange={setTechSearch} placeholder="Filter technologies..." />
          </div>
          {GROUP_ORDER.map((group) => {
            const techs = techsByGroup[group];
            if (!techs?.length) return null;
            return (
              <div key={group}>
                <GroupLabel>{GROUP_LABELS[group]}</GroupLabel>
                {techs.map((tech) => (
                  <TechCard key={tech.name}>
                    <TechHeader>
                      <span style={{ fontWeight: typography.weight.medium, color: colors.text.primary }}>{tech.name}</span>
                      <RemBtn onClick={() => setConfirmModal({ type: 'tech', name: tech.name })} type="button"><Trash2 /></RemBtn>
                    </TechHeader>
                    <SubTechRow>
                      {tech.subTechs.map((sub) => (
                        <Chip key={sub} label={sub} onRemove={() => removeSubTech(tech.name, sub)} />
                      ))}
                    </SubTechRow>
                    {addingSubFor === tech.name ? (
                      <>
                        <AddRow>
                          <Input value={newSub} onChange={(e) => { setNewSub(e.target.value); setDupAlert(''); }} placeholder={`Add sub-tech for ${tech.name}...`} onKeyDown={(e) => e.key === 'Enter' && addSubTech(tech.name)} autoFocus style={{ flex: 1, height: '30px', fontSize: typography.size.sm }} />
                          <Button size="sm" onClick={() => addSubTech(tech.name)} type="button">Add</Button>
                        </AddRow>
                        {dupAlert && <DuplicateAlert>{dupAlert}</DuplicateAlert>}
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setAddingSubFor(tech.name)} type="button" style={{ marginTop: spacing.xs }}>
                        <Plus /> Add sub-tech
                      </Button>
                    )}
                  </TechCard>
                ))}
              </div>
            );
          })}
          {addingTech && (
            <>
              <AddRow style={{ marginTop: spacing.md }}>
                <Input value={newTechName} onChange={(e) => { setNewTechName(e.target.value); setDupAlert(''); }} placeholder="Tech name..." autoFocus style={{ flex: 1 }} />
                <select
                  value={newTechGroup}
                  onChange={(e) => setNewTechGroup(e.target.value)}
                  style={{
                    background: colors.bg.secondary, border: `1px solid ${colors.border.default}`,
                    borderRadius: '8px', color: colors.text.primary, padding: `${spacing.xs} ${spacing.sm}`,
                    fontSize: typography.size.sm, height: '40px',
                  }}
                >
                  {GROUP_ORDER.map((g) => <option key={g} value={g}>{GROUP_LABELS[g]}</option>)}
                </select>
                <Button size="sm" onClick={addTech} type="button">Add</Button>
              </AddRow>
              {dupAlert && <DuplicateAlert>{dupAlert}</DuplicateAlert>}
            </>
          )}
        </Card>
      </Section>

      {/* Danger Zone */}
      <Section>
        <DangerZone>
          <h3 style={{ color: colors.danger.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }}>
            Danger Zone
          </h3>
          <Button variant="danger" onClick={() => setConfirmModal({ type: 'resetData' })} type="button">
            <Trash2 /> Reset All Data
          </Button>
          <Button variant="danger" onClick={() => setConfirmModal({ type: 'resetSchema' })} type="button">
            <Trash2 /> Reset Schema to Defaults
          </Button>
        </DangerZone>
      </Section>
    </div>
  );
}
