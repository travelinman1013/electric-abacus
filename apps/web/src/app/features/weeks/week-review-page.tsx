import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { WeekStatus, WeeklyCostSnapshotEntry } from '@domain/costing';
import { calculateGrossMargin, calculateGrossProfit, computeReportSummary } from '@domain/costing';

import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';
import { useIngredients } from '../../hooks/use-ingredients';
import { downloadWeekReportPDF } from '../../services/pdf-export';
import {
  useFinalizeWeek,
  useWeek,
  useWeekCostSnapshot,
  useWeekInventory,
  useWeekReport,
  useWeekSales
} from '../../hooks/use-weeks';
import { useAuthContext } from '../../providers/auth-provider';
import { calculateWeeklyTotals } from './sales-entry-page';

const badgeVariantByStatus: Record<WeekStatus, 'warning' | 'success'> = {
  draft: 'warning',
  finalized: 'success'
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export const WeekReviewPage = () => {
  const { weekId } = useParams<{ weekId: string }>();
  const { profile } = useAuthContext();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const weekQuery = useWeek(weekId);
  const inventoryQuery = useWeekInventory(weekId);
  const costSnapshotQuery = useWeekCostSnapshot(weekId);
  const reportQuery = useWeekReport(weekId);
  const salesQuery = useWeekSales(weekId);
  const ingredientsQuery = useIngredients();
  const finalizeWeekMutation = useFinalizeWeek();

  const week = weekQuery.data;
  const inventoryEntries = useMemo(
    () => inventoryQuery.data ?? [],
    [inventoryQuery.data]
  );
  const costSnapshotEntries = useMemo(
    () => costSnapshotQuery.data ?? [],
    [costSnapshotQuery.data]
  );
  const report = reportQuery.data;
  const sales = salesQuery.data;
  const ingredients = useMemo(
    () => ingredientsQuery.data ?? [],
    [ingredientsQuery.data]
  );

  const isLoading =
    weekQuery.isLoading ||
    inventoryQuery.isLoading ||
    ingredientsQuery.isLoading ||
    costSnapshotQuery.isLoading ||
    reportQuery.isLoading ||
    salesQuery.isLoading;

  const errorMessage =
    (weekQuery.isError && weekQuery.error instanceof Error
      ? weekQuery.error.message
      : null) ??
    (inventoryQuery.isError && inventoryQuery.error instanceof Error
      ? inventoryQuery.error.message
      : null) ??
    (ingredientsQuery.isError && ingredientsQuery.error instanceof Error
      ? ingredientsQuery.error.message
      : null) ??
    (costSnapshotQuery.isError && costSnapshotQuery.error instanceof Error
      ? costSnapshotQuery.error.message
      : null) ??
    (reportQuery.isError && reportQuery.error instanceof Error
      ? reportQuery.error.message
      : null) ??
    (salesQuery.isError && salesQuery.error instanceof Error
      ? salesQuery.error.message
      : null);

  const ingredientMap = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
    [ingredients]
  );

  const isFinalized = week?.status === 'finalized';

  const snapshotForComputation = useMemo<WeeklyCostSnapshotEntry[]>(() => {
    if (isFinalized && costSnapshotEntries.length) {
      return costSnapshotEntries;
    }

    return inventoryEntries.map((entry) => {
      const ingredient = ingredientMap.get(entry.ingredientId);
      return {
        ingredientId: entry.ingredientId,
        unitCost: ingredient ? Math.max(ingredient.unitCost, 0) : 0,
        sourceVersionId: ingredient?.currentVersionId ?? 'unspecified'
      } satisfies WeeklyCostSnapshotEntry;
    });
  }, [costSnapshotEntries, ingredientMap, inventoryEntries, isFinalized]);

  const summary = useMemo(() => {
    if (!inventoryEntries.length) {
      return null;
    }

    if (isFinalized && report) {
      return report;
    }

    return computeReportSummary({
      inventory: inventoryEntries,
      costSnapshots: snapshotForComputation
    });
  }, [inventoryEntries, isFinalized, report, snapshotForComputation]);

  const salesTotals = useMemo(() => {
    if (!sales?.days) {
      return null;
    }
    return calculateWeeklyTotals(sales.days);
  }, [sales]);

  const foodCostPercentage = useMemo(() => {
    if (!summary || !salesTotals || salesTotals.grossSales === 0) {
      return null;
    }
    return Number(((summary.totals.totalCostOfSales / salesTotals.grossSales) * 100).toFixed(2));
  }, [summary, salesTotals]);

  const grossProfit = useMemo(() => {
    if (!summary || !salesTotals) {
      return null;
    }
    return calculateGrossProfit(salesTotals.grossSales, summary.totals.totalCostOfSales);
  }, [summary, salesTotals]);

  const grossMargin = useMemo(() => {
    if (!summary || !salesTotals) {
      return null;
    }
    return calculateGrossMargin(salesTotals.grossSales, summary.totals.totalCostOfSales);
  }, [summary, salesTotals]);

  const tableRows = useMemo(
    () =>
      summary
        ? summary.breakdown.map((item) => {
            const ingredient = ingredientMap.get(item.ingredientId);
            const snapshotEntry = snapshotForComputation.find(
              (snapshot) => snapshot.ingredientId === item.ingredientId
            );

            return {
              ingredientId: item.ingredientId,
              ingredientName: ingredient?.name ?? item.ingredientId,
              usage: item.usage,
              unitCost: item.unitCost,
              costOfSales: item.costOfSales,
              sourceVersionId: snapshotEntry?.sourceVersionId ?? 'unspecified',
              isVersionMissing: !snapshotEntry?.sourceVersionId || snapshotEntry.sourceVersionId === 'unspecified'
            };
          })
        : [],
    [ingredientMap, summary, snapshotForComputation]
  );

  const canFinalize = Boolean(
    weekId &&
      week?.status === 'draft' &&
      profile?.role === 'owner' &&
      inventoryEntries.length > 0
  );

  const finalizeDisabled = !canFinalize || finalizeWeekMutation.isPending;

  const finalizeHelperText = !weekId || week?.status !== 'draft'
    ? null
    : profile?.role !== 'owner'
      ? 'Only owners can finalize weeks.'
      : inventoryEntries.length === 0
        ? 'Add inventory entries to enable finalization.'
        : null;

  const handleFinalizeClick = () => {
    setShowConfirmDialog(true);
  };

  const getErrorMessage = (error: unknown): string => {
    if (!(error instanceof Error)) {
      return 'Unable to finalize this week right now. Please try again.';
    }

    const message = error.message.toLowerCase();

    if (message.includes('does not exist')) {
      return 'Week not found. Please refresh the page and try again.';
    }

    if (message.includes('already finalized')) {
      return 'This week has already been finalized by another user.';
    }

    if (message.includes('without inventory entries')) {
      return 'Cannot finalize a week without inventory data. Please add inventory entries first.';
    }

    if (message.includes('ingredient') && message.includes('not found')) {
      return 'Some ingredients referenced in inventory no longer exist. Please check the ingredient list.';
    }

    if (message.includes('permission') || message.includes('denied')) {
      return 'You do not have permission to finalize weeks. Contact your administrator.';
    }

    if (message.includes('network') || message.includes('offline')) {
      return 'Network connection issue. Please check your internet and try again.';
    }

    return error.message;
  };

  const handleConfirmFinalize = async () => {
    if (!weekId) {
      return;
    }
    setActionError(null);
    setShowConfirmDialog(false);
    try {
      await finalizeWeekMutation.mutateAsync({ weekId });
    } catch (mutationError) {
      setActionError(getErrorMessage(mutationError));
    }
  };

  const handleExportPDF = async () => {
    if (!weekId || !summary) {
      return;
    }

    setIsPdfExporting(true);
    setActionError(null);

    try {
      const ingredientNames = Object.fromEntries(
        ingredients.map((ingredient) => [ingredient.id, ingredient.name])
      );

      const sourceVersions = Object.fromEntries(
        snapshotForComputation.map((snapshot) => [
          snapshot.ingredientId,
          snapshot.sourceVersionId
        ])
      );

      const ingredientCategories = Object.fromEntries(
        ingredients.map((ingredient) => [ingredient.id, ingredient.category])
      );

      await downloadWeekReportPDF({
        weekId,
        summary,
        sales: sales ?? undefined,
        finalizedAt: week?.finalizedAt ?? undefined,
        finalizedBy: week?.finalizedBy || undefined,
        ingredientNames,
        sourceVersions,
        ingredientCategories
      });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? `Failed to generate PDF: ${error.message}`
          : 'Failed to generate PDF. Please try again.'
      );
    } finally {
      setIsPdfExporting(false);
    }
  };

  if (!weekId) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Weekly review</h1>
        <p className="text-sm text-muted-foreground">Select a week from the list to inspect costing and finalize.</p>
      </div>
    );
  }

  const badgeVariant = week ? badgeVariantByStatus[week.status] : 'warning';

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{weekId}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-foreground">Weekly review</h1>
            {week ? (
              <Badge variant={badgeVariant} className="uppercase">
                {week.status}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Verify sales, inventory, and costing before finalizing. Finalization snapshots ingredient costs and locks edits.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={!summary || isPdfExporting}
            >
              {isPdfExporting ? 'Generating PDF...' : 'Export PDF'}
            </Button>
            <Button onClick={handleFinalizeClick} disabled={finalizeDisabled}>
              {week?.status === 'finalized'
                ? 'Week finalized'
                : finalizeWeekMutation.isPending
                  ? 'Finalizing...'
                  : 'Finalize week'}
            </Button>
          </div>
          {finalizeHelperText ? (
            <p className="text-xs text-muted-foreground">{finalizeHelperText}</p>
          ) : null}
        </div>
      </header>

      {actionError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-dashed border p-6 text-center text-sm text-muted-foreground bg-muted/50">
          Loading week data...
        </div>
      ) : null}

      {!isLoading && !errorMessage && week === null ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Week not found. Return to the week list and choose another period.
        </div>
      ) : null}

      {!isLoading && !errorMessage && week && !inventoryEntries.length ? (
        <div className="rounded-md border border-dashed border p-6 text-center text-sm text-muted-foreground bg-muted/50">
          Inventory inputs are required before costing can be generated. Enter counts on the inventory screen.
        </div>
      ) : null}

      {!isLoading && !errorMessage && week && inventoryEntries.length ? (
        <>
          {salesTotals && (
            <Card>
              <CardHeader>
                <CardTitle>Weekly sales summary</CardTitle>
                <CardDescription>
                  Total sales for the week after tax and promotional deductions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Gross sales</dt>
                    <dd className="mt-1 text-2xl font-semibold text-foreground">
                      {formatCurrency(salesTotals.grossSales)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Less sales tax</dt>
                    <dd className="mt-1 text-2xl font-semibold text-foreground">
                      {formatCurrency(salesTotals.lessSalesTax)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Less promo</dt>
                    <dd className="mt-1 text-2xl font-semibold text-foreground">
                      {formatCurrency(salesTotals.lessPromo)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Net sales</dt>
                    <dd className="mt-1 text-2xl font-semibold text-emerald-700">
                      {formatCurrency(salesTotals.netSales)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Weekly cost summary</CardTitle>
              <CardDescription>
                Total ingredient usage and cost analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Total cost of sales</dt>
                  <dd className="mt-1 text-2xl font-semibold text-foreground">
                    {summary ? formatCurrency(summary.totals.totalCostOfSales) : formatCurrency(0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Total usage units</dt>
                  <dd className="mt-1 text-2xl font-semibold text-foreground">
                    {summary ? summary.totals.totalUsageUnits.toFixed(2) : '0.00'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Food cost percentage</dt>
                  <dd className="mt-1 text-2xl font-semibold">
                    {foodCostPercentage !== null ? (
                      <span
                        className={cn(
                          foodCostPercentage < 30
                            ? 'text-emerald-600'
                            : foodCostPercentage < 35
                              ? 'text-amber-600'
                              : 'text-red-600'
                        )}
                      >
                        {foodCostPercentage}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">N/A</span>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {grossProfit !== null && grossMargin !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Profitability</CardTitle>
                <CardDescription>
                  Gross profit and margin after subtracting cost of sales from gross sales.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Gross profit</dt>
                    <dd className="mt-1 text-2xl font-semibold text-emerald-700">
                      {formatCurrency(grossProfit)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Gross margin</dt>
                    <dd className="mt-1 text-2xl font-semibold">
                      <span
                        className={cn(
                          grossMargin >= 70
                            ? 'text-emerald-600'
                            : grossMargin >= 60
                              ? 'text-amber-600'
                              : 'text-red-600'
                        )}
                      >
                        {grossMargin}%
                      </span>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Ingredient costing snapshot</CardTitle>
              <CardDescription>
                Generated from the inventory usage and ingredient pricing at the time of finalize.
                Source versions track ingredient cost changes over time.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {summary ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Usage</TableHead>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead className="text-right">Cost of sales</TableHead>
                      <TableHead className="text-center">Source Version</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((row) => (
                      <TableRow key={row.ingredientId}>
                        <TableCell className="font-medium text-foreground">{row.ingredientName}</TableCell>
                        <TableCell className="text-right">{row.usage.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.unitCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.costOfSales)}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              'inline-block rounded px-2 py-1 text-xs font-mono',
                              row.isVersionMissing
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-muted text-muted-foreground'
                            )}
                            title={
                              row.isVersionMissing
                                ? 'No version tracking for this ingredient'
                                : `Ingredient version: ${row.sourceVersionId}`
                            }
                          >
                            {row.sourceVersionId}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {summary && (
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell className="font-bold text-foreground">TOTAL</TableCell>
                        <TableCell className="text-right">{summary.totals.totalUsageUnits.toFixed(2)}</TableCell>
                        <TableCell className="text-right"></TableCell>
                        <TableCell className="text-right">{formatCurrency(summary.totals.totalCostOfSales)}</TableCell>
                        <TableCell className="text-center"></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-md border border-dashed border p-6 text-center text-sm text-muted-foreground bg-muted/50">
                  No costing data yet. Finalize the week once inventory is complete.
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between text-sm text-muted-foreground">
              <span>Owners can re-run costing before finalizing to refresh ingredient price changes.</span>
              <Link
                to={`/app/weeks/${weekId}/inventory`}
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground hover:text-foreground')}
              >
                View raw inventory
              </Link>
            </CardFooter>
          </Card>
        </>
      ) : null}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Week {weekId}?</DialogTitle>
            <DialogDescription>
              This action will create a permanent snapshot of ingredient costs and lock all data for this week.
              You will not be able to edit inventory, sales, or cost data after finalization.
            </DialogDescription>
          </DialogHeader>

          {summary && (
            <div className="space-y-2 rounded-md border border bg-muted/50 p-4">
              <h4 className="text-sm font-medium">Summary to be finalized:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total usage:</span>
                  <div className="font-medium">{summary.totals.totalUsageUnits.toFixed(2)} units</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total cost:</span>
                  <div className="font-medium">{formatCurrency(summary.totals.totalCostOfSales)}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {summary.breakdown.length} ingredient{summary.breakdown.length !== 1 ? 's' : ''} will be snapshot
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={finalizeWeekMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmFinalize}
              disabled={finalizeWeekMutation.isPending}
            >
              {finalizeWeekMutation.isPending ? 'Finalizing...' : 'Yes, finalize week'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
