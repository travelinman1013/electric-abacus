import { describe, expect, it } from 'vitest';

import {
  calculateFoodCostPercentage,
  calculateRecipeCost,
  calculateRecipeCostWithPercentage,
  computeCostOfSales,
  computeReportSummary,
  computeUsage,
  computeUsageByIngredient
} from '../costing';

import type { Ingredient, RecipeIngredient, WeeklyCostSnapshotEntry, WeeklyInventoryEntry } from '../types';

describe('computeUsage', () => {
  it('computes usage using begin + received - end and clamps at zero', () => {
    const entry: WeeklyInventoryEntry = {
      ingredientId: 'cheese',
      begin: 10,
      received: 5,
      end: 12
    };

    expect(computeUsage(entry)).toBe(3);
  });

  it('returns zero when the calculation would be negative', () => {
    const entry: WeeklyInventoryEntry = {
      ingredientId: 'beef',
      begin: 2,
      received: 1,
      end: 5
    };

    expect(computeUsage(entry)).toBe(0);
  });

  it('guards against invalid values', () => {
    const entry: WeeklyInventoryEntry = {
      ingredientId: 'lettuce',
      begin: Number.NaN,
      received: Number.POSITIVE_INFINITY,
      end: -5
    };

    expect(computeUsage(entry)).toBe(0);
  });
});

describe('computeCostOfSales', () => {
  const usageByIngredient = {
    beef: 10,
    cheese: 5,
    tortillas: 2
  };
  const costSnapshots: WeeklyCostSnapshotEntry[] = [
    { ingredientId: 'beef', unitCost: 2.5, sourceVersionId: 'v1' },
    { ingredientId: 'cheese', unitCost: 1.25, sourceVersionId: 'v3' }
  ];

  it('multiplies usage by unit cost (defaulting to zero when snapshot absent)', () => {
    const result = computeCostOfSales({ usageByIngredient, costSnapshots });

    expect(result.totalCostOfSales).toBeCloseTo(10 * 2.5 + 5 * 1.25, 5);
    expect(result.breakdown).toEqual([
      {
        ingredientId: 'beef',
        usage: 10,
        unitCost: 2.5,
        costOfSales: 25,
        sourceVersionId: 'v1'
      },
      {
        ingredientId: 'cheese',
        usage: 5,
        unitCost: 1.25,
        costOfSales: 6.25,
        sourceVersionId: 'v3'
      },
      {
        ingredientId: 'tortillas',
        usage: 2,
        unitCost: 0,
        costOfSales: 0,
        sourceVersionId: 'unspecified'
      }
    ]);
  });
});

describe('computeReportSummary', () => {
  it('builds a normalized summary including totals and percentages', () => {
    const inventory: WeeklyInventoryEntry[] = [
      { ingredientId: 'beef', begin: 20, received: 5, end: 8 },
      { ingredientId: 'cheese', begin: 10, received: 4, end: 9 }
    ];
    const costSnapshots: WeeklyCostSnapshotEntry[] = [
      { ingredientId: 'beef', unitCost: 2.5, sourceVersionId: 'v1' },
      { ingredientId: 'cheese', unitCost: 1, sourceVersionId: 'v2' }
    ];

    const result = computeReportSummary({
      inventory,
      costSnapshots,
      now: () => new Date('2025-02-02T12:00:00.000Z')
    });

    expect(result.computedAt).toBe('2025-02-02T12:00:00.000Z');
    expect(result.totals.totalUsageUnits).toBeCloseTo(22, 5);
    expect(result.totals.totalCostOfSales).toBeCloseTo(47.5, 5);
    expect(result.breakdown).toHaveLength(2);
    expect(result.percentages.ingredientCostShare.beef).toBeGreaterThan(0);
    expect(result.percentages.ingredientCostShare.cheese).toBeGreaterThan(0);
    expect(
      Object.values(result.percentages.ingredientCostShare).reduce((sum, value) => sum + value, 0)
    ).toBeCloseTo(1);
  });

  it('handles empty inputs gracefully', () => {
    const result = computeReportSummary({ inventory: [], costSnapshots: [] });

    expect(result.breakdown).toEqual([]);
    expect(result.totals.totalUsageUnits).toBe(0);
    expect(result.totals.totalCostOfSales).toBe(0);
  });
});

