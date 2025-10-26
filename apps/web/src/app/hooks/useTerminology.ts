import { useContext } from 'react';
import { TerminologyContext } from '../contexts/TerminologyContext';

/**
 * useTerminology - Custom hook to access business terminology
 *
 * Provides access to the current business's custom terminology configuration,
 * which allows users to customize labels for business entities to match their
 * specific business language.
 *
 * @returns {Object} Terminology context value
 * @returns {CustomTerminology} terms - The merged terminology object (defaults + custom overrides)
 * @returns {boolean} isLoading - Whether the terminology is still loading
 *
 * @throws {Error} If used outside of TerminologyProvider
 *
 * @example
 * // Basic usage
 * function IngredientsList() {
 *   const { terms } = useTerminology();
 *   return <h1>{terms.ingredients}</h1>; // "Products" or "Ingredients"
 * }
 *
 * @example
 * // With loading state
 * function MenuPage() {
 *   const { terms, isLoading } = useTerminology();
 *   if (isLoading) return <div>Loading...</div>;
 *   return <h1>{terms.menuItems}</h1>;
 * }
 *
 * @example
 * // Using different term variations
 * function ItemForm() {
 *   const { terms } = useTerminology();
 *   return (
 *     <>
 *       <h1>Add {terms.ingredient}</h1> // Singular
 *       <Link to="/ingredients">{terms.ingredients}</Link> // Plural
 *     </>
 *   );
 * }
 */
export function useTerminology() {
  const context = useContext(TerminologyContext);

  if (context === undefined) {
    throw new Error('useTerminology must be used within a TerminologyProvider');
  }

  return context;
}
