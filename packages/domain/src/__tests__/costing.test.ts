import { describe, expect, it } from 'vitest';

import {
  computeCostOfSales,
  computeReportSummary,
  computeUsage,
  computeUsageByIngredient
} from '../costing';

import type { WeeklyCostSnapshotEntry, WeeklyInventoryEntry } from '../types';

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
