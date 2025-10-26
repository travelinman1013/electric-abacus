import { createContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_TERMINOLOGY, type CustomTerminology } from '@domain/terminology';
import { useBusiness } from '../providers/business-provider';

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
 * - Uses useBusiness() to get current business context
 * - Returns DEFAULT_TERMINOLOGY when no business is loaded or no customization exists
 * - Memoizes the merged terms object to prevent unnecessary re-renders
 */
export function TerminologyProvider({ children }: TerminologyProviderProps) {
  const { businessId, loading } = useBusiness();

  // TODO: Fetch business profile with customTerminology field when available
  // For now, we'll use DEFAULT_TERMINOLOGY as the base
  // Future: const { data: business } = useQuery(['business', businessId], ...)

  /**
   * Merge default terminology with custom terminology from business profile
   * Custom terms override defaults while maintaining type safety
   */
  const terms = useMemo<CustomTerminology>(() => {
    // TODO: When business profile includes customTerminology:
    // return { ...DEFAULT_TERMINOLOGY, ...business?.customTerminology };

    // For now, return defaults
    // businessId will be used once we fetch business profile with customTerminology
    return businessId ? DEFAULT_TERMINOLOGY : DEFAULT_TERMINOLOGY;
  }, [businessId]); // Will add business?.customTerminology dependency when available

  const value: TerminologyContextValue = {
    terms,
    isLoading: loading,
  };

  return <TerminologyContext.Provider value={value}>{children}</TerminologyContext.Provider>;
}

export { TerminologyContext };
