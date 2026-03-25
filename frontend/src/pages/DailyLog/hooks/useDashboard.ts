/**
 * pages/DailyLog/hooks/useDashboard.ts
 * ----------------------------------------
 * Computes all analytics data for the Dashboard view.
 *
 * All derived values are wrapped in useMemo so they recompute only when
 * entries or the selected project filter changes — no extra API calls.
 *
 * Returns:
 * - stats      — total entries, unique projects, longest streak, top tech
 * - chartData  — weekly activity, tech breakdown, project split, category bar
 * - filtered   — entries matching the current project filter
 * - project / setProject — active filter state
 */

import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Entry } from '../utils/types';
import { isInDateRange, getWeekRange, countBy, groupBy, getCurrentStreak, getLongestStreak } from '../utils/helpers';

export default function useDashboard() {
  const { state } = useApp();
  const [dateFilter, setDateFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = useMemo<Entry[]>(() => {
    return state.entries.filter((e) => {
      if (!isInDateRange(e.date, dateFilter)) return false;
      if (projectFilter !== 'all' && e.project !== projectFilter) return false;
      if (categoryFilter !== 'all' && !e.categories.includes(categoryFilter)) return false;
      return true;
    });
  }, [state.entries, dateFilter, projectFilter, categoryFilter]);

  const stats = useMemo(() => {
    const allEntries = state.entries;
    const distinctDates = new Set(allEntries.map((e) => e.date));
    const { start, end } = getWeekRange();
    const thisWeek = allEntries.filter((e) => {
      const d = new Date(e.date + 'T00:00:00');
      return d >= start && d <= end;
    });

    const techCounts: Record<string, number> = {};
    allEntries.forEach((e) => e.technologies.forEach((t) => { techCounts[t.tech] = (techCounts[t.tech] || 0) + 1; }));
    const topTech = Object.entries(techCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    const projCounts = countBy(allEntries, 'project');
    const topProject = projCounts[0]?.name || '—';

    const currentStreak = getCurrentStreak(allEntries);
    const longestStreak = getLongestStreak(allEntries);
    return {
      daysLogged: distinctDates.size,
      totalTasks: allEntries.length,
      topTech,
      topProject,
      thisWeekCount: thisWeek.length,
      currentStreak,
      longestStreak,
    };
  }, [state.entries]);

  const chartData = useMemo(() => {
    const byDate = groupBy(filtered, 'date');
    const tasksOverTime = Object.entries(byDate)
      .map(([date, items]) => ({ date, count: items.length }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const techCounts: Record<string, number> = {};
    filtered.forEach((e) => e.technologies.forEach((t) => { techCounts[t.tech] = (techCounts[t.tech] || 0) + 1; }));
    const techUsage = Object.entries(techCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const catCounts: Record<string, number> = {};
    filtered.forEach((e) => e.categories.forEach((c) => { catCounts[c] = (catCounts[c] || 0) + 1; }));
    const categories = Object.entries(catCounts).map(([name, value]) => ({ name, value }));

    const soloTeam = countBy(filtered, 'teamType');
    const projects = countBy(filtered, 'project');

    const subTechData: { tech: string; [sub: string]: string | number }[] = [];
    const topTechs = techUsage.slice(0, 5);
    topTechs.forEach(({ name }) => {
      const subCounts: Record<string, number> = {};
      filtered.forEach((e) =>
        e.technologies.filter((t) => t.tech === name).forEach((t) =>
          t.subTechs.forEach((s) => { subCounts[s] = (subCounts[s] || 0) + 1; })
        )
      );
      const row: Record<string, string | number> = { tech: name };
      Object.entries(subCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .forEach(([s, c]) => { row[s] = c; });
      subTechData.push(row as { tech: string; [sub: string]: string | number });
    });

    return { tasksOverTime, techUsage, categories, soloTeam, projects, subTechData };
  }, [filtered]);

  const history = useMemo(() => {
    const byDate = groupBy(filtered, 'date');
    return Object.entries(byDate)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, entries]) => ({ date, dayNumber: entries[0].dayNumber, entries }));
  }, [filtered]);

  return {
    filtered, stats, chartData, history,
    dateFilter, setDateFilter,
    projectFilter, setProjectFilter,
    categoryFilter, setCategoryFilter,
  };
}
