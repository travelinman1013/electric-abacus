import { describe, expect, it } from 'vitest';

import {
  areUnitsCompatible,
  formatQuantity,
  getCompatibleUnits,
  getConversionFactor,
  isValidUnit,
  UNIT_LABELS,
  ALLOWED_UNITS,
  type AllowedUnit,
} from '../lib/units';

describe('isValidUnit', () => {
  it('returns true for valid units', () => {
    expect(isValidUnit('lb')).toBe(true);
    expect(isValidUnit('oz')).toBe(true);
    expect(isValidUnit('gal')).toBe(true);
    expect(isValidUnit('ml')).toBe(true);
    expect(isValidUnit('each')).toBe(true);
  });

  it('returns false for invalid units', () => {
    expect(isValidUnit('invalid')).toBe(false);
    expect(isValidUnit('')).toBe(false);
    expect(isValidUnit('pounds')).toBe(false);
  });
});

describe('formatQuantity', () => {
  it('formats quantities with proper labels', () => {
    expect(formatQuantity(1.5, 'lb')).toBe('1.5 pounds');
    expect(formatQuantity(2, 'oz')).toBe('2 ounces');
    expect(formatQuantity(0.5, 'cup')).toBe('0.5 cups');
  });

  it('handles singular count units correctly', () => {
    expect(formatQuantity(1, 'each')).toBe('1 each');
    expect(formatQuantity(1, 'count')).toBe('1 count');
    expect(formatQuantity(1, 'case')).toBe('1 case');
  });

  it('handles plural count units correctly', () => {
    expect(formatQuantity(2, 'each')).toBe('2 each');
    expect(formatQuantity(5, 'count')).toBe('5 count');
    expect(formatQuantity(3, 'case')).toBe('3 case');
  });
});

