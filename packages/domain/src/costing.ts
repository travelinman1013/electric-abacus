import type {
  ComputeReportSummaryInput,
  CostOfSalesBreakdown,
  ReportSummary,
  WeeklyCostSnapshotEntry,
  WeeklyInventoryEntry
} from './types';

const ensureNumber = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
};

const clampNonNegative = (value: number): number => (value < 0 ? 0 : value);

export const computeUsage = (entry: WeeklyInventoryEntry): number => {
  const begin = clampNonNegative(ensureNumber(entry.begin));
  const received = clampNonNegative(ensureNumber(entry.received));
  const end = clampNonNegative(ensureNumber(entry.end));

  const usage = begin + received - end;

  return clampNonNegative(Number.isFinite(usage) ? usage : 0);
};

export const computeUsageByIngredient = (
  inventory: WeeklyInventoryEntry[]
): Record<string, number> =>
  inventory.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.ingredientId] = computeUsage(entry);
    return acc;
  }, {});

export interface ComputeCostOfSalesInput {
  usageByIngredient: Record<string, number>;
  costSnapshots: WeeklyCostSnapshotEntry[];
}

export interface ComputeCostOfSalesResult {
  breakdown: CostOfSalesBreakdown[];
  totalCostOfSales: number;
}

export const computeCostOfSales = (
  input: ComputeCostOfSalesInput
): ComputeCostOfSalesResult => {
  const snapshotById = new Map(
    input.costSnapshots.map((snapshot) => [snapshot.ingredientId, snapshot])
  );

  const breakdown: CostOfSalesBreakdown[] = Object.entries(input.usageByIngredient).map(
    ([ingredientId, usage]) => {
      const snapshot = snapshotById.get(ingredientId);
      const unitCost = snapshot ? clampNonNegative(ensureNumber(snapshot.unitCost)) : 0;
      const sourceVersionId = snapshot?.sourceVersionId ?? 'unspecified';
      const normalizedUsage = clampNonNegative(ensureNumber(usage));
      const costOfSales = normalizedUsage * unitCost;

      return {
        ingredientId,
        usage: normalizedUsage,
        unitCost,
        costOfSales,
        sourceVersionId
      } satisfies CostOfSalesBreakdown;
    }
  );

  const totalCostOfSales = breakdown.reduce((total, item) => total + item.costOfSales, 0);

  return {
    breakdown,
    totalCostOfSales
  };
};

export const computeReportSummary = (input: ComputeReportSummaryInput): ReportSummary => {
  const usageByIngredient = computeUsageByIngredient(input.inventory);
  const { breakdown, totalCostOfSales } = computeCostOfSales({
    usageByIngredient,
    costSnapshots: input.costSnapshots
  });

  const totalUsageUnits = Object.values(usageByIngredient).reduce(
    (total, usage) => total + usage,
    0
  );

  const ingredientCostShare = breakdown.reduce<Record<string, number>>((acc, item) => {
    acc[item.ingredientId] = totalCostOfSales
      ? Number((item.costOfSales / totalCostOfSales).toFixed(4))
      : 0;
    return acc;
  }, {});

  const now = input.now ?? (() => new Date());

  return {
    computedAt: now().toISOString(),
    totals: {
      totalUsageUnits: Number(totalUsageUnits.toFixed(2)),
      totalCostOfSales: Number(totalCostOfSales.toFixed(2))
    },
    percentages: {
      ingredientCostShare
    },
    breakdown: breakdown.map((item) => ({
      ...item,
      usage: Number(item.usage.toFixed(2)),
      unitCost: Number(item.unitCost.toFixed(4)),
      costOfSales: Number(item.costOfSales.toFixed(2))
    }))
  } satisfies ReportSummary;
};
