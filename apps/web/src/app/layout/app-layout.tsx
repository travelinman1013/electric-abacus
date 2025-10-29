import { useState } from 'react';
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

  // Trust AuthProvider's loading state - it handles profile polling with exponential backoff
  if (loading) {
    return (
      <LoadingScreen label="Preparing your workspace" />
    );
  }

  // If loading is complete but no profile exists, show error (AuthProvider polling timed out)
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Account Setup Incomplete</h1>
          <p className="text-sm text-muted-foreground">
            Your account profile could not be loaded. This can happen if:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-left text-sm text-muted-foreground">
            <li>Your account was just created and is still being set up</li>
            <li>There was an issue during account creation</li>
            <li>Your profile data is missing from the system</li>
          </ul>
          <div className="rounded-md border bg-muted p-3 text-left">
            <p className="text-xs text-muted-foreground">
              <strong>User ID:</strong> {user?.uid || 'Unknown'}
              <br />
              <strong>Email:</strong> {user?.email || 'Unknown'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              onClick={() => {
                console.log('🔄 Refreshing page to retry profile load...');
                window.location.reload();
              }}
            >
              Refresh and Try Again
            </Button>
            <Button variant="outline" onClick={signOut}>
              Return to Login
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            If this problem persists, please try signing in again or contact support.
          </p>
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-3 sm:py-4">
          {/* Mobile & Desktop Header */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Logo and Badge */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-foreground">Electric Abacus</span>
                  <Badge variant="secondary" className="uppercase">{profile.role}</Badge>
                </div>
                <p className="hidden sm:block text-xs text-muted-foreground">Fast, powerful operations management for your business.</p>
              </div>

              {/* Mobile Sign Out Button */}
              <div className="lg:hidden">
                <Button variant="outline" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </Button>
              </div>
            </div>

            {/* Navigation - Full width on mobile, inline on desktop */}
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="flex-1 lg:flex-initial">
                <MainNav role={profile.role} />
              </div>

              {/* Desktop User Info */}
              <div className="hidden lg:flex items-center gap-3 rounded-md border bg-muted px-3 py-2 text-sm whitespace-nowrap">
                <span className="font-medium text-foreground">{profile.displayName}</span>
                <Button variant="outline" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {signOutError ? (
          <div className="border-t bg-destructive/10">
            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-2 text-sm text-destructive">{signOutError}</div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};
