import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/shared/components/Layout/AppLayout';
import { SettingsProvider } from '@/shared/context/SettingsContext';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { CalendarPage } from '@/pages/Calendar/CalendarPage';
import { DailyTimesPage } from '@/pages/DailyTimes/DailyTimesPage';
import { MessagesPage } from '@/pages/Messages/MessagesPage';
import { SettingsPage } from '@/pages/Settings/SettingsPage';

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/daily-times" element={<DailyTimesPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}
