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

export interface Ingredient {
  id: string;
  name: string;
  unitOfMeasure: string;
  unitsPerCase: number;
  casePrice: number;
  unitCost: number;
  isActive: boolean;
  currentVersionId?: string;
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
