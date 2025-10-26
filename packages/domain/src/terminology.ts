/**
 * Default business terminology configuration
 *
 * This constant defines the default labels for all customizable business entities.
 * Users can override these defaults to match their specific business language.
 *
 * @example
 * // A restaurant might use these defaults:
 * // "Ingredients" -> "Ingredients"
 * // "Menu Items" -> "Menu Items"
 *
 * @example
 * // A retail business might customize to:
 * // "Ingredients" -> "Products"
 * // "Menu Items" -> "Items"
 */
export const DEFAULT_TERMINOLOGY = {
  ingredients: "Ingredients",
  ingredient: "Ingredient",
  menuItems: "Menu Items",
  menuItem: "Menu Item",
  recipes: "Recipes",
  recipe: "Recipe",
  weeks: "Weeks",
  week: "Week",
  inventory: "Inventory",
} as const;

/**
 * Type representing valid terminology keys
 *
 * Use this type to ensure type-safe access to terminology fields.
 *
 * @example
 * const key: TerminologyKey = "ingredients"; // valid
 * const invalidKey: TerminologyKey = "invalid"; // type error
 */
export type TerminologyKey = keyof typeof DEFAULT_TERMINOLOGY;

/**
 * Type representing custom terminology configuration
 *
 * This type ensures that custom terminology objects have the same
 * structure as DEFAULT_TERMINOLOGY.
 *
 * @example
 * const customTerms: CustomTerminology = {
 *   ingredients: "Products",
 *   ingredient: "Product",
 *   menuItems: "Items",
 *   menuItem: "Item",
 *   recipes: "Formulas",
 *   recipe: "Formula",
 *   weeks: "Periods",
 *   week: "Period",
 *   inventory: "Stock",
 * };
 */
export type CustomTerminology = typeof DEFAULT_TERMINOLOGY;
