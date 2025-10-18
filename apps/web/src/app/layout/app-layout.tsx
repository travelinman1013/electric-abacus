import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { MainNav } from '../components/navigation/main-nav';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { LoadingScreen } from '../components/layout/loading-screen';
import { useAuthContext } from '../providers/auth-provider';

export const AppLayout = () => {
  const { user, profile, loading, signOut } = useAuthContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showProvisionError, setShowProvisionError] = useState(false);

  // Retry mechanism for profile loading
  useEffect(() => {
    if (!loading && !profile && user && retryCount < 3) {
      console.log(`⏳ Profile not loaded, scheduling retry ${retryCount + 1}/3...`);

      // Wait 2 seconds before retrying
      const timer = setTimeout(() => {
        if (!profile) {
          console.log(`🔄 Retrying profile load attempt ${retryCount + 1}...`);
          setRetryCount(prev => prev + 1);
          // Force token refresh to trigger auth state update
          user.getIdToken(true).catch(err =>
            console.error('Failed to refresh token during retry:', err)
          );
        }
      }, 2000);

      return () => clearTimeout(timer);
    } else if (!loading && !profile && user && retryCount >= 3) {
      console.error('❌ Profile failed to load after 3 retries');
      setShowProvisionError(true);
    }
  }, [loading, profile, user, retryCount]);

  if (loading) {
    return (
      <LoadingScreen label="Preparing your workspace" />
    );
  }

  if (!profile && showProvisionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Account Setup Delayed</h1>
          <p className="text-sm text-slate-500">
            Your account is taking longer than expected to provision. This can happen if you just signed up.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              onClick={() => {
                setRetryCount(0);
                setShowProvisionError(false);
                user?.getIdToken(true);
                window.location.reload();
              }}
            >
              Refresh and Try Again
            </Button>
            <Button variant="outline" onClick={signOut}>
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while retrying
  if (!profile && retryCount > 0) {
    return (
      <LoadingScreen label={`Setting up your account... (attempt ${retryCount}/3)`} />
    );
  }

  if (!profile) {
    return (
      <LoadingScreen label="Loading your profile..." />
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
              <span className="text-lg font-semibold text-slate-900">Electric Abacus</span>
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
