/**
 * pages/DailyLog/pages/LogEntry/LogEntryPage.tsx
 * -------------------------------------------------
 * Main work log entry form — the default view shown when navigating to /daily-log.
 *
 * Purpose: lets the user record what they worked on for a given day, including
 * project, categories, description, technologies used, and team information.
 *
 * Components used:
 * - ProjectSelector    — dropdown populated from schema.projects
 * - CategoryPicker     — multi-select chips from schema.categories
 * - TechSelector       — grouped collapsible technology selector
 * - LanguagePicker     — quick-pick coding language badges
 *
 * Code Flow:
 * 1. useLogEntry() provides form state and submit/reset handlers
 * 2. On "Add Task" → appends a task card to the tasks array (multi-task support)
 * 3. On "Submit Day" → validates, calls addEntries() in AppContext → fires POST API
 * 4. Toast notifications for success/error via useToast()
 * 5. "Reset" clears all fields back to defaults
 */

import { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { Plus, Send, RotateCcw, Calendar, CheckCircle2 } from 'lucide-react';
import useLogEntry from '../../hooks/useLogEntry';
import useToast from '../../hooks/useToast';
import { useApp } from '../../context/AppContext';
import { Button, Toast } from '../../ui';
import { colors, spacing, typography } from '../../theme';
import { media } from '../../theme/breakpoints';
import { formatDate, getTodayStr } from '../../utils/helpers';
import ProjectSelector from './components/ProjectSelector';
import TaskCard from './components/TaskCard';

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${spacing.sm};
  margin-bottom: ${spacing.lg};
  padding: ${spacing.md};
  background: ${colors.bg.tertiary};
  border: 1px solid ${colors.border.default};
  border-radius: 12px;
`;

const DateInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
  color: ${colors.text.primary};
  font-weight: ${typography.weight.semibold};
  svg { color: ${colors.accent.primary}; }
`;

const DayBadge = styled.span`
  background: ${colors.accent.muted};
  color: ${colors.accent.primary};
  padding: 2px ${spacing.xs};
  border-radius: 6px;
  font-size: ${typography.size.sm};
  font-weight: ${typography.weight.semibold};
`;

const DateInput = styled.input`
  background: ${colors.bg.secondary};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  color: ${colors.text.primary};
  padding: ${spacing.xs} ${spacing.sm};
  font-size: ${typography.size.sm};
  font-family: inherit;
  cursor: pointer;
  height: 34px;
  &:focus { outline: 2px solid ${colors.accent.primary}; border-color: transparent; }
  &::-webkit-calendar-picker-indicator { filter: invert(0.7); cursor: pointer; }
`;

const TodayBanner = styled.div<{ hasEntries: boolean }>`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
  padding: ${spacing.xs} ${spacing.md};
  border-radius: 8px;
  margin-bottom: ${spacing.md};
  font-size: ${typography.size.sm};
  background: ${({ hasEntries }) => hasEntries ? colors.success.muted : colors.bg.elevated};
  color: ${({ hasEntries }) => hasEntries ? colors.success.text : colors.text.tertiary};
  border: 1px solid ${({ hasEntries }) => hasEntries ? `${colors.success.primary}33` : colors.border.default};
`;

const ProjectRow = styled.div`
  margin-bottom: ${spacing.lg};
`;

const ProjectLabel = styled.label`
  display: block;
  font-size: ${typography.size.sm};
  font-weight: ${typography.weight.medium};
  color: ${colors.text.secondary};
  margin-bottom: ${spacing.xs};
`;

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.md};
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm};
  margin-top: ${spacing.lg};
`;

const SubmitBar = styled.div`
  margin-top: ${spacing.lg};
  ${media.mobile} {
    position: fixed;
    bottom: 60px;
    left: 0;
    right: 0;
    padding: ${spacing.sm} ${spacing.md};
    background: ${colors.bg.secondary};
    border-top: 1px solid ${colors.border.default};
    z-index: 50;
    margin-top: 0;
  }
`;

const ShortcutHint = styled.span`
  font-size: ${typography.size.xs};
  color: ${colors.text.tertiary};
  margin-left: ${spacing.xs};
`;

export default function LogEntryPage() {
  const { state } = useApp();
  const log = useLogEntry();
  const { toasts, addToast, removeToast } = useToast();
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const todayStr = getTodayStr();

  // Count entries already logged for the selected date
  const existingCount = state.entries.filter((e) => e.date === log.selectedDate).length;
  const isToday = log.selectedDate === todayStr;

  const handleSubmit = async () => {
    const ok = await log.submit();
    if (ok) {
      addToast('success', `Day log submitted! (${existingCount + log.tasks.length} total for ${isToday ? 'today' : formatDate(log.selectedDate)})`);
    } else {
      addToast('error', 'Please fill in all required fields.');
    }
  };

  const handleAddTask = () => {
    log.addTask();
    setTimeout(() => {
      setLastAdded(log.tasks[log.tasks.length - 1]?.id ?? null);
    }, 0);
  };

  // Use a ref so the keydown handler always has the latest handleSubmit
  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  // Keyboard shortcut: Cmd+Enter or Ctrl+Enter to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmitRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div>
      <Toast toasts={toasts} removeToast={removeToast} />

      <Header>
        <DateInfo>
          <Calendar size={18} />
          <DateInput
            type="date"
            value={log.selectedDate}
            max={todayStr}
            onChange={(e) => log.setSelectedDate(e.target.value || todayStr)}
            title="Log date"
          />
          <DayBadge>Day #{log.dayNumber}</DayBadge>
        </DateInfo>
        <Button variant="ghost" size="sm" onClick={log.clearAll} type="button">
          <RotateCcw size={14} /> Clear Page
        </Button>
      </Header>

      {existingCount > 0 && (
        <TodayBanner hasEntries={true}>
          <CheckCircle2 size={14} />
          {existingCount} {existingCount === 1 ? 'entry' : 'entries'} already logged{isToday ? ' today' : ` for ${formatDate(log.selectedDate)}`}
          {' '}— adding more below
        </TodayBanner>
      )}

      <ProjectRow>
        <ProjectLabel>Project</ProjectLabel>
        <ProjectSelector value={log.project} onChange={log.setProject} />
      </ProjectRow>

      <TaskList>
        {log.tasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            index={i}
            error={log.errors[task.id]}
            canRemove={log.tasks.length > 1}
            onUpdate={(updates) => log.updateTask(task.id, updates)}
            onClear={() => log.clearTask(task.id)}
            onRemove={() => log.removeTask(task.id)}
            isNew={task.id === lastAdded}
          />
        ))}
      </TaskList>

      <Actions>
        <Button variant="secondary" onClick={handleAddTask} type="button" fullWidth>
          <Plus /> Add Task
        </Button>
      </Actions>

      <SubmitBar>
        <Button
          variant="success"
          size="lg"
          onClick={handleSubmit}
          disabled={log.isSubmitting}
          fullWidth
          type="button"
        >
          <Send /> {log.isSubmitting ? 'Submitting...' : 'Submit Day Log'}
          <ShortcutHint>⌘↵</ShortcutHint>
        </Button>
      </SubmitBar>
    </div>
  );
}
