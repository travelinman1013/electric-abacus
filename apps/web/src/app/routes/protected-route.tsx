import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { LoadingScreen } from '../components/layout/loading-screen';
import { useAuthContext } from '../providers/auth-provider';

export const ProtectedRoute = () => {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen label="Checking your session" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