describe('getConversionFactor', () => {
  describe('weight conversions', () => {
    it('converts pounds to ounces correctly', () => {
      expect(getConversionFactor('lb', 'oz')).toBeCloseTo(16, 1);
    });

    it('converts kilograms to grams correctly', () => {
      expect(getConversionFactor('kg', 'g')).toBe(1000);
    });

    it('converts pounds to grams correctly', () => {
      expect(getConversionFactor('lb', 'g')).toBeCloseTo(453.592, 2);
    });

    it('converts ounces to pounds correctly', () => {
      expect(getConversionFactor('oz', 'lb')).toBeCloseTo(1/16, 4);
    });

    it('converts grams to kilograms correctly', () => {
      expect(getConversionFactor('g', 'kg')).toBe(0.001);
    });
  });

  describe('US volume conversions', () => {
    it('converts gallons to cups correctly', () => {
      expect(getConversionFactor('gal', 'cup')).toBe(16);
    });

    it('converts gallons to fluid ounces correctly', () => {
      expect(getConversionFactor('gal', 'tsp')).toBe(768); // 128 * 6
    });

    it('converts quarts to pints correctly', () => {
      expect(getConversionFactor('qt', 'pt')).toBe(2);
    });

    it('converts cups to tablespoons correctly', () => {
      expect(getConversionFactor('cup', 'tbsp')).toBe(16);
    });

    it('converts tablespoons to teaspoons correctly', () => {
      expect(getConversionFactor('tbsp', 'tsp')).toBe(3);
    });
  });

  describe('metric volume conversions', () => {
    it('converts liters to milliliters correctly', () => {
      expect(getConversionFactor('l', 'ml')).toBe(1000);
    });

    it('converts milliliters to liters correctly', () => {
      expect(getConversionFactor('ml', 'l')).toBe(0.001);
    });
  });

  describe('count conversions', () => {
    it('handles count unit conversions', () => {
      expect(getConversionFactor('each', 'count')).toBe(1);
      expect(getConversionFactor('count', 'each')).toBe(1);
      expect(getConversionFactor('case', 'each')).toBe(1);
    });
  });

  describe('same unit conversions', () => {
    it('returns 1 for same unit conversions', () => {
      expect(getConversionFactor('lb', 'lb')).toBe(1);
      expect(getConversionFactor('oz', 'oz')).toBe(1);
      expect(getConversionFactor('gal', 'gal')).toBe(1);
      expect(getConversionFactor('ml', 'ml')).toBe(1);
      expect(getConversionFactor('each', 'each')).toBe(1);
    });
  });

  describe('incompatible unit conversions', () => {
    it('returns null for incompatible unit types', () => {
      expect(getConversionFactor('lb', 'gal')).toBeNull();
      expect(getConversionFactor('oz', 'ml')).toBeNull();
      expect(getConversionFactor('cup', 'g')).toBeNull();
      expect(getConversionFactor('each', 'lb')).toBeNull();
      expect(getConversionFactor('tsp', 'ml')).toBeNull(); // US vs metric volume
    });

    it('returns null for invalid units', () => {
      expect(getConversionFactor('invalid', 'lb')).toBeNull();
      expect(getConversionFactor('lb', 'invalid')).toBeNull();
      expect(getConversionFactor('invalid', 'invalid')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles empty strings', () => {
      expect(getConversionFactor('', 'lb')).toBeNull();
      expect(getConversionFactor('lb', '')).toBeNull();
    });

    it('handles undefined-like values', () => {
      expect(getConversionFactor('undefined', 'lb')).toBeNull();
      expect(getConversionFactor('null', 'lb')).toBeNull();
    });
  });
});

describe('areUnitsCompatible', () => {
  it('returns true for compatible units', () => {
    expect(areUnitsCompatible('lb', 'oz')).toBe(true);
    expect(areUnitsCompatible('gal', 'cup')).toBe(true);
    expect(areUnitsCompatible('l', 'ml')).toBe(true);
    expect(areUnitsCompatible('each', 'count')).toBe(true);
  });

  it('returns false for incompatible units', () => {
    expect(areUnitsCompatible('lb', 'gal')).toBe(false);
    expect(areUnitsCompatible('oz', 'ml')).toBe(false);
    expect(areUnitsCompatible('cup', 'g')).toBe(false);
    expect(areUnitsCompatible('tsp', 'ml')).toBe(false);
  });

  it('returns true for same units', () => {
    expect(areUnitsCompatible('lb', 'lb')).toBe(true);
    expect(areUnitsCompatible('gal', 'gal')).toBe(true);
  });
});

describe('getCompatibleUnits', () => {
  it('returns weight units for weight input', () => {
    const weightUnits = getCompatibleUnits('lb');
    expect(weightUnits).toContain('lb');
    expect(weightUnits).toContain('oz');
    expect(weightUnits).toContain('g');
    expect(weightUnits).toContain('kg');
    expect(weightUnits).not.toContain('gal');
    expect(weightUnits).not.toContain('each');
  });

  it('returns US volume units for US volume input', () => {
    const volumeUnits = getCompatibleUnits('gal');
    expect(volumeUnits).toContain('gal');
    expect(volumeUnits).toContain('cup');
    expect(volumeUnits).toContain('tsp');
    expect(volumeUnits).toContain('tbsp');
    expect(volumeUnits).not.toContain('ml');
    expect(volumeUnits).not.toContain('lb');
  });

  it('returns metric volume units for metric volume input', () => {
    const metricUnits = getCompatibleUnits('ml');
    expect(metricUnits).toContain('ml');
    expect(metricUnits).toContain('l');
    expect(metricUnits).not.toContain('gal');
    expect(metricUnits).not.toContain('lb');
  });

  it('returns count units for count input', () => {
    const countUnits = getCompatibleUnits('each');
    expect(countUnits).toContain('each');
    expect(countUnits).toContain('count');
    expect(countUnits).toContain('case');
    expect(countUnits).not.toContain('lb');
    expect(countUnits).not.toContain('ml');
  });

  it('returns empty array for invalid unit', () => {
    expect(getCompatibleUnits('invalid')).toEqual([]);
    expect(getCompatibleUnits('')).toEqual([]);
  });
});

describe('UNIT_LABELS and ALLOWED_UNITS consistency', () => {
  it('has labels for all allowed units', () => {
    for (const unit of ALLOWED_UNITS) {
      expect(UNIT_LABELS).toHaveProperty(unit);
      expect(typeof UNIT_LABELS[unit]).toBe('string');
      expect(UNIT_LABELS[unit].length).toBeGreaterThan(0);
    }
  });

  it('has no extra labels beyond allowed units', () => {
    const labelKeys = Object.keys(UNIT_LABELS) as AllowedUnit[];
    for (const key of labelKeys) {
      expect(ALLOWED_UNITS).toContain(key);
    }
  });
});

describe('real-world conversion scenarios', () => {
  it('handles typical cooking ingredient conversions', () => {
    // 1 pound of flour to ounces
    expect(getConversionFactor('lb', 'oz')).toBeCloseTo(16, 1);

    // 1 gallon of milk to cups
    expect(getConversionFactor('gal', 'cup')).toBe(16);

    // 1 tablespoon to teaspoons
    expect(getConversionFactor('tbsp', 'tsp')).toBe(3);

    // 1 kilogram to grams
    expect(getConversionFactor('kg', 'g')).toBe(1000);
  });

  it('handles edge case conversions accurately', () => {
    // Very small conversions
    expect(getConversionFactor('tsp', 'gal')).toBeCloseTo(1/768, 6);

    // Very large conversions
    expect(getConversionFactor('kg', 'oz')).toBeCloseTo(35.274, 2);
  });
});