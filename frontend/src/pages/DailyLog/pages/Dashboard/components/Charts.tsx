import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import styled from '@emotion/styled';
import { Card, CardTitle } from '../../../ui';
import { colors, spacing } from '../../../theme';
import { media } from '../../../theme/breakpoints';

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${spacing.md};

  ${media.aboveMobile} {
    grid-template-columns: 1fr 1fr;
  }
`;

const FullWidth = styled.div`
  grid-column: 1 / -1;
`;

const tooltipStyle = {
  backgroundColor: colors.bg.elevated,
  border: `1px solid ${colors.border.default}`,
  borderRadius: '8px',
  color: colors.text.primary,
  fontSize: '13px',
};

interface ChartsProps {
  tasksOverTime: { date: string; count: number }[];
  techUsage: { name: string; count: number }[];
  categories: { name: string; value: number }[];
  soloTeam: { name: string; count: number }[];
  projects: { name: string; count: number }[];
  subTechData: Record<string, string | number>[];
}

export default function Charts({ tasksOverTime, techUsage, categories, soloTeam, projects, subTechData }: ChartsProps) {
  const palette = colors.chart;

  const subKeys = new Set<string>();
  subTechData.forEach((row) => {
    Object.keys(row).forEach((k) => { if (k !== 'tech') subKeys.add(k); });
  });

  return (
    <Grid>
      <FullWidth>
        <Card>
          <CardTitle size="0.9rem">Tasks Over Time</CardTitle>
          <div style={{ marginTop: spacing.md }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tasksOverTime}>
                <XAxis dataKey="date" tick={{ fill: colors.text.tertiary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: colors.text.tertiary, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.bg.hover }} />
                <Bar dataKey="count" fill={colors.accent.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </FullWidth>

      <Card>
        <CardTitle size="0.9rem">Technology Usage</CardTitle>
        <div style={{ marginTop: spacing.md }}>
          <ResponsiveContainer width="100%" height={Math.max(200, techUsage.length * 32)}>
            <BarChart data={techUsage} layout="vertical">
              <XAxis type="number" tick={{ fill: colors.text.tertiary, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: colors.text.secondary, fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.bg.hover }} />
              <Bar dataKey="count" fill={colors.teal.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardTitle size="0.9rem">Categories</CardTitle>
        <div style={{ marginTop: spacing.md }}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categories} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {categories.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: colors.text.secondary }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardTitle size="0.9rem">Solo vs Team</CardTitle>
        <div style={{ marginTop: spacing.md }}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={soloTeam.map((s) => ({ name: s.name, value: s.count }))}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
              >
                <Cell fill={colors.accent.primary} />
                <Cell fill={colors.warning.primary} />
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: colors.text.secondary }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardTitle size="0.9rem">Projects</CardTitle>
        <div style={{ marginTop: spacing.md }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projects}>
              <XAxis dataKey="name" tick={{ fill: colors.text.tertiary, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: colors.text.tertiary, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.bg.hover }} />
              <Bar dataKey="count" fill={colors.purple.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {subTechData.length > 0 && (
        <FullWidth>
          <Card>
            <CardTitle size="0.9rem">Sub-Tech Breakdown</CardTitle>
            <div style={{ marginTop: spacing.md }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={subTechData}>
                  <XAxis dataKey="tech" tick={{ fill: colors.text.tertiary, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: colors.text.tertiary, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.bg.hover }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: colors.text.secondary }} />
                  {[...subKeys].map((key, i) => (
                    <Bar key={key} dataKey={key} stackId="a" fill={palette[i % palette.length]} radius={i === [...subKeys].length - 1 ? [4, 4, 0, 0] : undefined} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </FullWidth>
      )}
    </Grid>
  );
}
