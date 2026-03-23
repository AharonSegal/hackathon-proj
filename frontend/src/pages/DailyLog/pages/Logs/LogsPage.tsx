/**
 * pages/DailyLog/pages/Logs/LogsPage.tsx
 * -----------------------------------------
 * Full list of all worklog entries with search, date filtering, and inline
 * edit / delete functionality.
 *
 * Purpose: lets the user review, update, or remove past log entries.
 *
 * Features:
 * - Full-text search across title and description
 * - Date range filter (start date / end date)
 * - Project filter dropdown
 * - Inline expand to see full entry details
 * - Inline edit modal (reuses LogEntry sub-components)
 * - Delete with confirmation via useToast
 * - Sorted newest-first; results count shown in header
 *
 * Data: reads from AppContext state (already loaded on mount).
 * Mutations go through AppContext.updateEntry / deleteEntry → REST API.
 */

import { useState, useMemo } from 'react';
import styled from '@emotion/styled';
import { Trash2, Pencil, ChevronDown, ChevronUp, Users, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import useToast from '../../hooks/useToast';
import type { Entry, TaskFormState, TechSelection } from '../../utils/types';
import { Card, CardHeader, CardTitle, Button, Input, TextArea, InputLabel, Modal, Toast, SearchInput, EmptyState, Chip, Toggle } from '../../ui';
import { colors, spacing, typography, transitions } from '../../theme';
import { formatDate, isInDateRange, generateId } from '../../utils/helpers';
import CategoryPicker from '../LogEntry/components/CategoryPicker';
import TechSelector from '../LogEntry/components/TechSelector';
import LanguagePicker from '../LogEntry/components/LanguagePicker';

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.xs};
  margin-bottom: ${spacing.lg};
  padding: ${spacing.md};
  background: ${colors.bg.tertiary};
  border: 1px solid ${colors.border.default};
  border-radius: 12px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xxs};
  min-width: 140px;
  flex: 1;
`;

const FilterLabel = styled.span`
  font-size: ${typography.size.xs};
  font-weight: ${typography.weight.semibold};
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StyledSelect = styled.select`
  background: ${colors.bg.secondary};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  color: ${colors.text.primary};
  padding: ${spacing.xs} ${spacing.sm};
  font-size: ${typography.size.sm};
  height: 36px;
  cursor: pointer;
  &:focus { outline: 2px solid ${colors.accent.primary}; }
`;

const ResultCount = styled.span`
  font-size: ${typography.size.sm};
  color: ${colors.text.tertiary};
  margin-bottom: ${spacing.sm};
  display: block;
`;

const EntryCard = styled.div`
  background: ${colors.bg.secondary};
  border: 1px solid ${colors.border.default};
  border-radius: 12px;
  padding: ${spacing.md};
  margin-bottom: ${spacing.sm};
  transition: border-color ${transitions.fast};
  &:hover { border-color: ${colors.border.light}; }
`;

const EntryTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${spacing.sm};
`;

const EntryMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${spacing.xs};
  margin-bottom: ${spacing.xs};
`;

const EntryDate = styled.span`
  font-size: ${typography.size.sm};
  color: ${colors.text.tertiary};
`;

const DayBadge = styled.span`
  background: ${colors.accent.muted};
  color: ${colors.accent.primary};
  padding: 1px ${spacing.xs};
  border-radius: 6px;
  font-size: ${typography.size.xs};
  font-weight: ${typography.weight.semibold};
`;

const ProjectBadge = styled.span`
  background: ${colors.bg.elevated};
  color: ${colors.text.primary};
  padding: 2px ${spacing.sm};
  border-radius: 6px;
  font-size: ${typography.size.xs};
  font-weight: ${typography.weight.medium};
  border: 1px solid ${colors.border.default};
`;

const EntryTitle = styled.h3`
  font-size: ${typography.size.md};
  font-weight: ${typography.weight.semibold};
  color: ${colors.text.primary};
  margin-bottom: ${spacing.xxs};
`;

const EntryDesc = styled.p`
  font-size: ${typography.size.sm};
  color: ${colors.text.secondary};
  margin-bottom: ${spacing.xs};
  line-height: 1.5;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.xxs};
  margin-top: ${spacing.xs};
`;

