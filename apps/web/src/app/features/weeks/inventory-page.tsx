import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { computeUsage, type WeeklyInventoryEntry } from '@domain/costing';

import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useIngredients } from '../../hooks/use-ingredients';
import { useSaveWeekInventory, useWeek, useWeekInventory } from '../../hooks/use-weeks';
import { useTerminology } from '../../hooks/use-terminology';

const inventoryEntrySchema = z.object({
  ingredientId: z.string(),
  begin: z.number().min(0, 'No negative values'),
  received: z.number().min(0, 'No negative values'),
  end: z.number().min(0, 'No negative values')
});

const inventorySchema = z.object({
  entries: z.array(inventoryEntrySchema)
});

type InventoryFormValues = z.infer<typeof inventorySchema>;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatCurrency = (value: number) =>
  currencyFormatter.format(Number.isFinite(value) ? value : 0);

export const InventoryPage = () => {
  const { terms } = useTerminology();
  const { weekId } = useParams<{ weekId: string }>();
  const { data: week } = useWeek(weekId);
  const {
    data: inventoryData = [],
    isLoading: inventoryLoading,
    isError: inventoryError,
    error: inventoryErrorObject
  } = useWeekInventory(weekId);
  const {
    data: ingredients = [],
    isLoading: ingredientsLoading,
    isError: ingredientsError,
    error: ingredientsErrorObject
  } = useIngredients();
  const saveInventoryMutation = useSaveWeekInventory();

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const activeIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.isActive),
    [ingredients]
  );

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: { entries: [] }
  });

  const { reset } = form;

  useEffect(() => {
    if (!activeIngredients.length || inventoryLoading) {
      return;
    }

    const defaults = activeIngredients.map<WeeklyInventoryEntry>((ingredient) => {
      const existing = inventoryData.find((entry) => entry.ingredientId === ingredient.id);
      return {
        ingredientId: ingredient.id,
        begin: existing?.begin ?? 0,
        received: existing?.received ?? 0,
        end: existing?.end ?? 0
      };
    });

    reset({ entries: defaults });
  }, [activeIngredients, inventoryData, inventoryLoading, reset]);

  const entries = form.watch('entries') ?? [];
  const isFinalized = week?.status === 'finalized';

  const rows = activeIngredients.map((ingredient, index) => {
    const entry = entries[index] ?? {
      ingredientId: ingredient.id,
      begin: 0,
      received: 0,
      end: 0
    };

    const usage = computeUsage(entry);
    const unitCost = Number.isFinite(ingredient.unitCost) && ingredient.unitCost >= 0 ? ingredient.unitCost : 0;
    const costOfSales = usage * unitCost;

    return {
      ingredient,
      entry,
      usage,
      costOfSales,
      unitCost,
      index
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.usage += row.usage;
      acc.costOfSales += row.costOfSales;
      return acc;
    },
    { usage: 0, costOfSales: 0 }
  );

  const onSubmit = form.handleSubmit(async (values) => {
    if (!weekId) {
      return;
    }
    setFormError(null);
    setFormSuccess(null);

    try {
      await saveInventoryMutation.mutateAsync({ weekId, entries: values.entries });
      setFormSuccess(`${terms.inventory} saved`);
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : `Unable to save ${terms.inventory.toLowerCase()} right now.`;
      setFormError(message);
    }
  });

  if (!weekId) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{terms.inventory} recount</h1>
        <p className="text-sm text-slate-500">Select a {terms.week.toLowerCase()} from the {terms.week.toLowerCase()} list to continue.</p>
      </div>
    );
  }

  const isLoading = inventoryLoading || ingredientsLoading;
  const combinedError = inventoryError || ingredientsError;
  const combinedErrorMessage =
    inventoryErrorObject instanceof Error
      ? inventoryErrorObject.message
      : ingredientsErrorObject instanceof Error
        ? ingredientsErrorObject.message
        : `Failed to load ${terms.inventory.toLowerCase()} data.`;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">{weekId}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">{terms.inventory} recount</h1>
          {week ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {week.status}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-slate-500">
          Enter beginning, received, and ending {terms.inventory.toLowerCase()} for each tracked {terms.ingredient.toLowerCase()}. Numbers must be
          non-negative.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{terms.ingredient} usage</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Loading {terms.inventory.toLowerCase()}...
            </div>
          ) : combinedError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {combinedErrorMessage}
            </div>
          ) : !rows.length ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No active {terms.ingredients.toLowerCase()} configured. Owners can add {terms.ingredients.toLowerCase()} to begin tracking {terms.inventory.toLowerCase()}.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {formError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}
              {formSuccess ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {formSuccess}
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{terms.ingredient}</TableHead>
                      <TableHead>Begin</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="text-right">Usage</TableHead>
                      <TableHead className="text-right">Cost of Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const { ingredient, index, usage, costOfSales, unitCost } = row;
                      const errors = form.formState.errors.entries?.[index];
                      return (
                        <TableRow key={ingredient.id}>
                          <TableCell className="font-medium text-slate-800">
                            <div className="flex flex-col">
                              <span>{ingredient.name}</span>
                              <span className="text-xs text-slate-500">
                                {ingredient.inventoryUnit} • {formatCurrency(unitCost)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={isFinalized}
                                {...form.register(`entries.${index}.begin`, { valueAsNumber: true })}
                              />
                              {errors?.begin?.message ? (
                                <p className="text-xs text-destructive">{errors.begin.message}</p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={isFinalized}
                                {...form.register(`entries.${index}.received`, { valueAsNumber: true })}
                              />
                              {errors?.received?.message ? (
                                <p className="text-xs text-destructive">{errors.received.message}</p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={isFinalized}
                                {...form.register(`entries.${index}.end`, { valueAsNumber: true })}
                              />
                              {errors?.end?.message ? (
                                <p className="text-xs text-destructive">{errors.end.message}</p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-700">
                            {usage.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-700">
                            {formatCurrency(costOfSales)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Weekly totals
                </h2>
                <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Total usage</dt>
                    <dd className="text-lg font-semibold text-slate-800">{totals.usage.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Total cost of sales</dt>
                    <dd className="text-lg font-semibold text-emerald-700">
                      {formatCurrency(totals.costOfSales)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-500">
                <p>
                  {terms.inventory} saves with each submit. Owners lock values when finalizing the {terms.week.toLowerCase()}.
                </p>
                <Button
                  type="submit"
                  disabled={isFinalized || form.formState.isSubmitting || saveInventoryMutation.isPending}
                >
                  {saveInventoryMutation.isPending ? 'Saving...' : isFinalized ? 'Finalized' : `Save ${terms.inventory.toLowerCase()}`}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
