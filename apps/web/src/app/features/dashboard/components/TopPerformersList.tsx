import type { Ingredient } from '@domain/costing';

import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { useTerminology } from '../../../hooks/use-terminology';

interface TopPerformersListProps {
  ingredients: Ingredient[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const TopPerformersList = ({ ingredients }: TopPerformersListProps) => {
  const { terms } = useTerminology();

  // Get top 5 most costly ingredients by unitCost
  const topCostlyIngredients = [...ingredients]
    .filter((ing) => ing.isActive && ing.unitCost > 0)
    .sort((a, b) => b.unitCost - a.unitCost)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Most Costly {terms.ingredients}</CardTitle>
      </CardHeader>
      <CardContent>
        {topCostlyIngredients.length > 0 ? (
          <div className="space-y-3">
            {topCostlyIngredients.map((ingredient, index) => (
              <div key={ingredient.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-medium text-orange-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{ingredient.name}</p>
                    <p className="text-xs text-slate-500">
                      per {ingredient.inventoryUnit}
                      {ingredient.isBatch && (
                        <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                          Batch
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {formatCurrency(ingredient.unitCost)}
                  </p>
                  <p className="text-xs text-slate-500">{ingredient.category}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            No active {terms.ingredients.toLowerCase()} found
          </div>
        )}
      </CardContent>
    </Card>
  );
};
