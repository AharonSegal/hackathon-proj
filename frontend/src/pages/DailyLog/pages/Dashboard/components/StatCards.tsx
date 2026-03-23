import styled from '@emotion/styled';
import { Calendar, ListChecks, Cpu, FolderKanban, TrendingUp, Flame } from 'lucide-react';
import { colors, spacing, typography, shadows, transitions } from '../../../theme';
import { media } from '../../../theme/breakpoints';
import type { LucideIcon } from 'lucide-react';

interface Stats {
  daysLogged: number;
  totalTasks: number;
  topTech: string;
  topProject: string;
  thisWeekCount: number;
  currentStreak: number;
  longestStreak: number;
}

const Row = styled.div`
  display: flex;
  gap: ${spacing.sm};
  overflow-x: auto;
  padding-bottom: ${spacing.xs};

  ${media.aboveMobile} {
    flex-wrap: wrap;
  }
`;

const StatCard = styled.div`
  flex: 0 0 auto;
  min-width: 140px;
  background: ${colors.bg.tertiary};
  border: 1px solid ${colors.border.default};
  border-radius: 12px;
  padding: ${spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs};
  transition: all ${transitions.normal};

  &:hover {
    border-color: ${colors.border.light};
    box-shadow: ${shadows.sm};
    transform: translateY(-2px);
  }

  ${media.aboveMobile} {
    flex: 1 1 0;
    min-width: 160px;
  }
`;

const IconWrap = styled.div<{ color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ color }) => color}20;
  color: ${({ color }) => color};
  svg { width: 18px; height: 18px; }
`;

const Value = styled.span`
  font-size: ${typography.size.xxl};
  font-weight: ${typography.weight.bold};
  color: ${colors.text.primary};
  line-height: 1;
`;

const Label = styled.span`
  font-size: ${typography.size.xs};
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const cards: { key: keyof Stats; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'daysLogged', label: 'Days Logged', icon: Calendar, color: colors.accent.primary },
  { key: 'totalTasks', label: 'Total Tasks', icon: ListChecks, color: colors.success.primary },
  { key: 'topTech', label: 'Top Tech', icon: Cpu, color: colors.purple.primary },
  { key: 'topProject', label: 'Top Project', icon: FolderKanban, color: colors.warning.primary },
  { key: 'thisWeekCount', label: 'This Week', icon: TrendingUp, color: colors.teal.primary },
  { key: 'currentStreak', label: 'Cur. Streak', icon: Flame, color: colors.danger.primary },
  { key: 'longestStreak', label: 'Best Streak', icon: Flame, color: colors.warning.primary },
];

export default function StatCards({ stats }: { stats: Stats }) {
  return (
    <Row>
      {cards.map(({ key, label, icon: Icon, color }) => (
        <StatCard key={key}>
          <IconWrap color={color}><Icon /></IconWrap>
          <Value>{stats[key]}</Value>
          <Label>{label}</Label>
        </StatCard>
      ))}
    </Row>
  );
}
