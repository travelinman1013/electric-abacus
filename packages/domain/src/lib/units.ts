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

// Unit conversion factors - all conversions are to the base unit of each category
const WEIGHT_CONVERSIONS: Record<string, number> = {
  // Base unit: grams
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const VOLUME_US_CONVERSIONS: Record<string, number> = {
  // Base unit: fluid ounces
  tsp: 1 / 6, // 1/6 fl oz
  tbsp: 0.5, // 1/2 fl oz
  cup: 8, // 8 fl oz
  pt: 16, // 16 fl oz
  qt: 32, // 32 fl oz
  gal: 128, // 128 fl oz
};

const VOLUME_METRIC_CONVERSIONS: Record<string, number> = {
  // Base unit: milliliters
  ml: 1,
  l: 1000,
};

const COUNT_CONVERSIONS: Record<string, number> = {
  // Base unit: each
  each: 1,
  count: 1,
  case: 1, // Note: case conversion depends on context, handled separately
};

// Unit categories for conversion compatibility
const UNIT_CATEGORIES = {
  weight: new Set(['g', 'kg', 'oz', 'lb']),
  volume_us: new Set(['tsp', 'tbsp', 'cup', 'pt', 'qt', 'gal']),
  volume_metric: new Set(['ml', 'l']),
  count: new Set(['each', 'count', 'case']),
} as const;

type UnitCategory = keyof typeof UNIT_CATEGORIES;

/**
 * Determines the category of a unit
 */
function getUnitCategory(unit: string): UnitCategory | null {
  for (const [category, units] of Object.entries(UNIT_CATEGORIES)) {
    if (units.has(unit as AllowedUnit)) {
      return category as UnitCategory;
    }
  }
  return null;
}

/**
 * Calculates the conversion factor from one unit to another
 * @param fromUnit - The unit to convert from (inventory unit)
 * @param toUnit - The unit to convert to (recipe unit)
 * @returns The conversion factor (how many toUnits are in one fromUnit), or null if conversion is not possible
 *
 * @example
 * getConversionFactor('lb', 'oz') // Returns 16 (16 oz in 1 lb)
 * getConversionFactor('gal', 'cup') // Returns 16 (16 cups in 1 gal)
 * getConversionFactor('lb', 'ml') // Returns null (incompatible units)
 */
export function getConversionFactor(fromUnit: string, toUnit: string): number | null {
  // Check if units are valid first
  if (!isValidUnit(fromUnit) || !isValidUnit(toUnit)) {
    return null;
  }

  // Same unit - no conversion needed
  if (fromUnit === toUnit) {
    return 1;
  }

  const fromCategory = getUnitCategory(fromUnit);
  const toCategory = getUnitCategory(toUnit);

  // Units must be in the same category to convert
  if (!fromCategory || !toCategory || fromCategory !== toCategory) {
    return null;
  }

  let conversionMap: Record<string, number>;

  switch (fromCategory) {
    case 'weight':
      conversionMap = WEIGHT_CONVERSIONS;
      break;
    case 'volume_us':
      conversionMap = VOLUME_US_CONVERSIONS;
      break;
    case 'volume_metric':
      conversionMap = VOLUME_METRIC_CONVERSIONS;
      break;
    case 'count':
      conversionMap = COUNT_CONVERSIONS;
      break;
    default:
      return null;
  }

  const fromFactor = conversionMap[fromUnit];
  const toFactor = conversionMap[toUnit];

  if (fromFactor === undefined || toFactor === undefined) {
    return null;
  }

  // Convert fromUnit to base unit, then base unit to toUnit
  return fromFactor / toFactor;
}

/**
 * Checks if two units are compatible for conversion
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  return getConversionFactor(unit1, unit2) !== null;
}

/**
 * Gets all units in the same category as the given unit
 */
export function getCompatibleUnits(unit: string): AllowedUnit[] {
  const category = getUnitCategory(unit);
  if (!category) {
    return [];
  }

  return Array.from(UNIT_CATEGORIES[category]) as AllowedUnit[];
}
