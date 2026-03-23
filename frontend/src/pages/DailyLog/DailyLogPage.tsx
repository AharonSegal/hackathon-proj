/**
 * pages/DailyLog/DailyLogPage.tsx
 * ---------------------------------
 * Root entry point for the /daily-log route. Wraps the entire Daily Log
 * feature in AppProvider so all child pages share the same data context.
 *
 * View state (local — not in the router):
 *   'log'      → LogEntryPage   — default view, form to submit today's work
 *   'analyst'  → DashboardPage  — analytics charts and stat cards
 *   'logs'     → LogsPage       — filterable list of all past entries
 *   'settings' → SchemaManagerPage — manage projects, categories, technologies
 *
 * Code Flow:
 * 1. DailyLogPage renders AppProvider (loads all data from API on mount)
 * 2. DailyLogInner reads `view` state and renders the matching sub-page
 * 3. TopBar shows three icon buttons that switch the active view
 * 4. Clicking the BookOpen title navigates back to 'log'
 * 5. A loading skeleton is shown while data is being fetched
 * 6. Errors during load are shown with a retry button
 * 7. Emotion CSS-in-JS is used for all styling within this subtree
 *    (does NOT affect the outer app; Tailwind is used everywhere else)
 */

import { useState } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Settings, BarChart3, List, BookOpen, RefreshCw, AlertCircle } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { colors, spacing, typography, transitions } from './theme';
import LogEntryPage from './pages/LogEntry/LogEntryPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import LogsPage from './pages/Logs/LogsPage';
import SchemaManagerPage from './pages/SchemaManager/SchemaManagerPage';

type View = 'log' | 'analyst' | 'logs' | 'settings';

// ── Styled components ──────────────────────────────────────────────────────────

const PageWrap = styled.div`
  min-height: 100%;
  background: ${colors.bg.primary};
  color: ${colors.text.primary};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacing.sm} ${spacing.lg};
  background: ${colors.bg.secondary};
  border-bottom: 1px solid ${colors.border.default};
  position: sticky;
  top: 0;
  z-index: 100;
`;

const TitleBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
  transition: opacity ${transitions.fast};
  &:hover { opacity: 0.8; }
`;

const PageTitle = styled.h1`
  font-size: ${typography.size.lg};
  font-weight: ${typography.weight.semibold};
  color: ${colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
`;

const ViewTitle = styled.span`
  font-size: ${typography.size.sm};
  color: ${colors.text.tertiary};
  font-weight: ${typography.weight.normal};
`;

const IconRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
`;

const IconBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid ${({ $active }) => $active ? colors.accent.primary : colors.border.default};
  background: ${({ $active }) => $active ? colors.accent.muted : 'transparent'};
  color: ${({ $active }) => $active ? colors.accent.primary : colors.text.tertiary};
  border-radius: 8px;
  cursor: pointer;
  transition: all ${transitions.fast};
  &:hover {
    border-color: ${colors.accent.primary};
    color: ${colors.accent.primary};
    background: ${colors.accent.muted};
  }
  svg { width: 18px; height: 18px; }
`;

const Content = styled.div`
  padding: ${spacing.lg};
  max-width: 900px;
  margin: 0 auto;
`;

// ── Loading skeleton ───────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Skeleton = styled.div`
  background: linear-gradient(90deg, ${colors.skeleton.base} 25%, ${colors.skeleton.shine} 50%, ${colors.skeleton.base} 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 8px;
`;

const LoadWrap = styled.div`
  padding: ${spacing.lg};
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${spacing.md};
`;

// ── Error state ────────────────────────────────────────────────────────────────

const ErrorWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${spacing.md};
  padding: ${spacing.xl} ${spacing.lg};
  text-align: center;
  color: ${colors.text.secondary};
`;

const RetryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
  background: ${colors.accent.muted};
  color: ${colors.accent.primary};
  border: 1px solid ${colors.accent.primary}44;
  border-radius: 8px;
  padding: ${spacing.sm} ${spacing.md};
  font-size: ${typography.size.sm};
  font-weight: ${typography.weight.medium};
  cursor: pointer;
  transition: all ${transitions.fast};
  &:hover { background: ${colors.accent.primary}33; }
`;

// ── Constants ──────────────────────────────────────────────────────────────────

const viewLabels: Record<View, string> = {
  log: 'Log Entry',
  analyst: 'Analytics',
  logs: 'All Logs',
  settings: 'Schema Manager',
};

// ── Inner component (has access to AppContext) ─────────────────────────────────

function DailyLogInner() {
  const [view, setView] = useState<View>('log');
  const { state, loadError } = useApp();

  if (loadError) {
    return (
      <PageWrap>
        <TopBar>
          <PageTitle><BookOpen size={20} /> Daily Log</PageTitle>
        </TopBar>
        <ErrorWrap>
          <AlertCircle size={32} color={colors.danger.primary} />
          <div>
            <p style={{ color: colors.text.primary, fontWeight: typography.weight.semibold, marginBottom: spacing.xs }}>
              Failed to load data
            </p>
            <p style={{ fontSize: typography.size.sm }}>{loadError}</p>
          </div>
          <RetryBtn onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Retry
          </RetryBtn>
        </ErrorWrap>
      </PageWrap>
    );
  }

  if (state.isLoading) {
    return (
      <PageWrap>
        <TopBar>
          <PageTitle><BookOpen size={20} /> Daily Log</PageTitle>
          <IconRow>
            <IconBtn $active={false} disabled><BarChart3 /></IconBtn>
            <IconBtn $active={false} disabled><List /></IconBtn>
            <IconBtn $active={false} disabled><Settings /></IconBtn>
          </IconRow>
        </TopBar>
        <LoadWrap>
          <Skeleton style={{ height: 72 }} />
          <Skeleton style={{ height: 36, width: '40%' }} />
          <Skeleton style={{ height: 280 }} />
          <Skeleton style={{ height: 280 }} />
        </LoadWrap>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <TopBar>
        <TitleBtn onClick={() => setView('log')} title="Log Entry">
          <PageTitle>
            <BookOpen size={20} />
            Daily Log
            <ViewTitle>— {viewLabels[view]}</ViewTitle>
          </PageTitle>
        </TitleBtn>
        <IconRow>
          <IconBtn
            $active={view === 'analyst'}
            onClick={() => setView('analyst')}
            title="Analytics"
          >
            <BarChart3 />
          </IconBtn>
          <IconBtn
            $active={view === 'logs'}
            onClick={() => setView('logs')}
            title="All Logs"
          >
            <List />
          </IconBtn>
          <IconBtn
            $active={view === 'settings'}
            onClick={() => setView('settings')}
            title="Schema Manager"
          >
            <Settings />
          </IconBtn>
        </IconRow>
      </TopBar>

      <Content>
        {view === 'log' && <LogEntryPage />}
        {view === 'analyst' && <DashboardPage />}
        {view === 'logs' && <LogsPage />}
        {view === 'settings' && <SchemaManagerPage />}
      </Content>
    </PageWrap>
  );
}

export default function DailyLogPage() {
  return (
    <AppProvider>
      <DailyLogInner />
    </AppProvider>
  );
}
