import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '../layout/app-layout';
import { DashboardPage } from '../features/dashboard/dashboard-page';
import { IngredientsPage } from '../features/ingredients/ingredients-page';
import { LoginPage } from '../features/auth/login-page';
import { SignupPage } from '../features/auth/signup-page';
import { LandingPage } from '../features/landing/landing-page';
import { TermsPage } from '../features/legal/terms-page';
import { PrivacyPage } from '../features/legal/privacy-page';
import { MenuItemsPage } from '../features/menu-items/menu-items-page';
import { InventoryPage } from '../features/weeks/inventory-page';
import { SalesEntryPage } from '../features/weeks/sales-entry-page';
import { WeekListPage } from '../features/weeks/week-list-page';
import { WeekReviewPage } from '../features/weeks/week-review-page';
import { UserSettingsPage } from '../features/settings/user-settings-page';
import { BusinessTerminology } from '../features/settings/BusinessTerminology';
import { useAuthContext } from '../providers/auth-provider';
import { LoadingScreen } from '../components/layout/loading-screen';
import { ProtectedRoute } from './protected-route';
import { RoleGuard } from './role-guard';

const DEFAULT_AUTHENTICATED_PATH = '/app';

export const AppRoutes = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <LoadingScreen label="Starting Electric Abacus" />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={user ? <Navigate to={DEFAULT_AUTHENTICATED_PATH} replace /> : <LandingPage />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to={DEFAULT_AUTHENTICATED_PATH} replace /> : <LoginPage />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to={DEFAULT_AUTHENTICATED_PATH} replace /> : <SignupPage />}
      />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Protected app routes */}
      <Route path="/app" element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="weeks" element={<WeekListPage />} />
          <Route path="weeks/:weekId/sales" element={<SalesEntryPage />} />
          <Route path="weeks/:weekId/inventory" element={<InventoryPage />} />
          <Route path="settings" element={<UserSettingsPage />} />

          <Route element={<RoleGuard allowedRoles={['owner']} redirectTo={DEFAULT_AUTHENTICATED_PATH} />}>
            <Route path="ingredients" element={<IngredientsPage />} />
            <Route path="menu-items" element={<MenuItemsPage />} />
            <Route path="weeks/:weekId/review" element={<WeekReviewPage />} />
            <Route path="settings/terminology" element={<BusinessTerminology />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route
        path="*"
        element={<Navigate to={user ? DEFAULT_AUTHENTICATED_PATH : '/'} replace />}
      />
    </Routes>
  );
};
