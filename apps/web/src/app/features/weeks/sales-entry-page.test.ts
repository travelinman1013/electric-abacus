import { describe, expect, it } from 'vitest';

import type { WeeklySalesDay } from '@domain/costing';

import { calculateDailyNet, calculateWeeklyTotals } from './sales-entry-page';

const createDay = (
  foodSales: number,
  drinkSales: number,
  lessSalesTax: number,
  lessPromo: number
): WeeklySalesDay => ({
  foodSales,
  drinkSales,
  lessSalesTax,
  lessPromo
});

describe('calculateDailyNet', () => {
  it('computes net sales rounded to cents', () => {
    const day = createDay(750, 250, 82.5, 10);
    expect(calculateDailyNet(day)).toBeCloseTo(907.5, 2);
  });

  it('treats negative or invalid entries as zero', () => {
    const day = createDay(-100, Number.NaN, -5, Number.NaN);
    expect(calculateDailyNet(day)).toBe(0);
  });

  it('rounds results to two decimal places', () => {
    const day = createDay(60.123, 40, 0.111, 0.111);
    expect(calculateDailyNet(day)).toBeCloseTo(99.9, 2);
  });
});

describe('calculateWeeklyTotals', () => {
  it('aggregates daily totals and net sales across the week', () => {
    const totals = calculateWeeklyTotals({
      mon: createDay(70, 30, 8, 5),
      tue: createDay(110, 40.5, 12.34, 7.01),
      wed: createDay(0, 0, 0, 0)
    });

    expect(totals.grossSales).toBeCloseTo(250.5, 2);
    expect(totals.lessSalesTax).toBeCloseTo(20.34, 2);
    expect(totals.lessPromo).toBeCloseTo(12.01, 2);
    expect(totals.netSales).toBeCloseTo(218.15, 2);
  });

  it('includes all week days even when data is missing', () => {
    const totals = calculateWeeklyTotals({
      fri: createDay(50, 30, 6, 4)
    });

    expect(totals.grossSales).toBeCloseTo(80, 2);
    expect(totals.lessSalesTax).toBeCloseTo(6, 2);
    expect(totals.lessPromo).toBeCloseTo(4, 2);
    expect(totals.netSales).toBeCloseTo(70, 2);
  });

  it('defaults to zero totals when no entries exist', () => {
    const empty = calculateWeeklyTotals({});
    expect(empty.grossSales).toBe(0);
    expect(empty.lessSalesTax).toBe(0);
    expect(empty.lessPromo).toBe(0);
    expect(empty.netSales).toBe(0);
  });
});
