export type UserRole = 'owner' | 'teamMember';

export interface UserProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export type WeekStatus = 'draft' | 'finalized';

export interface Week {
  id: string;
  status: WeekStatus;
  createdAt: string;
  finalizedAt: string | null;
  finalizedBy: string | null;
}

export type IngredientCategory = 'food' | 'paper' | 'other';

export interface Ingredient {
  id: string;
  name: string;
  inventoryUnit: string;
  recipeUnit?: string;
  /**
   * Conversion factor from inventory unit to recipe unit.
   * This is automatically calculated when both inventoryUnit and recipeUnit are provided.
   * For backward compatibility, this field may contain manually entered values for existing ingredients.
   * @deprecated Manual entry - use getConversionFactor() from units library instead
   */
  conversionFactor?: number;
  unitsPerCase: number;
  casePrice: number;
  unitCost: number;
  isActive: boolean;
  category: IngredientCategory;
  currentVersionId?: string;
  // Batch ingredient fields
  isBatch?: boolean;
  recipeIngredients?: RecipeIngredient[];
  yield?: number;
  yieldUnit?: string;
}

export interface IngredientVersion {
  id: string;
  ingredientId: string;
  casePrice: number;
  unitsPerCase: number;
  unitCost: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  isActive: boolean;
  sellingPrice?: number;
}

export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  quantity: number;
  unitOfMeasure: string;
}

export interface WeeklySales {
  id: string;
  weekId: string;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface WeeklyInventoryEntry {
  ingredientId: string;
  begin: number;
  received: number;
  end: number;
}

export interface WeeklyCostSnapshotEntry {
  ingredientId: string;
  unitCost: number;
  sourceVersionId: string;
}

export interface CostOfSalesBreakdown {
  ingredientId: string;
  usage: number;
  unitCost: number;
  costOfSales: number;
  sourceVersionId: string;
}

export interface ReportSummary {
  computedAt: string;
  totals: {
    totalUsageUnits: number;
    totalCostOfSales: number;
  };
  percentages: {
    ingredientCostShare: Record<string, number>;
  };
  breakdown: CostOfSalesBreakdown[];
}

export interface ComputeReportSummaryInput {
  inventory: WeeklyInventoryEntry[];
  costSnapshots: WeeklyCostSnapshotEntry[];
  now?: () => Date;
}

export interface RecipeCostSummary {
  totalRecipeCost: number;
  foodCostPercentage: number;
  ingredients: RecipeIngredientCost[];
}

export interface RecipeIngredientCost {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitOfMeasure: string;
  unitCost: number;
  lineCost: number;
  category: IngredientCategory;
}
