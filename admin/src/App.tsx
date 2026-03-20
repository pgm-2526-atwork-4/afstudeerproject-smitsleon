import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import ArtistDetailPage from './pages/ArtistDetailPage';
import ArtistsPage from './pages/ArtistsPage';
import EventsPage from './pages/EventsPage';
import LoginPage from './pages/LoginPage';
import ReportsPage from './pages/ReportsPage';
import VenueDetailPage from './pages/VenueDetailPage';
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
              <Route index element={<ReportsPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="artists" element={<ArtistsPage />} />
              <Route path="artists/:id" element={<ArtistDetailPage />} />
              <Route path="venues" element={<VenuesPage />} />
              <Route path="venues/:id" element={<VenueDetailPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
