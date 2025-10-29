import { useMemo } from 'react';

import type { IngredientVersion, WeeklySales } from '@domain/costing';
import { WEEK_DAYS } from '@domain/costing';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useTerminology } from '../../hooks/use-terminology';
import { useWeeksHistory, useInventoryAnalytics } from './hooks/useDashboardAnalytics';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '../../providers/business-provider';
import { getWeekSales, getIngredientVersions } from '../../services/firestore';
import { useIngredients } from '../../hooks/use-ingredients';
import { InventoryPieChart } from './components/InventoryPieChart';
import { TopPerformersList } from './components/TopPerformersList';
import { RecentPriceChanges } from './components/RecentPriceChanges';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

const calculateWeekTotalSales = (sales: WeeklySales): number => {
  let total = 0;
  WEEK_DAYS.forEach((day) => {
    const dayData = sales.days[day];
    const netSales = dayData.foodSales + dayData.drinkSales - dayData.lessSalesTax - dayData.lessPromo;
    total += netSales;
  });
  return total;
};

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  valueClassName?: string;
}

const MetricCard = ({ title, value, subtitle, valueClassName }: MetricCardProps) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-3xl font-bold ${valueClassName || 'text-slate-900'}`}>{value}</div>
      {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
    </CardContent>
  </Card>
);

const SkeletonCard = () => (
  <Card>
    <CardHeader className="pb-3">
      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
    </CardHeader>
    <CardContent>
      <div className="h-9 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-100" />
    </CardContent>
  </Card>
);

const SkeletonChart = ({ title }: { title: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex h-[300px] items-center justify-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
      </div>
    </CardContent>
  </Card>
);

const SkeletonList = ({ title }: { title: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
              <div className="space-y-1">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const ErrorCard = ({ title, error }: { title: string; error?: Error | null }) => (
  <Card className="border-red-200 bg-red-50">
    <CardHeader>
      <CardTitle className="text-base text-red-900">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <p className="text-sm text-red-700">
          Unable to load data. Please try refreshing the page.
        </p>
        {error && (
          <details className="text-xs text-red-600">
            <summary className="cursor-pointer hover:underline">Error details</summary>
            <pre className="mt-2 overflow-auto rounded bg-red-100 p-2">
              {error.message || 'Unknown error'}
            </pre>
          </details>
        )}
      </div>
    </CardContent>
  </Card>
);

interface WelcomeProps {
  terms: ReturnType<typeof useTerminology>['terms'];
  onCreateWeek: () => void;
}

const Welcome = ({ terms, onCreateWeek }: WelcomeProps) => (
  <div className="space-y-6">
    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
      <CardContent className="pt-6">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Welcome to Electric Abacus! 🎉
            </h2>
            <p className="text-base text-slate-600">
              Congratulations on setting up your account. You&rsquo;re ready to start tracking
              your business operations and gaining insights into your food costs.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 text-left">
            <h3 className="mb-3 font-semibold text-slate-900">Getting Started</h3>
            <ol className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="font-medium text-orange-600">1.</span>
                <span>
                  <strong>Create your first {terms.week.toLowerCase()}</strong> to begin tracking
                  inventory and sales
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-medium text-orange-600">2.</span>
                <span>
                  <strong>Add {terms.ingredients.toLowerCase()}</strong> to build your inventory
                  catalog
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-medium text-orange-600">3.</span>
                <span>
                  <strong>Create {terms.menuItems.toLowerCase()}</strong> with recipes to calculate
                  food cost percentages
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-medium text-orange-600">4.</span>
                <span>
                  <strong>Enter daily sales and inventory data</strong> to generate insights
                </span>
              </li>
            </ol>
          </div>

          <Button size="lg" onClick={onCreateWeek} className="text-base">
            Create Your First {terms.week}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const DashboardPage = () => {
  const { terms } = useTerminology();
  const { businessId } = useBusiness();
  const navigate = useNavigate();

  const {
    data: weeksHistory = [],
    isLoading: weeksLoading,
    isError: weeksError,
    error: weeksErrorDetails
  } = useWeeksHistory(12);

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    isError: inventoryError,
    error: inventoryErrorDetails
  } = useInventoryAnalytics();

  const {
    data: ingredients = [],
    isLoading: ingredientsLoading
  } = useIngredients();

  // Fetch ingredient versions for price change tracking
  const { data: allVersionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['all-ingredient-versions', businessId],
    queryFn: async () => {
      if (!businessId || ingredients.length === 0) {
        return new Map<string, IngredientVersion[]>();
      }

      const versionsMap = new Map<string, IngredientVersion[]>();

      // Fetch versions for all ingredients in parallel
      await Promise.all(
        ingredients.map(async (ingredient) => {
          try {
            const versions = await getIngredientVersions(businessId, ingredient.id);
            if (versions.length > 0) {
              versionsMap.set(ingredient.id, versions);
            }
          } catch (error) {
            console.error(`Failed to fetch versions for ${ingredient.id}:`, error);
          }
        })
      );

      return versionsMap;
    },
    enabled: Boolean(businessId) && ingredients.length > 0
  });

  // Get most recent and previous week for sales data
  const mostRecentWeek = weeksHistory[0];
  const previousWeek = weeksHistory[1];

  // Fetch sales data for most recent week
  const { data: currentWeekSales, isLoading: currentSalesLoading } = useQuery({
    queryKey: ['week-sales', businessId, mostRecentWeek?.id],
    queryFn: () => {
      if (!mostRecentWeek?.id || !businessId) {
        return Promise.resolve(null);
      }
      return getWeekSales(businessId, mostRecentWeek.id);
    },
    enabled: Boolean(mostRecentWeek?.id) && Boolean(businessId)
  });

  // Fetch sales data for previous week
  const { data: previousWeekSales, isLoading: previousSalesLoading } = useQuery({
    queryKey: ['week-sales', businessId, previousWeek?.id],
    queryFn: () => {
      if (!previousWeek?.id || !businessId) {
        return Promise.resolve(null);
      }
      return getWeekSales(businessId, previousWeek.id);
    },
    enabled: Boolean(previousWeek?.id) && Boolean(businessId)
  });

  // Calculate metrics
  const currentWeekTotal = useMemo(() => {
    if (!currentWeekSales) return 0;
    return calculateWeekTotalSales(currentWeekSales);
  }, [currentWeekSales]);

  const previousWeekTotal = useMemo(() => {
    if (!previousWeekSales) return 0;
    return calculateWeekTotalSales(previousWeekSales);
  }, [previousWeekSales]);

  const weekOverWeekGrowth = useMemo(() => {
    if (!previousWeekTotal || previousWeekTotal === 0) return 0;
    return ((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100;
  }, [currentWeekTotal, previousWeekTotal]);

  // Calculate food cost percentage from most recent week
  const foodCostPercentage = useMemo(() => {
    if (!inventoryData || !currentWeekTotal || currentWeekTotal === 0) return 0;
    return (inventoryData.totalValue / currentWeekTotal) * 100;
  }, [inventoryData, currentWeekTotal]);

  // Determine food cost color
  const getFoodCostColor = (percentage: number): string => {
    if (percentage === 0) return 'text-slate-400';
    if (percentage < 30) return 'text-emerald-600';
    if (percentage <= 35) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isLoading = weeksLoading || inventoryLoading || currentSalesLoading || previousSalesLoading;
  const detailedDataLoading = ingredientsLoading || versionsLoading;

  // Check if this is a new account with no data
  const isEmpty = !weeksLoading && weeksHistory.length === 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Real-time insights into your business performance, inventory, and profitability.
        </p>
      </header>

      {/* Show welcome screen for new accounts */}
      {isEmpty ? (
        <Welcome
          terms={terms}
          onCreateWeek={() => {
            void navigate('/app/weeks/new');
          }}
        />
      ) : (
        <>
          {/* Quick Actions */}
          <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                void navigate('/app/weeks/new');
              }}
            >
              Start New {terms.week}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                if (mostRecentWeek?.id) {
                  void navigate(`/app/weeks/${mostRecentWeek.id}/inventory`);
                }
              }}
              disabled={!mostRecentWeek?.id}
            >
              View Current {terms.inventory}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                void navigate('/app/ingredients');
              }}
            >
              Add New {terms.ingredient}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                void navigate('/app/menu-items');
              }}
            >
              Add New {terms.menuItem}
            </Button>
          </div>
        </CardContent>
      </Card>

      {weeksError || inventoryError ? (
        <div className="grid gap-6 md:grid-cols-2">
          {weeksError && (
            <ErrorCard title="Dashboard Data Error" error={weeksErrorDetails as Error} />
          )}
          {inventoryError && (
            <ErrorCard title="Inventory Data Error" error={(inventoryErrorDetails || new Error('Unknown error')) as Error} />
          )}
        </div>
      ) : isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title={`Current ${terms.week} Sales`}
            value={formatCurrency(currentWeekTotal)}
            subtitle={mostRecentWeek ? `${terms.week} ${mostRecentWeek.id}` : 'No data'}
          />

          <MetricCard
            title="Food Cost %"
            value={formatPercentage(foodCostPercentage)}
            subtitle={
              foodCostPercentage === 0
                ? 'No data available'
                : foodCostPercentage < 30
                ? 'Excellent margin'
                : foodCostPercentage <= 35
                ? 'Acceptable margin'
                : 'Needs adjustment'
            }
            valueClassName={getFoodCostColor(foodCostPercentage)}
          />

          <MetricCard
            title={`${terms.inventory} Value`}
            value={formatCurrency(inventoryData?.totalValue || 0)}
            subtitle={mostRecentWeek ? `As of ${terms.week} ${mostRecentWeek.id}` : 'No data'}
          />

          <MetricCard
            title="Week-over-Week Growth"
            value={formatPercentage(weekOverWeekGrowth)}
            subtitle={
              previousWeek
                ? `Compared to ${terms.week} ${previousWeek.id}`
                : 'Not enough data'
            }
            valueClassName={
              weekOverWeekGrowth > 0
                ? 'text-emerald-600'
                : weekOverWeekGrowth < 0
                ? 'text-red-600'
                : 'text-slate-400'
            }
          />
        </div>
      )}

      {/* Inventory Health Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Inventory Health</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {inventoryLoading ? (
            <SkeletonChart title={`${terms.inventory} by Category`} />
          ) : inventoryData ? (
            <InventoryPieChart
              data={inventoryData.valueByCategory}
              totalValue={inventoryData.totalValue}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{terms.inventory} by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  No {terms.inventory.toLowerCase()} data available
                </div>
              </CardContent>
            </Card>
          )}

          {detailedDataLoading ? (
            <SkeletonList title="Recent Price Changes" />
          ) : (
            <RecentPriceChanges
              ingredients={ingredients}
              allVersions={allVersionsData || new Map()}
            />
          )}
        </div>
      </div>

      {/* Top Performers Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Top Performers</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {detailedDataLoading ? (
            <SkeletonList title={`Most Costly ${terms.ingredients}`} />
          ) : (
            <TopPerformersList ingredients={ingredients} />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Best Margin Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                {terms.menuItems} profitability analysis coming soon
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

          {/* Future Analytics Section */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Trends</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Historical {terms.weeks.toLowerCase()} analysis coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