describe('computeUsageByIngredient', () => {
  it('creates a lookup map keyed by ingredientId', () => {
    const inventory: WeeklyInventoryEntry[] = [
      { ingredientId: 'beef', begin: 5, received: 5, end: 3 },
      { ingredientId: 'cheese', begin: 10, received: 0, end: 4 }
    ];

    expect(computeUsageByIngredient(inventory)).toEqual({ beef: 7, cheese: 6 });
  });
});

describe('calculateRecipeCost', () => {
  const testIngredients: Ingredient[] = [
    {
      id: 'ground-beef',
      name: 'Ground Beef',
      inventoryUnit: 'lb',
      unitsPerCase: 10,
      casePrice: 50,
      unitCost: 5.0,
      category: 'food',
      isActive: true
    },
    {
      id: 'cheddar-cheese',
      name: 'Cheddar Cheese',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 5,
      casePrice: 25,
      unitCost: 5.0,
      category: 'food',
      isActive: true
    },
    {
      id: 'taco-wrapper',
      name: 'Taco Wrapper',
      inventoryUnit: 'each',
      unitsPerCase: 100,
      casePrice: 10,
      unitCost: 0.1,
      category: 'paper',
      isActive: true
    }
  ];

  const testRecipe: RecipeIngredient[] = [
    { id: '1', ingredientId: 'ground-beef', quantity: 0.25, unitOfMeasure: 'lb' },
    { id: '2', ingredientId: 'cheddar-cheese', quantity: 0.1, unitOfMeasure: 'lb' },
    { id: '3', ingredientId: 'taco-wrapper', quantity: 1, unitOfMeasure: 'each' }
  ];

  it('calculates recipe cost from ingredients and quantities', () => {
    const result = calculateRecipeCost(testRecipe, testIngredients);

    expect(result.totalRecipeCost).toBeCloseTo(1.85, 4); // 0.25*5 + 0.1*5 + 1*0.1
    expect(result.ingredients).toHaveLength(3);
    expect(result.ingredients[0].ingredientName).toBe('Ground Beef');
    expect(result.ingredients[0].lineCost).toBeCloseTo(1.25, 4);
    expect(result.ingredients[0].category).toBe('food');
  });

  it('handles missing ingredients gracefully', () => {
    const recipeWithMissingIngredient: RecipeIngredient[] = [
      { id: '1', ingredientId: 'unknown-ingredient', quantity: 1, unitOfMeasure: 'lb' }
    ];

    const result = calculateRecipeCost(recipeWithMissingIngredient, testIngredients);

    expect(result.totalRecipeCost).toBe(0);
    expect(result.ingredients[0].ingredientName).toBe('Unknown Ingredient');
    expect(result.ingredients[0].unitCost).toBe(0);
    expect(result.ingredients[0].category).toBe('other');
  });

  it('handles zero quantities', () => {
    const recipeWithZeroQuantity: RecipeIngredient[] = [
      { id: '1', ingredientId: 'ground-beef', quantity: 0, unitOfMeasure: 'lb' }
    ];

    const result = calculateRecipeCost(recipeWithZeroQuantity, testIngredients);

    expect(result.totalRecipeCost).toBe(0);
    expect(result.ingredients[0].lineCost).toBe(0);
  });

  it('handles unit conversion correctly', () => {
    const recipeWithConversion: RecipeIngredient[] = [
      { id: '1', ingredientId: 'ground-beef', quantity: 4, unitOfMeasure: 'lb' }, // Use inventory unit
      { id: '2', ingredientId: 'cheddar-cheese', quantity: 2, unitOfMeasure: 'oz' }, // Use recipe unit
      { id: '3', ingredientId: 'taco-wrapper', quantity: 1, unitOfMeasure: 'each' }
    ];

    const result = calculateRecipeCost(recipeWithConversion, testIngredients);

    // Ground beef: 4 * 5.0 = 20.00 (no conversion)
    // Cheddar cheese: 2 * (5.0 / 16) = 2 * 0.3125 = 0.625 (conversion applied)
    // Taco wrapper: 1 * 0.1 = 0.1 (no conversion)
    // Total: 20.725
    expect(result.totalRecipeCost).toBeCloseTo(20.725, 4);
    expect(result.ingredients[1].unitCost).toBeCloseTo(0.3125, 4); // Converted unit cost for cheese
    expect(result.ingredients[1].lineCost).toBeCloseTo(0.625, 4); // 2 oz * $0.3125/oz
  });

  it('falls back to inventory unit when recipe uses different unit than expected', () => {
    const recipeWithWrongUnit: RecipeIngredient[] = [
      { id: '1', ingredientId: 'cheddar-cheese', quantity: 0.125, unitOfMeasure: 'lb' } // Use lb instead of oz
    ];

    const result = calculateRecipeCost(recipeWithWrongUnit, testIngredients);

    // Should use inventory unit cost directly: 0.125 * 5.0 = 0.625
    expect(result.totalRecipeCost).toBeCloseTo(0.625, 4);
    expect(result.ingredients[0].unitCost).toBe(5.0); // Original unit cost
  });

  it('handles ingredients without conversion factors', () => {
    const recipeWithNoConversion: RecipeIngredient[] = [
      { id: '1', ingredientId: 'ground-beef', quantity: 0.25, unitOfMeasure: 'lb' }
    ];

    const result = calculateRecipeCost(recipeWithNoConversion, testIngredients);

    expect(result.totalRecipeCost).toBeCloseTo(1.25, 4); // 0.25 * 5.0
    expect(result.ingredients[0].unitCost).toBe(5.0);
  });
});