const Tag = styled.span<{ variant?: 'cat' | 'tech' | 'lang' }>`
  font-size: ${typography.size.xs};
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: ${typography.weight.medium};
  background: ${({ variant }) =>
    variant === 'cat' ? colors.bg.elevated :
    variant === 'lang' ? `${colors.accent.primary}22` :
    `${colors.accent.primary}11`};
  color: ${({ variant }) =>
    variant === 'lang' ? colors.accent.primary : colors.text.secondary};
  border: 1px solid ${({ variant }) =>
    variant === 'lang' ? `${colors.accent.primary}44` : colors.border.default};
`;

const TeamBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: ${typography.size.xs};
  color: ${colors.text.tertiary};
  svg { width: 12px; height: 12px; }
`;

const ActionRow = styled.div`
  display: flex;
  gap: ${spacing.xs};
  flex-shrink: 0;
`;

const ExpandBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${colors.text.tertiary};
  font-size: ${typography.size.xs};
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px ${spacing.xs};
  border-radius: 6px;
  transition: color ${transitions.fast};
  &:hover { color: ${colors.text.primary}; background: ${colors.bg.hover}; }
  svg { width: 14px; height: 14px; }
`;

const ExpandedContent = styled.div`
  margin-top: ${spacing.sm};
  padding-top: ${spacing.sm};
  border-top: 1px solid ${colors.border.default};
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs};
`;

