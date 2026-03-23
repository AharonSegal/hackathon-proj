import { useState } from 'react';
import styled from '@emotion/styled';
import { ChevronDown, ChevronRight, User, Users } from 'lucide-react';
import type { Entry } from '../../../utils/types';
import { Card, Badge, Chip } from '../../../ui';
import { colors, spacing, typography, transitions } from '../../../theme';
import { formatDate } from '../../../utils/helpers';

interface DayGroup {
  date: string;
  dayNumber: number;
  entries: Entry[];
}

const DayHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
  padding: ${spacing.sm} 0;
  font-weight: ${typography.weight.semibold};
  color: ${colors.text.primary};
  font-size: ${typography.size.md};
`;

const DayNum = styled.span`
  background: ${colors.accent.muted};
  color: ${colors.accent.primary};
  padding: 1px ${spacing.xs};
  border-radius: 4px;
  font-size: ${typography.size.xs};
  font-weight: ${typography.weight.semibold};
`;

const EntryRow = styled.button`
  width: 100%;
  text-align: left;
  background: ${colors.bg.elevated};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  padding: ${spacing.sm} ${spacing.md};
  cursor: pointer;
  transition: all ${transitions.normal};
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs};

  &:hover {
    border-color: ${colors.border.light};
    background: ${colors.bg.hover};
  }
`;

const EntryTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
  font-weight: ${typography.weight.medium};
  color: ${colors.text.primary};
  font-size: ${typography.size.md};
  svg { width: 14px; height: 14px; color: ${colors.text.tertiary}; }
`;

const TechLine = styled.div`
  font-size: ${typography.size.sm};
  color: ${colors.text.secondary};
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.xxs};
`;

const Desc = styled.p`
  font-size: ${typography.size.sm};
  color: ${colors.text.secondary};
  line-height: ${typography.lineHeight.normal};
  padding-top: ${spacing.xs};
  border-top: 1px solid ${colors.border.default};
  margin-top: ${spacing.xs};
  white-space: pre-wrap;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs};
`;

export default function EntryHistory({ history }: { history: DayGroup[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  if (!history.length) return null;

  return (
    <Card>
      <h3 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text.primary, marginBottom: spacing.md }}>
        Entry History
      </h3>
      <Stack>
        {history.map(({ date, dayNumber, entries }) => (
          <div key={date}>
            <DayHeader>
              <DayNum>Day {dayNumber}</DayNum>
              {formatDate(date)}
              <span style={{ color: colors.text.tertiary, fontSize: typography.size.sm }}>
                — {entries[0]?.project}
              </span>
            </DayHeader>
            <Stack>
              {entries.map((e) => {
                const isOpen = expanded[e.id];
                return (
                  <EntryRow key={e.id} onClick={() => toggle(e.id)} type="button">
                    <EntryTitle>
                      {isOpen ? <ChevronDown /> : <ChevronRight />}
                      {e.title}
                    </EntryTitle>
                    <TechLine>
                      {e.technologies.map((t) => {
                        const subs = t.subTechs.length ? ` (${t.subTechs.join(', ')})` : '';
                        return `${t.tech}${subs}`;
                      }).join(' · ')}
                    </TechLine>
                    <TagRow>
                      {e.categories.map((c) => <Badge key={c} variant="accent">{c}</Badge>)}
                      <Badge variant={e.teamType === 'solo' ? 'default' : 'warning'}>
                        {e.teamType === 'solo' ? <User size={10} /> : <Users size={10} />}
                        {e.teamType}
                      </Badge>
                    </TagRow>
                    {isOpen && e.description && <Desc>{e.description}</Desc>}
                  </EntryRow>
                );
              })}
            </Stack>
          </div>
        ))}
      </Stack>
    </Card>
  );
}
