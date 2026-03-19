import { BrowserRouter, Routes, Route } from 'react-router';
import { AppLayout } from '@/components/layout/app-layout';
import { AccountsPage } from '@/pages/accounts-page';
import { OrgsPage } from '@/pages/orgs-page';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<AccountsPage />} />
          <Route path="/orgs" element={<OrgsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
