import type {
  ComputeReportSummaryInput,
  CostOfSalesBreakdown,
  Ingredient,
  RecipeCostSummary,
  RecipeIngredient,
  RecipeIngredientCost,
  ReportSummary,
  WeeklyCostSnapshotEntry,
  WeeklyInventoryEntry
} from './types';
import { getConversionFactor } from './lib/units';

export { getConversionFactor };

// Re-export types for convenience
export type {
  Ingredient,
  IngredientCategory,
  IngredientVersion,
  MenuItem,
  RecipeIngredient,
  RecipeIngredientCost,
  RecipeCostSummary,
  ReportSummary,
  Week,
  WeekStatus,
  WeeklyCostSnapshotEntry,
  WeeklyInventoryEntry,
  WeeklySales,
  UserProfile,
  UserRole,
  ComputeReportSummaryInput,
  CostOfSalesBreakdown
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

export const calculateBatchIngredientCost = (
  batchIngredient: Ingredient,
  allIngredients: Ingredient[]
): number => {
  // Validate batch ingredient
  if (!batchIngredient.isBatch || !batchIngredient.recipeIngredients || !batchIngredient.yield || batchIngredient.yield <= 0) {
    return 0;
  }

  // Calculate total cost of the batch recipe
  const recipeCostSummary = calculateRecipeCost(batchIngredient.recipeIngredients, allIngredients);
  const totalBatchCost = recipeCostSummary.totalRecipeCost;

  // Calculate cost per unit of yield
  const costPerYieldUnit = totalBatchCost / batchIngredient.yield;

  return Number(costPerYieldUnit.toFixed(4));
};

export const calculateRecipeCost = (
  recipes: RecipeIngredient[],
  ingredients: Ingredient[]
): RecipeCostSummary => {
  const ingredientMap = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));

  const ingredientCosts: RecipeIngredientCost[] = recipes.map((recipe) => {
    const ingredient = ingredientMap.get(recipe.ingredientId);
    const quantity = clampNonNegative(ensureNumber(recipe.quantity));

    let effectiveUnitCost = 0;

    if (ingredient) {
      if (ingredient.isBatch) {
        // For batch ingredients, calculate cost based on batch recipe
        const batchCostPerYieldUnit = calculateBatchIngredientCost(ingredient, ingredients);

        // Handle unit conversion from batch yield unit to recipe unit
        if (ingredient.yieldUnit && ingredient.yieldUnit !== recipe.unitOfMeasure) {
          const conversionFactor = getConversionFactor(ingredient.yieldUnit, recipe.unitOfMeasure);
          if (conversionFactor !== null) {
            effectiveUnitCost = batchCostPerYieldUnit / conversionFactor;
          } else {
            // If no conversion possible, assume same unit
            effectiveUnitCost = batchCostPerYieldUnit;
          }
        } else {
          effectiveUnitCost = batchCostPerYieldUnit;
        }
      } else {
        // Regular ingredient logic
        const baseUnitCost = clampNonNegative(ensureNumber(ingredient.unitCost));
        effectiveUnitCost = baseUnitCost;

        if (ingredient.inventoryUnit) {
          // Try to get dynamic conversion factor first
          const dynamicConversionFactor = getConversionFactor(ingredient.inventoryUnit, recipe.unitOfMeasure);

          if (dynamicConversionFactor !== null) {
            // Use dynamic conversion
            effectiveUnitCost = baseUnitCost / dynamicConversionFactor;
          } else if (ingredient.recipeUnit && ingredient.conversionFactor && ingredient.conversionFactor > 0) {
            // Fall back to stored conversion factor for backward compatibility
            if (recipe.unitOfMeasure === ingredient.recipeUnit) {
              effectiveUnitCost = baseUnitCost / ingredient.conversionFactor;
            }
          }
          // If no conversion is possible, use base unit cost (assumes same unit)
        }
      }
    }

    const lineCost = quantity * effectiveUnitCost;

    return {
      ingredientId: recipe.ingredientId,
      ingredientName: ingredient?.name ?? 'Unknown Ingredient',
      quantity,
      unitOfMeasure: recipe.unitOfMeasure,
      unitCost: effectiveUnitCost,
      lineCost: Number(lineCost.toFixed(4)),
      category: ingredient?.category ?? 'other'
    } satisfies RecipeIngredientCost;
  });

  const totalRecipeCost = ingredientCosts.reduce((total, item) => total + item.lineCost, 0);

  return {
    totalRecipeCost: Number(totalRecipeCost.toFixed(4)),
    foodCostPercentage: 0, // Will be calculated when selling price is available
    ingredients: ingredientCosts
  } satisfies RecipeCostSummary;
};

export const calculateFoodCostPercentage = (
  recipeCost: number,
  sellingPrice: number
): number => {
  const cost = clampNonNegative(ensureNumber(recipeCost));
  const price = clampNonNegative(ensureNumber(sellingPrice));

  if (price === 0) {
    return 0;
  }

  const percentage = (cost / price) * 100;
  return Number(percentage.toFixed(2));
};

export const calculateRecipeCostWithPercentage = (
  recipes: RecipeIngredient[],
  ingredients: Ingredient[],
  sellingPrice?: number
): RecipeCostSummary => {
  const costSummary = calculateRecipeCost(recipes, ingredients);
  const foodCostPercentage = sellingPrice
    ? calculateFoodCostPercentage(costSummary.totalRecipeCost, sellingPrice)
    : 0;

  return {
    ...costSummary,
    foodCostPercentage
  } satisfies RecipeCostSummary;
};
