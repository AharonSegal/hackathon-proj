/**
 * pages/DailyLog/hooks/useLogEntry.ts
 * -------------------------------------
 * Manages all form state for the LogEntry page.
 *
 * Responsibilities:
 * - Tracks date, project, tasks array (each with categories, title,
 *   description, technologies, coding languages), and team info
 * - Restores the last-used project from preferences on mount
 * - submit() — validates, builds Entry objects, calls addEntries(), saves prefs
 * - reset()  — clears form back to today's date + empty state
 * - addTask() / removeTask() / updateTask() — manage the tasks sub-array
 */

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import type { TaskFormState, TechSelection, Entry, Preferences } from '../utils/types';
import { generateId, getTodayStr, getDayNumber } from '../utils/helpers';

function createEmptyTask(): TaskFormState {
  return {
    id: generateId(),
    categories: [],
    title: '',
    description: '',
    technologies: [],
    teamType: 'solo',
    teamSize: undefined,
    codingLanguages: [],
  };
}

function applyDefaults(prefs: Preferences | null): TaskFormState {
  if (!prefs) return createEmptyTask();
  return {
    id: generateId(),
    categories: prefs.lastCategories || [],
    title: '',
    description: '',
    technologies: prefs.lastTechnologies || [],
    teamType: prefs.lastTeamType || 'solo',
    teamSize: prefs.lastTeamSize,
    codingLanguages: prefs.lastCodingLanguages || [],
  };
}

export default function useLogEntry() {
  const { state, addEntries, updatePreferences } = useApp();
  const todayStr = getTodayStr();

  const [project, setProject] = useState('');
  const [tasks, setTasks] = useState<TaskFormState[]>([createEmptyTask()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const dayNumber = getDayNumber(state.entries, selectedDate);

  useEffect(() => {
    if (state.preferences) {
      setProject(state.preferences.lastProject || state.schema.projects[0] || '');
      const count = state.preferences.lastTaskCount || 1;
      setTasks(Array.from({ length: count }, () => applyDefaults(state.preferences)));
    } else if (state.schema.projects.length > 0) {
      setProject(state.schema.projects[0]);
    }
  }, [state.preferences, state.schema.projects]);

  const updateTask = useCallback((taskId: string, updates: Partial<TaskFormState>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
    if (updates.title !== undefined) {
      setErrors((prev) => { const next = { ...prev }; delete next[taskId]; return next; });
    }
  }, []);

  const addTask = useCallback(() => {
    setTasks((prev) => [...prev, createEmptyTask()]);
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const clearTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...createEmptyTask(), id: t.id } : t)));
  }, []);

  const clearAll = useCallback(() => {
    setProject(state.schema.projects[0] || '');
    setTasks([createEmptyTask()]);
    setErrors({});
    setSelectedDate(getTodayStr());
  }, [state.schema.projects]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    tasks.forEach((t) => {
      if (!t.title.trim()) newErrors[t.id] = 'Title is required';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [tasks]);

  const submit = useCallback(async (): Promise<boolean> => {
    if (!validate()) return false;
    setIsSubmitting(true);
    try {
      const dayNum = getDayNumber(state.entries, selectedDate);
      const entries: Entry[] = tasks.map((t) => ({
        id: generateId(),
        date: selectedDate,
        dayNumber: dayNum,
        project,
        categories: t.categories,
        title: t.title.trim(),
        description: t.description.trim(),
        technologies: t.technologies,
        teamType: t.teamType,
        teamSize: t.teamType === 'team' ? t.teamSize : undefined,
        codingLanguages: t.codingLanguages || [],
        createdAt: new Date().toISOString(),
      }));

      await addEntries(entries);

      const prefs: Preferences = {
        lastProject: project,
        lastCategories: tasks[0]?.categories || [],
        lastTechnologies: tasks[0]?.technologies || [],
        lastTeamType: tasks[0]?.teamType || 'solo',
        lastTaskCount: tasks.length,
        lastCodingLanguages: tasks[0]?.codingLanguages || [],
        lastTeamSize: tasks[0]?.teamType === 'team' ? tasks[0]?.teamSize : undefined,
      };
      await updatePreferences(prefs);

      setTasks([applyDefaults(prefs)]);
      setErrors({});
      return true;
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, tasks, todayStr, selectedDate, project, addEntries, updatePreferences, state.entries]);

  return {
    todayStr, selectedDate, setSelectedDate, dayNumber, project, setProject, tasks, errors, isSubmitting,
    updateTask, addTask, removeTask, clearTask, clearAll, submit,
  };
}
