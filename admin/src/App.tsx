import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import ArtistsPage from './pages/ArtistsPage';
import DashboardPage from './pages/DashboardPage';
import EventsPage from './pages/EventsPage';
import LoginPage from './pages/LoginPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import VenuesPage from './pages/VenuesPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected admin routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="artists" element={<ArtistsPage />} />
              <Route path="venues" element={<VenuesPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
