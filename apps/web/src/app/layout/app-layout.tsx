import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { MainNav } from '../components/navigation/main-nav';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { LoadingScreen } from '../components/layout/loading-screen';
import { useAuthContext } from '../providers/auth-provider';

export const AppLayout = () => {
  const { profile, loading, signOut } = useAuthContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (loading) {
    return (
      <LoadingScreen label="Preparing your workspace" />
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Account not provisioned</h1>
          <p className="text-sm text-slate-500">
            Your account is authenticated but missing a profile. Please contact an administrator to
            assign your role.
          </p>
          <Button variant="outline" onClick={signOut}>
            Return to login
          </Button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      setSignOutError(null);
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
      setSignOutError('Unable to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-slate-900">Lightning Abacus</span>
              <Badge variant="secondary" className="uppercase">{profile.role}</Badge>
            </div>
            <p className="text-xs text-slate-500">Fast, powerful operations management for your business.</p>
          </div>

          <div className="flex flex-1 items-center justify-end gap-6">
            <MainNav role={profile.role} />
            <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-700">{profile.displayName}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </div>
        {signOutError ? (
          <div className="border-t border-amber-200 bg-amber-50">
            <div className="mx-auto max-w-screen-2xl px-6 py-2 text-sm text-amber-900">{signOutError}</div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-screen-2xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};
