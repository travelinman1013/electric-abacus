import { useContext } from 'react';
import { TerminologyContext } from '../contexts/TerminologyContext';

/**
 * Hook to access the current terminology context
 *
 * @returns The terminology context value containing terms and loading state
 * @throws Error if used outside of TerminologyProvider
 *
 * @example
 * const { terms, isLoading } = useTerminology();
 * return <h1>{terms.ingredients}</h1>;
 */
export function useTerminology() {
  const context = useContext(TerminologyContext);

  if (context === undefined) {
    throw new Error('useTerminology must be used within a TerminologyProvider');
  }

  return context;
}
