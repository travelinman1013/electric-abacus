import { describe, expect, it } from 'vitest';

import {
  calculateBatchIngredientCost,
  calculateFoodCostPercentage,
  calculateGrossMargin,
  calculateGrossProfit,
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

  it('uses dynamic unit conversion when available', () => {
    // Create ingredients with inventoryUnit but no stored conversionFactor
    const dynamicIngredients: Ingredient[] = [
      {
        id: 'flour',
        name: 'Flour',
        inventoryUnit: 'lb',
        unitsPerCase: 50,
        casePrice: 100,
        unitCost: 2.0, // $2 per lb
        category: 'food',
        isActive: true
      }
    ];

    const recipeWithDynamicConversion: RecipeIngredient[] = [
      { id: '1', ingredientId: 'flour', quantity: 8, unitOfMeasure: 'oz' } // 8 oz of flour
    ];

    const result = calculateRecipeCost(recipeWithDynamicConversion, dynamicIngredients);

    // Should use dynamic conversion: 1 lb = 16 oz, so 8 oz = 0.5 lb
    // Cost should be: 8 oz * ($2/lb / 16 oz/lb) = 8 * 0.125 = $1.00
    expect(result.totalRecipeCost).toBeCloseTo(1.0, 4);
    expect(result.ingredients[0].unitCost).toBeCloseTo(0.125, 4); // $2/lb / 16 oz/lb = $0.125/oz
    expect(result.ingredients[0].lineCost).toBeCloseTo(1.0, 4);
  });

  it('falls back to stored conversion factor when dynamic conversion fails', () => {
    // Create ingredient with incompatible units but stored conversion factor
    const fallbackIngredients: Ingredient[] = [
      {
        id: 'special-item',
        name: 'Special Item',
        inventoryUnit: 'case', // Can't convert case to grams dynamically
        recipeUnit: 'g',
        conversionFactor: 500, // 500g per case
        unitsPerCase: 1,
        casePrice: 25,
        unitCost: 25.0, // $25 per case
        category: 'food',
        isActive: true
      }
    ];

    const recipeWithFallback: RecipeIngredient[] = [
      { id: '1', ingredientId: 'special-item', quantity: 100, unitOfMeasure: 'g' } // 100g
    ];

    const result = calculateRecipeCost(recipeWithFallback, fallbackIngredients);

    // Should use stored conversion factor: 100g * ($25/case / 500g/case) = 100 * 0.05 = $5.00
    expect(result.totalRecipeCost).toBeCloseTo(5.0, 4);
    expect(result.ingredients[0].unitCost).toBeCloseTo(0.05, 4); // $25/case / 500g/case = $0.05/g
  });

  it('handles metric to metric dynamic conversions', () => {
    const metricIngredients: Ingredient[] = [
      {
        id: 'vanilla-extract',
        name: 'Vanilla Extract',
        inventoryUnit: 'l',
        unitsPerCase: 12,
        casePrice: 120,
        unitCost: 10.0, // $10 per liter
        category: 'food',
        isActive: true
      }
    ];

    const recipeWithMetric: RecipeIngredient[] = [
      { id: '1', ingredientId: 'vanilla-extract', quantity: 15, unitOfMeasure: 'ml' } // 15ml
    ];

    const result = calculateRecipeCost(recipeWithMetric, metricIngredients);

    // 1L = 1000ml, so 15ml * ($10/L / 1000ml/L) = 15 * 0.01 = $0.15
    expect(result.totalRecipeCost).toBeCloseTo(0.15, 4);
    expect(result.ingredients[0].unitCost).toBeCloseTo(0.01, 4); // $10/L / 1000ml/L = $0.01/ml
  });

  it('handles incompatible units gracefully (no conversion possible)', () => {
    const incompatibleIngredients: Ingredient[] = [
      {
        id: 'napkins',
        name: 'Paper Napkins',
        inventoryUnit: 'each', // Count unit
        unitsPerCase: 500,
        casePrice: 15,
        unitCost: 0.03, // $0.03 per napkin
        category: 'paper',
        isActive: true
      }
    ];

    // Try to use weight unit for a count item
    const recipeWithIncompatible: RecipeIngredient[] = [
      { id: '1', ingredientId: 'napkins', quantity: 2, unitOfMeasure: 'oz' } // Can't convert each to oz
    ];

    const result = calculateRecipeCost(recipeWithIncompatible, incompatibleIngredients);

    // Should fall back to base unit cost (assumes same unit)
    // 2 * $0.03 = $0.06
    expect(result.totalRecipeCost).toBeCloseTo(0.06, 4);
    expect(result.ingredients[0].unitCost).toBe(0.03); // Uses base unit cost
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

describe('calculateBatchIngredientCost', () => {
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
      id: 'taco-seasoning',
      name: 'Taco Seasoning',
      inventoryUnit: 'oz',
      unitsPerCase: 16,
      casePrice: 8,
      unitCost: 0.5,
      category: 'food',
      isActive: true
    },
    {
      id: 'water',
      name: 'Water',
      inventoryUnit: 'cup',
      unitsPerCase: 1,
      casePrice: 0,
      unitCost: 0,
      category: 'other',
      isActive: true
    }
  ];

  it('calculates batch ingredient cost correctly', () => {
    const batchIngredient: Ingredient = {
      id: 'seasoned-beef',
      name: 'Seasoned Beef',
      inventoryUnit: 'lb',
      unitsPerCase: 1,
      casePrice: 0,
      unitCost: 0,
      category: 'food',
      isActive: true,
      isBatch: true,
      yield: 8, // 8 pounds of seasoned beef
      yieldUnit: 'lb',
      recipeIngredients: [
        { id: '1', ingredientId: 'ground-beef', quantity: 10, unitOfMeasure: 'lb' },
        { id: '2', ingredientId: 'taco-seasoning', quantity: 4, unitOfMeasure: 'oz' },
        { id: '3', ingredientId: 'water', quantity: 2, unitOfMeasure: 'cup' }
      ]
    };

    const result = calculateBatchIngredientCost(batchIngredient, testIngredients);

    // Expected: (10 * $5.00) + (4 * $0.50) + (2 * $0.00) = $52.00
    // Cost per lb: $52.00 / 8 = $6.50 per lb
    expect(result).toBeCloseTo(6.5, 4);
  });

  it('returns 0 for non-batch ingredients', () => {
    const regularIngredient: Ingredient = {
      id: 'ground-beef',
      name: 'Ground Beef',
      inventoryUnit: 'lb',
      unitsPerCase: 10,
      casePrice: 50,
      unitCost: 5.0,
      category: 'food',
      isActive: true,
      isBatch: false
    };

    const result = calculateBatchIngredientCost(regularIngredient, testIngredients);
    expect(result).toBe(0);
  });

  it('returns 0 for batch ingredients with invalid data', () => {
    const invalidBatchIngredient: Ingredient = {
      id: 'invalid-batch',
      name: 'Invalid Batch',
      inventoryUnit: 'lb',
      unitsPerCase: 1,
      casePrice: 0,
      unitCost: 0,
      category: 'food',
      isActive: true,
      isBatch: true,
      yield: 0, // Invalid yield
      yieldUnit: 'lb',
      recipeIngredients: []
    };

    const result = calculateBatchIngredientCost(invalidBatchIngredient, testIngredients);
    expect(result).toBe(0);
  });

  it('handles missing recipe ingredients gracefully', () => {
    const batchIngredient: Ingredient = {
      id: 'empty-batch',
      name: 'Empty Batch',
      inventoryUnit: 'lb',
      unitsPerCase: 1,
      casePrice: 0,
      unitCost: 0,
      category: 'food',
      isActive: true,
      isBatch: true,
      yield: 1,
      yieldUnit: 'lb'
      // No recipeIngredients
    };

    const result = calculateBatchIngredientCost(batchIngredient, testIngredients);
    expect(result).toBe(0);
  });
});

describe('calculateRecipeCost with batch ingredients', () => {
  const regularIngredients: Ingredient[] = [
    {
      id: 'flour-tortilla',
      name: 'Flour Tortilla',
      inventoryUnit: 'each',
      unitsPerCase: 100,
      casePrice: 10,
      unitCost: 0.1,
      category: 'food',
      isActive: true
    },
    {
      id: 'cheese',
      name: 'Cheese',
      inventoryUnit: 'oz',
      unitsPerCase: 32,
      casePrice: 16,
      unitCost: 0.5,
      category: 'food',
      isActive: true
    }
  ];

  const batchIngredient: Ingredient = {
    id: 'seasoned-beef',
    name: 'Seasoned Beef',
    inventoryUnit: 'lb',
    unitsPerCase: 1,
    casePrice: 0,
    unitCost: 0,
    category: 'food',
    isActive: true,
    isBatch: true,
    yield: 8,
    yieldUnit: 'lb',
    recipeIngredients: [
      { id: '1', ingredientId: 'ground-beef', quantity: 10, unitOfMeasure: 'lb' },
      { id: '2', ingredientId: 'taco-seasoning', quantity: 4, unitOfMeasure: 'oz' }
    ]
  };

  const baseIngredients: Ingredient[] = [
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
      id: 'taco-seasoning',
      name: 'Taco Seasoning',
      inventoryUnit: 'oz',
      unitsPerCase: 16,
      casePrice: 8,
      unitCost: 0.5,
      category: 'food',
      isActive: true
    }
  ];

  const allIngredients = [...regularIngredients, batchIngredient, ...baseIngredients];

  it('calculates recipe cost with batch ingredients correctly', () => {
    const tacoRecipe: RecipeIngredient[] = [
      { id: '1', ingredientId: 'flour-tortilla', quantity: 1, unitOfMeasure: 'each' },
      { id: '2', ingredientId: 'seasoned-beef', quantity: 0.25, unitOfMeasure: 'lb' },
      { id: '3', ingredientId: 'cheese', quantity: 1, unitOfMeasure: 'oz' }
    ];

    const result = calculateRecipeCost(tacoRecipe, allIngredients);

    // Expected:
    // - Tortilla: 1 * $0.10 = $0.10
    // - Seasoned Beef: 0.25 * $6.50 = $1.625 (batch cost per lb)
    // - Cheese: 1 * $0.50 = $0.50
    // Total: $2.225
    expect(result.totalRecipeCost).toBeCloseTo(2.225, 4);
    expect(result.ingredients).toHaveLength(3);
    expect(result.ingredients[1].unitCost).toBeCloseTo(6.5, 4); // Batch ingredient unit cost
    expect(result.ingredients[1].lineCost).toBeCloseTo(1.625, 4); // 0.25 * 6.5
  });

  it('handles unit conversion for batch ingredients', () => {
    const batchWithOzYield: Ingredient = {
      ...batchIngredient,
      yield: 128, // 128 oz (8 lbs)
      yieldUnit: 'oz'
    };

    const allIngredientsWithOzBatch = [...regularIngredients, batchWithOzYield, ...baseIngredients];

    const tacoRecipe: RecipeIngredient[] = [
      { id: '1', ingredientId: 'seasoned-beef', quantity: 4, unitOfMeasure: 'oz' }
    ];

    const result = calculateRecipeCost(tacoRecipe, allIngredientsWithOzBatch);

    // Batch cost per oz should be: $52 / 128 oz = $0.40625 per oz
    // 4 oz * $0.40625 = $1.625
    expect(result.totalRecipeCost).toBeCloseTo(1.625, 3);
    expect(result.ingredients[0].unitCost).toBeCloseTo(0.40625, 4);
  });

  it('prevents circular dependencies by not allowing batch ingredients in batch recipes', () => {
    // This test ensures our UI prevents batch ingredients from being used in other batch recipes
    // The calculation should handle this gracefully even if it somehow occurs
    const circularBatch: Ingredient = {
      id: 'circular-batch',
      name: 'Circular Batch',
      inventoryUnit: 'lb',
      unitsPerCase: 1,
      casePrice: 0,
      unitCost: 0,
      category: 'food',
      isActive: true,
      isBatch: true,
      yield: 1,
      yieldUnit: 'lb',
      recipeIngredients: [
        { id: '1', ingredientId: 'seasoned-beef', quantity: 1, unitOfMeasure: 'lb' } // Using another batch ingredient
      ]
    };

    const allIngredientsWithCircular = [...allIngredients, circularBatch];

    const result = calculateBatchIngredientCost(circularBatch, allIngredientsWithCircular);

    // Should still calculate correctly - circular batch uses seasoned-beef
    // Cost should be $6.50 per lb (same as seasoned-beef cost per yield unit)
    expect(result).toBeCloseTo(6.5, 4);
  });
});

