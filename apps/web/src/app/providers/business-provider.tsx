import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

export function BusinessProvider({ children }: BusinessProviderProps) {
  const { user, loading: authLoading, signOut } = useAuthContext();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClaimError, setShowClaimError] = useState(false);

  useEffect(() => {
    async function loadBusinessContext() {
      if (authLoading) {
        return;
      }

      if (!user) {
        setBusinessId(null);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        // Get the ID token result to access custom claims
        const idTokenResult = await user.getIdTokenResult();
        const claims = idTokenResult.claims;

        // Extract businessId and role from custom claims
        const claimedBusinessId = claims.businessId as string | undefined;
        const claimedRole = claims.role as UserRole | undefined;

        if (claimedBusinessId && claimedRole) {
          setBusinessId(claimedBusinessId);
          setRole(claimedRole);
          setShowClaimError(false);
        } else {
          console.warn('User does not have businessId or role in custom claims');
          setBusinessId(null);
          setRole(null);
          // Show error after a delay to allow for claim propagation
          setTimeout(() => {
            if (!claimedBusinessId || !claimedRole) {
              setShowClaimError(true);
            }
          }, 3000);
        }
      } catch (error) {
        console.error('Error loading business context:', error);
        setBusinessId(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    loadBusinessContext();
  }, [user, authLoading]);

  // Show error UI if claims are missing after auth completes
  if (!loading && !businessId && user && showClaimError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Setting up your account...</h1>
          <p className="text-sm text-slate-500">
            Your account setup is taking longer than expected. This can happen right after signing up.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              onClick={async () => {
                setShowClaimError(false);
                setLoading(true);
                await user.getIdToken(true);
                window.location.reload();
              }}
            >
              Refresh and try again
            </Button>
            <Button variant="outline" onClick={signOut}>
              Return to login
            </Button>
          </div>
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
