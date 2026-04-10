/**
 * App.tsx
 * --------
 * Root component — sets up routing and global providers.
 *
 * - SettingsProvider wraps everything so all pages can read/write settings
 * - BrowserRouter + Routes defines the client-side URL structure
 * - AppLayout wraps all routes (provides sidebar, toaster, backend status pill)
 * - Unknown paths redirect to /dashboard
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/shared/components/Layout/AppLayout';
import { SettingsProvider } from '@/shared/context/SettingsContext';
import { NotesProvider } from '@/shared/context/NotesContext';
import { FoldersProvider } from '@/shared/context/FoldersContext';
import { EventsProvider } from '@/shared/context/EventsContext';
import { TodosProvider } from '@/shared/context/TodosContext';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { CalendarPage } from '@/pages/Calendar/CalendarPage';
import { DailyTimesPage } from '@/pages/DailyTimes/DailyTimesPage';
import { MessagesPage } from '@/pages/Messages/MessagesPage';
import { SettingsPage } from '@/pages/Settings/SettingsPage';
import { NotesPage } from '@/pages/Notes/NotesPage';
import { EventsPage } from '@/pages/Events/EventsPage';
import { TrashPage } from '@/pages/Trash/TrashPage';
import { TodosPage } from '@/pages/Todos/TodosPage';
import DailyLogPage from '@/pages/DailyLog/DailyLogPage';
import { GamesPage } from '@/pages/Games/GamesPage';
import { BrachotPage } from '@/pages/Brachot/BrachotPage';

/** Sits inside EventsProvider + TodosProvider so it can access both contexts */
function NotificationsSync() {
  useNotifications();
  return null;
}

export default function App() {
  return (
    <SettingsProvider>
      <NotesProvider>
        <FoldersProvider>
          <EventsProvider>
            <TodosProvider>
              <NotificationsSync />
              <BrowserRouter>
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/events" element={<EventsPage />} />
                    <Route path="/daily-times" element={<DailyTimesPage />} />
                    <Route path="/brachot" element={<BrachotPage />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/notes" element={<NotesPage />} />
                    <Route path="/todos" element={<TodosPage />} />
                    <Route path="/daily-log" element={<DailyLogPage />} />
                    <Route path="/games" element={<GamesPage />} />
                    <Route path="/trash" element={<TrashPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </TodosProvider>
          </EventsProvider>
        </FoldersProvider>
      </NotesProvider>
    </SettingsProvider>
  );
}