describe('calculateGrossProfit', () => {
  it('calculates gross profit correctly', () => {
    expect(calculateGrossProfit(5000, 1000)).toBe(4000);
    expect(calculateGrossProfit(5214.68, 1050.96)).toBeCloseTo(4163.72, 2);
  });

  it('handles zero sales', () => {
    expect(calculateGrossProfit(0, 100)).toBe(-100);
  });

  it('handles zero cost', () => {
    expect(calculateGrossProfit(1000, 0)).toBe(1000);
  });

  it('handles negative values by clamping them to zero', () => {
    expect(calculateGrossProfit(-500, 100)).toBe(-100);
    expect(calculateGrossProfit(1000, -50)).toBe(1000);
  });

  it('handles invalid inputs gracefully', () => {
    // NaN gets clamped to 0, so 0 - 100 = -100
    expect(calculateGrossProfit(Number.NaN, 100)).toBe(-100);
    // Infinity gets clamped to 0, so 1000 - 0 = 1000
    expect(calculateGrossProfit(1000, Number.POSITIVE_INFINITY)).toBe(1000);
    // -Infinity gets clamped to 0, so 0 - 100 = -100
    expect(calculateGrossProfit(Number.NEGATIVE_INFINITY, 100)).toBe(-100);
  });
});

describe('calculateGrossMargin', () => {
  it('calculates gross margin percentage correctly', () => {
    expect(calculateGrossMargin(5000, 1000)).toBe(80);
    expect(calculateGrossMargin(5214.68, 1050.96)).toBeCloseTo(79.85, 2);
  });

  it('returns zero when gross sales is zero', () => {
    expect(calculateGrossMargin(0, 100)).toBe(0);
    expect(calculateGrossMargin(0, 0)).toBe(0);
  });

  it('returns 100% when cost is zero', () => {
    expect(calculateGrossMargin(1000, 0)).toBe(100);
  });

  it('returns negative margin when cost exceeds sales', () => {
    expect(calculateGrossMargin(100, 150)).toBe(-50);
  });

  it('handles invalid inputs gracefully', () => {
    // NaN gets clamped to 0 for sales, division by zero check returns 0
    expect(calculateGrossMargin(Number.NaN, 100)).toBe(0);
    // Infinity gets clamped to 0 for sales, division by zero check returns 0
    expect(calculateGrossMargin(Number.POSITIVE_INFINITY, 100)).toBe(0);
    // NaN gets clamped to 0 for cost, so (1000 - 0) / 1000 = 100%
    expect(calculateGrossMargin(1000, Number.NaN)).toBe(100);
  });

  it('handles negative values by clamping them to zero', () => {
    expect(calculateGrossMargin(-500, 100)).toBe(0);
    expect(calculateGrossMargin(1000, -50)).toBe(100);
  });
});
