import type { Ingredient, IngredientVersion } from '@domain/costing';

import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

interface PriceChange {
  ingredient: Ingredient;
  versions: IngredientVersion[];
  previousCost: number | null;
  currentCost: number;
  percentChange: number | null;
  changeDate: string;
}

interface RecentPriceChangesProps {
  ingredients: Ingredient[];
  allVersions: Map<string, IngredientVersion[]>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const RecentPriceChanges = ({ ingredients, allVersions }: RecentPriceChangesProps) => {

  // Find ingredients with recent price changes
  const recentChanges: PriceChange[] = ingredients
    .map((ingredient) => {
      const versions = allVersions.get(ingredient.id) || [];
      if (versions.length < 2) return null;

      // Sort versions by effectiveFrom descending
      const sortedVersions = [...versions].sort(
        (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
      );

      const currentVersion = sortedVersions[0];
      const previousVersion = sortedVersions[1];

      if (!currentVersion || !previousVersion) return null;

      const currentCost = currentVersion.unitCost;
      const previousCost = previousVersion.unitCost;
      const percentChange = ((currentCost - previousCost) / previousCost) * 100;

      return {
        ingredient,
        versions: sortedVersions,
        previousCost,
        currentCost,
        percentChange,
        changeDate: currentVersion.effectiveFrom
      };
    })
    .filter((change): change is PriceChange => change !== null)
    .sort((a, b) => new Date(b.changeDate).getTime() - new Date(a.changeDate).getTime())
    .slice(0, 5); // Show top 5 most recent changes

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Price Changes</CardTitle>
      </CardHeader>
      <CardContent>
        {recentChanges.length > 0 ? (
          <div className="space-y-3">
            {recentChanges.map((change) => (
              <div key={change.ingredient.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{change.ingredient.name}</p>
                  <p className="text-xs text-slate-500">{formatDate(change.changeDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 line-through">
                      {formatCurrency(change.previousCost || 0)}
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {formatCurrency(change.currentCost)}
                    </p>
                  </div>
                  {change.percentChange !== null && (
                    <div
                      className={`flex h-7 min-w-[60px] items-center justify-center rounded px-2 text-xs font-medium ${
                        change.percentChange > 0
                          ? 'bg-red-100 text-red-700'
                          : change.percentChange < 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {change.percentChange > 0 ? '+' : ''}
                      {change.percentChange.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            No recent price changes found
          </div>
        )}
      </CardContent>
    </Card>
  );
};
