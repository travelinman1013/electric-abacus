import { createContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_TERMINOLOGY, type CustomTerminology } from '@domain/terminology';
import { useBusinessProfile } from '../hooks/use-business-profile';

interface TerminologyContextValue {
  terms: CustomTerminology;
  isLoading: boolean;
}

const TerminologyContext = createContext<TerminologyContextValue | undefined>(undefined);

interface TerminologyProviderProps {
  children: ReactNode;
}

/**
 * TerminologyProvider - Provides dynamic business terminology throughout the app
 *
 * This provider merges DEFAULT_TERMINOLOGY with business-specific custom terminology,
 * allowing users to customize labels for business entities (ingredients, menu items, etc.)
 * to match their specific business language.
 *
 * @example
 * // In a component:
 * const { terms } = useTerminology();
 * return <h1>{terms.ingredients}</h1>; // "Products" if customized, or "Ingredients" by default
 *
 * @remarks
 * - Must be placed inside BusinessProvider in the component tree
 * - Fetches business profile with customTerminology from Firestore
 * - Returns DEFAULT_TERMINOLOGY when no business is loaded or no customization exists
 * - Memoizes the merged terms object to prevent unnecessary re-renders
 */
export function TerminologyProvider({ children }: TerminologyProviderProps) {
  const { data: business, isLoading } = useBusinessProfile();

  /**
   * Merge default terminology with custom terminology from business profile
   * Custom terms override defaults while maintaining type safety
   */
  const terms = useMemo<CustomTerminology>(() => {
    if (!business?.customTerminology) {
      return DEFAULT_TERMINOLOGY;
    }

    return {
      ...DEFAULT_TERMINOLOGY,
      ...business.customTerminology,
    } as CustomTerminology;
  }, [business?.customTerminology]);

  const value: TerminologyContextValue = {
    terms,
    isLoading,
  };

  return <TerminologyContext.Provider value={value}>{children}</TerminologyContext.Provider>;
}

export { TerminologyContext };