describe('calculateFoodCostPercentage', () => {
  it('calculates food cost percentage correctly', () => {
    expect(calculateFoodCostPercentage(1.85, 5.99)).toBeCloseTo(30.88, 2);
    expect(calculateFoodCostPercentage(2.50, 10.00)).toBe(25.0);
  });

  it('returns zero when selling price is zero', () => {
    expect(calculateFoodCostPercentage(1.85, 0)).toBe(0);
  });

  it('handles invalid inputs gracefully', () => {
    expect(calculateFoodCostPercentage(Number.NaN, 5.99)).toBe(0);
    expect(calculateFoodCostPercentage(-1, 5.99)).toBe(0);
    expect(calculateFoodCostPercentage(1.85, Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe('calculateRecipeCostWithPercentage', () => {
  const testIngredients: Ingredient[] = [
    {
      id: 'ground-beef',
      name: 'Ground Beef',
      inventoryUnit: 'lb',
      unitsPerCase: 10,
      casePrice: 50,
      unitCost: 5.0,
      category: 'food',
      isActive: true
    }
  ];

  const testRecipe: RecipeIngredient[] = [
    { id: '1', ingredientId: 'ground-beef', quantity: 0.25, unitOfMeasure: 'lb' }
  ];

  it('calculates both recipe cost and food cost percentage', () => {
    const result = calculateRecipeCostWithPercentage(testRecipe, testIngredients, 4.99);

    expect(result.totalRecipeCost).toBeCloseTo(1.25, 4);
    expect(result.foodCostPercentage).toBeCloseTo(25.05, 2);
  });

  it('returns zero percentage when no selling price provided', () => {
    const result = calculateRecipeCostWithPercentage(testRecipe, testIngredients);

    expect(result.totalRecipeCost).toBeCloseTo(1.25, 4);
    expect(result.foodCostPercentage).toBe(0);
  });
});
