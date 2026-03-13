import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cb-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cb-primary border-t-transparent" />
      </div>
    );
  }

  if (!session || !profile || profile.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
