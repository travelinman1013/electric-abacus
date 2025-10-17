import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserRole } from '@domain/costing';
import { useAuthContext } from './auth-provider';

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
  const { user, loading: authLoading } = useAuthContext();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

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
        } else {
          console.warn('User does not have businessId or role in custom claims');
          setBusinessId(null);
          setRole(null);
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
