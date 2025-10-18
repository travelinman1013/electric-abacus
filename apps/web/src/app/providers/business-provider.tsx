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
        // IMPORTANT: Force token refresh to get latest custom claims
        // This ensures we have the most up-to-date claims from the server
        console.log('🔄 Refreshing auth token to get latest custom claims...');
        const idTokenResult = await user.getIdTokenResult(true); // force refresh = true
        const claims = idTokenResult.claims;

        console.log('📋 Custom claims received:', {
          businessId: claims.businessId || 'MISSING',
          role: claims.role || 'MISSING'
        });

        // Extract businessId and role from custom claims
        const claimedBusinessId = claims.businessId as string | undefined;
        const claimedRole = claims.role as UserRole | undefined;

        if (claimedBusinessId && claimedRole) {
          console.log('✅ Custom claims valid, setting business context');
          setBusinessId(claimedBusinessId);
          setRole(claimedRole);
          setShowClaimError(false);
        } else {
          console.warn('⚠️ User does not have businessId or role in custom claims');
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
        console.error('❌ Error loading business context:', error);
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
        <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-slate-900">Account Setup Incomplete</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your account is missing required business permissions. This can happen if:
            </p>
          </div>
          <ul className="list-disc space-y-1 pl-6 text-sm text-slate-600">
            <li>Your account was just created and permissions are still being set up</li>
            <li>Your auth token needs to be refreshed to get the latest permissions</li>
            <li>There was an issue during account creation</li>
          </ul>
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-900">
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
                setShowClaimError(false);
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
          <p className="text-xs text-slate-500 text-center">
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
