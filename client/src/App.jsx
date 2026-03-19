import { BrowserRouter, Routes, Route } from 'react-router';
import { AppLayout } from '@/components/layout/app-layout';
import { DashboardPage } from '@/pages/dashboard-page';
import { TeamsPage } from '@/pages/teams-page';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/teams" element={<TeamsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
