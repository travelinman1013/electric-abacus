export const ALLOWED_UNITS = [
  'oz',
  'lb',
  'g',
  'kg',
  'tsp',
  'tbsp',
  'cup',
  'pt',
  'qt',
  'gal',
  'ml',
  'l',
  'each',
  'count',
  'case',
] as const;

export type AllowedUnit = (typeof ALLOWED_UNITS)[number];

export const UNIT_LABELS: Record<AllowedUnit, string> = {
  // Weight
  oz: 'ounces',
  lb: 'pounds',
  g: 'grams',
  kg: 'kilograms',

  // Volume (US)
  tsp: 'teaspoons',
  tbsp: 'tablespoons',
  cup: 'cups',
  pt: 'pints',
  qt: 'quarts',
  gal: 'gallons',

  // Volume (Metric)
  ml: 'milliliters',
  l: 'liters',

  // Count
  each: 'each',
  count: 'count',
  case: 'case',
};

export function isValidUnit(unit: string): unit is AllowedUnit {
  return ALLOWED_UNITS.includes(unit as AllowedUnit);
}

export function formatQuantity(quantity: number, unit: AllowedUnit): string {
  const label = UNIT_LABELS[unit];
  if (quantity === 1 && (unit === 'each' || unit === 'count' || unit === 'case')) {
    return `${quantity} ${unit}`;
  }
  return `${quantity} ${label}`;
}