const SubLabel = styled.span`
  font-size: ${typography.size.xs};
  font-weight: ${typography.weight.semibold};
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const teamOptions = [
  { value: 'solo', label: 'Solo' },
  { value: 'team', label: 'Team' },
];

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xxs }}>
        <InputLabel>Categories</InputLabel>
        <CategoryPicker selected={categories} onChange={setCategories} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xxs }}>
        <InputLabel required>Title</InputLabel>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setTitleError(''); }}
          placeholder="What did you work on?"
          hasError={!!titleError}
        />
        {titleError && <span style={{ color: colors.danger.primary, fontSize: typography.size.xs }}>{titleError}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xxs }}>
        <InputLabel>Coding Languages</InputLabel>
        <LanguagePicker selected={codingLanguages} onChange={setCodingLanguages} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xxs }}>
        <InputLabel>Technologies</InputLabel>
        <TechSelector selected={technologies} onChange={setTechnologies} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xxs }}>
        <InputLabel>Team type</InputLabel>
        <Toggle
          options={teamOptions}
          value={teamType}
          onChange={(val) => setTeamType(val as 'solo' | 'team')}
        />
      </div>
      {teamType === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xxs }}>
          <InputLabel>Team size</InputLabel>
          <Input
            type="number"
            min={2}
            max={500}
            value={teamSize ?? ''}
            onChange={(e) => setTeamSize(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Number of people..."
            style={{ maxWidth: 160 }}
          />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xxs }}>
        <InputLabel>Description</InputLabel>
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details..."
          rows={3}
        />
      </div>
      <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end', paddingTop: spacing.sm }}>
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button onClick={handleSave} type="button">Save Changes</Button>
      </div>
    </div>
  );
}

function EntryRowItem({ entry, onEdit, onDelete }: { entry: Entry; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasTechs = entry.technologies?.length > 0;
  const hasSubs = entry.technologies?.some((t) => t.subTechs?.length > 0);

  return (
    <EntryCard>
      <EntryTop>
        <div style={{ flex: 1, minWidth: 0 }}>
          <EntryMeta>
            <EntryDate>{formatDate(entry.date)}</EntryDate>
            <DayBadge>Day #{entry.dayNumber}</DayBadge>
            <ProjectBadge>{entry.project}</ProjectBadge>
            <TeamBadge>
              {entry.teamType === 'team' ? <Users /> : <User />}
              {entry.teamType === 'team'
                ? entry.teamSize ? `Team (${entry.teamSize})` : 'Team'
                : 'Solo'}
            </TeamBadge>
          </EntryMeta>
          <EntryTitle>{entry.title}</EntryTitle>
          {entry.description && <EntryDesc>{entry.description}</EntryDesc>}
          <TagRow>
            {(entry.codingLanguages || []).map((l) => (
              <Tag key={l} variant="lang">{l}</Tag>
            ))}
            {(entry.categories || []).map((c) => (
              <Tag key={c} variant="cat">{c}</Tag>
            ))}
            {(entry.technologies || []).map((t) => (
              <Tag key={t.tech} variant="tech">{t.tech}</Tag>
            ))}
          </TagRow>
          {(hasTechs && hasSubs) && (
            <ExpandBtn onClick={() => setExpanded(!expanded)} type="button" style={{ marginTop: spacing.xs }}>
              {expanded ? <ChevronUp /> : <ChevronDown />}
              {expanded ? 'Hide details' : 'Show sub-techs'}
            </ExpandBtn>
          )}
          {expanded && (
            <ExpandedContent>
              {entry.technologies.filter((t) => t.subTechs?.length > 0).map((t) => (
                <div key={t.tech}>
                  <SubLabel>{t.tech}</SubLabel>
                  <TagRow>
                    {t.subTechs.map((s) => (
                      <Tag key={s}>{s}</Tag>
                    ))}
                  </TagRow>
                </div>
              ))}
            </ExpandedContent>
          )}
        </div>
        <ActionRow>
          <Button variant="ghost" size="sm" onClick={onEdit} type="button" iconOnly title="Edit">
            <Pencil size={14} />
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete} type="button" iconOnly title="Delete">
            <Trash2 size={14} />
          </Button>
        </ActionRow>
      </EntryTop>
    </EntryCard>
  );
}

export default function LogsPage() {
  const { state, updateEntry, deleteEntry } = useApp();
  const { toasts, addToast, removeToast } = useToast();

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
        const inTitle = e.title.toLowerCase().includes(q);
        const inDesc = (e.description || '').toLowerCase().includes(q);
        const inTech = (e.technologies || []).some((t) => t.tech.toLowerCase().includes(q));
        const inLang = (e.codingLanguages || []).some((l) => l.toLowerCase().includes(q));
        const inCat = (e.categories || []).some((c) => c.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTech && !inLang && !inCat) return false;
      }
      return true;
    });
    result = result.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return sortOrder === 'desc' ? -d : d;
    });
    return result;
  }, [state.entries, search, dateRange, projectFilter, categoryFilter, teamFilter, sortOrder]);

  const handleSaveEdit = async (updated: Entry) => {
    await updateEntry(updated);
    setEditingEntry(null);
    addToast('success', 'Entry updated');
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;
    await deleteEntry(deletingEntry.id);
    setDeletingEntry(null);
    addToast('success', 'Entry deleted');
  };

  return (
    <div>
      <Toast toasts={toasts} removeToast={removeToast} />

      <Modal
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Edit Entry"
      >
        {editingEntry && (
          <EditForm
            entry={editingEntry}
            onSave={handleSaveEdit}
            onCancel={() => setEditingEntry(null)}
          />
        )}
      </Modal>

      <Modal
        open={!!deletingEntry}
        onClose={() => setDeletingEntry(null)}
        title="Delete Entry"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingEntry(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p style={{ color: colors.text.secondary }}>
          Are you sure you want to delete <strong style={{ color: colors.text.primary }}>"{deletingEntry?.title}"</strong>? This cannot be undone.
        </p>
      </Modal>

      <FilterBar>
        <FilterGroup style={{ minWidth: 200, flex: 2 }}>
          <FilterLabel>Search</FilterLabel>
          <SearchInput value={search} onChange={setSearch} placeholder="Title, tech, category..." />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>Date range</FilterLabel>
          <StyledSelect value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="all">All time</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </StyledSelect>
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>Project</FilterLabel>
          <StyledSelect value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">All projects</option>
            {allProjects.map((p) => <option key={p} value={p}>{p}</option>)}
          </StyledSelect>
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>Category</FilterLabel>
          <StyledSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </StyledSelect>
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>Team</FilterLabel>
          <StyledSelect value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="solo">Solo</option>
            <option value="team">Team</option>
          </StyledSelect>
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>Sort</FilterLabel>
          <StyledSelect value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}>
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </StyledSelect>
        </FilterGroup>
      </FilterBar>

      <ResultCount>{filtered.length} of {state.entries.length} entries</ResultCount>

      {filtered.length === 0 ? (
        <EmptyState
          title={state.entries.length === 0 ? 'No entries yet' : 'No matching entries'}
          description={state.entries.length === 0 ? 'Submit your first day log to see it here.' : 'Try adjusting your filters.'}
        />
      ) : (
        filtered.map((entry) => (
          <EntryRowItem
            key={entry.id}
            entry={entry}
            onEdit={() => setEditingEntry(entry)}
            onDelete={() => setDeletingEntry(entry)}
          />
        ))
      )}
    </div>
  );
}
