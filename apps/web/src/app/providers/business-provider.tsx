import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserRole } from '@domain/costing';
import { useAuthContext } from './auth-provider';
import { Button } from '../components/ui/button';

interface BusinessContextValue {
  businessId: string | null;
  role: UserRole | null;
  loading: boolean;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

interface BusinessProviderProps {
  children: ReactNode;
}

/**
 * Polls for custom claims (businessId and role) with exponential backoff.
 * This handles the eventual consistency of Firebase Auth custom claims.
 *
 * @param user - The Firebase user to check claims for
 * @param maxAttempts - Maximum number of polling attempts (default: 10)
 * @param initialDelay - Initial delay in milliseconds (default: 500ms)
 * @returns Promise<{businessId: string | null, role: UserRole | null}> - Claims if found, nulls if timeout
 */
async function waitForCustomClaims(
  user: FirebaseUser,
  maxAttempts = 10,
  initialDelay = 500
): Promise<{ businessId: string | null; role: UserRole | null }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Force refresh the token to get latest claims
    const tokenResult = await user.getIdTokenResult(true);
    const { businessId, role } = tokenResult.claims;

    if (businessId && role) {
      console.log(`✅ Claims available after ${attempt + 1} attempt(s)`, {
        businessId,
        role
      });
      return { businessId: businessId as string, role: role as UserRole };
    }

    // Don't wait after the last attempt
    if (attempt < maxAttempts - 1) {
      // Exponential backoff: 500ms, 1s, 2s, 4s, 8s, 16s...
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⏳ Waiting for claims... attempt ${attempt + 1}/${maxAttempts} (${delay}ms delay)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error('❌ Claims never appeared after maximum attempts', {
    maxAttempts,
    totalWaitTime: initialDelay * (Math.pow(2, maxAttempts) - 1)
  });
  return { businessId: null, role: null };
}

export function BusinessProvider({ children }: BusinessProviderProps) {
  const { user, loading: authLoading, signOut } = useAuthContext();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    async function loadBusinessContext() {
      if (authLoading) {
        return;
      }

      if (!user) {
        setBusinessId(null);
        setRole(null);
        setLoading(false);
        setIsPolling(false);
        return;
      }

      try {
        setIsPolling(true);
        console.log('🔄 Polling for custom claims...');

        // Poll for claims with exponential backoff (up to ~30 seconds)
        const claims = await waitForCustomClaims(user);

        if (claims.businessId && claims.role) {
          console.log('✅ Custom claims valid, setting business context');
          setBusinessId(claims.businessId);
          setRole(claims.role);
        } else {
          console.warn('⚠️ User does not have businessId or role in custom claims after polling');
          setBusinessId(null);
          setRole(null);
        }
      } catch (error) {
        console.error('❌ Error loading business context:', error);
        setBusinessId(null);
        setRole(null);
      } finally {
        setLoading(false);
        setIsPolling(false);
      }
    }

    loadBusinessContext();
  }, [user, authLoading]);

  // Show loading state while polling for claims
  if (isPolling) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 shadow-sm text-center">
          <div className="flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Setting Up Your Account</h1>
          <p className="text-sm text-muted-foreground">
            Please wait while we configure your business permissions...
          </p>
          <p className="text-xs text-muted-foreground/70">This usually takes 5-10 seconds</p>
        </div>
      </div>
    );
  }

  // Show error UI only if claims are still missing after polling completes
  if (!loading && !businessId && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Account Setup Incomplete</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account is missing required business permissions. This can happen if:
            </p>
          </div>
          <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
            <li>Your account was just created and permissions are still being set up</li>
            <li>Your auth token needs to be refreshed to get the latest permissions</li>
            <li>There was an issue during account creation</li>
          </ul>
          <div className="rounded-md border bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              <strong>User ID:</strong> {user.uid}
              <br />
              <strong>Email:</strong> {user.email}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              onClick={async () => {
                console.log('🔄 Manually refreshing token and reloading...');
                setLoading(true);
                await user.getIdToken(true);
                window.location.reload();
              }}
            >
              Refresh Permissions
            </Button>
            <Button variant="outline" onClick={signOut}>
              Sign Out and Try Again
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            If this problem persists, please contact support with your User ID above.
          </p>
        </div>
      </div>
    );
  }

  const value: BusinessContextValue = {
    businessId,
    role,
    loading,
  };

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
