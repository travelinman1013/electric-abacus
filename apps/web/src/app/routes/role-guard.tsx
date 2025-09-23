import { Navigate, Outlet, useLocation } from 'react-router-dom';

import type { UserRole } from '@domain/costing';

import { LoadingScreen } from '../components/layout/loading-screen';
import { useAuthContext } from '../providers/auth-provider';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export const RoleGuard = ({ allowedRoles, redirectTo = '/' }: RoleGuardProps) => {
  const { profile, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen label="Loading permissions" />;
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
