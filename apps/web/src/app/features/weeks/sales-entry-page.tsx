import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import type { WeekDay, WeeklySalesDay } from '@domain/costing';
import { WEEK_DAYS } from '@domain/costing';

import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useWeek, useSaveWeekSales, useWeekSales } from '../../hooks/use-weeks';

const amountSchema = z
  .number({ invalid_type_error: 'Enter a valid amount' })
  .min(0, 'No negative values')
  .max(1_000_000, 'That total looks too high');

const salesDaySchema = z.object({
  dailyGross: amountSchema,
  lessSalesTax: amountSchema,
  lessPromo: amountSchema
});

const salesSchema = z.object(
  WEEK_DAYS.reduce(
    (shape, day) => ({
      ...shape,
      [day]: salesDaySchema
    }),
    {} as Record<WeekDay, typeof salesDaySchema>
  )
);

type SalesFormValues = z.infer<typeof salesSchema>;

type SalesFieldKey = keyof WeeklySalesDay;

const salesFields: Array<{ key: SalesFieldKey; label: string }> = [
  { key: 'dailyGross', label: 'Daily Gross Sales' },
  { key: 'lessSalesTax', label: 'Less Sales Tax' },
  { key: 'lessPromo', label: 'Less Promo' }
];

const dayLabels: Record<WeekDay, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday'
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatCurrency = (value: number) => currencyFormatter.format(Number.isFinite(value) ? value : 0);

const roundToCents = (value: number) => Math.round(value * 100) / 100;

const toSafeNumber = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return numeric;
};

export const calculateDailyNet = (entry?: WeeklySalesDay | null): number => {
  if (!entry) {
    return 0;
  }
  const gross = toSafeNumber(entry.dailyGross);
  const tax = toSafeNumber(entry.lessSalesTax);
  const promo = toSafeNumber(entry.lessPromo);
  return roundToCents(gross - tax - promo);
};

export const calculateWeeklyTotals = (
  days: Partial<Record<WeekDay, WeeklySalesDay>>
): { dailyGross: number; lessSalesTax: number; lessPromo: number; netSales: number } => {
  const totals = WEEK_DAYS.reduce(
    (acc, day) => {
      const entry = days[day];
      acc.dailyGross += toSafeNumber(entry?.dailyGross);
      acc.lessSalesTax += toSafeNumber(entry?.lessSalesTax);
      acc.lessPromo += toSafeNumber(entry?.lessPromo);
      acc.netSales += calculateDailyNet(entry);
      return acc;
    },
    { dailyGross: 0, lessSalesTax: 0, lessPromo: 0, netSales: 0 }
  );

  return {
    dailyGross: roundToCents(totals.dailyGross),
    lessSalesTax: roundToCents(totals.lessSalesTax),
    lessPromo: roundToCents(totals.lessPromo),
    netSales: roundToCents(totals.netSales)
  };
};

const createDefaultSalesValues = (): SalesFormValues =>
  WEEK_DAYS.reduce((acc, day) => {
    acc[day] = {
      dailyGross: 0,
      lessSalesTax: 0,
      lessPromo: 0
    } satisfies WeeklySalesDay;
    return acc;
  }, {} as SalesFormValues);

const hydrateFormValues = (days?: Partial<Record<WeekDay, WeeklySalesDay>>): SalesFormValues => {
  const base = createDefaultSalesValues();
  if (!days) {
    return base;
  }

  WEEK_DAYS.forEach((day) => {
    const entry = days[day];
    if (entry) {
      base[day] = {
        dailyGross: toSafeNumber(entry.dailyGross),
        lessSalesTax: toSafeNumber(entry.lessSalesTax),
        lessPromo: toSafeNumber(entry.lessPromo)
      } satisfies WeeklySalesDay;
    }
  });

  return base;
};

export const SalesEntryPage = () => {
  const { weekId } = useParams<{ weekId: string }>();
  const { data: week } = useWeek(weekId);
  const { data: salesData, isLoading, isError, error } = useWeekSales(weekId);
  const saveSalesMutation = useSaveWeekSales();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const defaultFormValues = useMemo(() => createDefaultSalesValues(), []);

  const form = useForm<SalesFormValues>({
    resolver: zodResolver(salesSchema),
    defaultValues: defaultFormValues
  });

  useEffect(() => {
    if (salesData?.days) {
      form.reset(hydrateFormValues(salesData.days));
    }
  }, [salesData, form]);

  const isFinalized = week?.status === 'finalized';
  const salesByDay = form.watch();
  const totals = useMemo(() => calculateWeeklyTotals(salesByDay), [salesByDay]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!weekId) {
      return;
    }
    setFormError(null);
    setFormSuccess(null);
    try {
      await saveSalesMutation.mutateAsync({ weekId, data: { days: hydrateFormValues(values) } });
      setFormSuccess('Sales saved');
    } catch (mutationError) {
      const message =
        mutationError instanceof Error ? mutationError.message : 'Unable to save sales right now.';
      setFormError(message);
    }
  });

  if (!weekId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Daily sales entry</h1>
        <p className="text-sm text-slate-500">Select a week from the week list to continue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">{weekId}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">Daily sales entry</h1>
          {week ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {week.status}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-slate-500">
          Record gross sales, tax, and promos for each day. Weekly totals update automatically and feed the
          owner review.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Sales by day</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Loading sales...
            </div>
          ) : isError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load sales data.'}
            </div>
          ) : (
            <form className="space-y-6" onSubmit={onSubmit} noValidate>
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
                      <TableHead>Day</TableHead>
                      {salesFields.map((field) => (
                        <TableHead key={field.key}>{field.label}</TableHead>
                      ))}
                      <TableHead className="text-right">Net Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {WEEK_DAYS.map((dayKey) => {
                      const dayLabel = dayLabels[dayKey];
                      const errors = form.formState.errors?.[dayKey];
                      const netSales = calculateDailyNet(salesByDay?.[dayKey]);

                      return (
                        <TableRow key={dayKey}>
                          <TableCell className="font-medium text-slate-800">{dayLabel}</TableCell>
                          {salesFields.map((field) => {
                            const fieldName = `${dayKey}.${field.key}` as const;
                            const fieldError = errors?.[field.key]?.message;
                            return (
                              <TableCell key={field.key}>
                                <div className="space-y-1">
                                  <Input
                                    id={`${dayKey}-${field.key}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    aria-label={`${dayLabel} ${field.label}`}
                                    disabled={isFinalized}
                                    {...form.register(fieldName, { valueAsNumber: true })}
                                  />
                                  {fieldError ? (
                                    <p className="text-xs text-destructive">{fieldError}</p>
                                  ) : null}
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-semibold text-slate-700">
                            {formatCurrency(netSales)}
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
                <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Gross sales</dt>
                    <dd className="text-lg font-semibold text-slate-800">
                      {formatCurrency(totals.dailyGross)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Less sales tax</dt>
                    <dd className="text-lg font-semibold text-slate-800">
                      {formatCurrency(totals.lessSalesTax)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Less promo</dt>
                    <dd className="text-lg font-semibold text-slate-800">
                      {formatCurrency(totals.lessPromo)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Net sales</dt>
                    <dd className="text-lg font-semibold text-emerald-700">
                      {formatCurrency(totals.netSales)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-500">
                <p>Sales totals save with each submit. Finalized weeks are locked for editing.</p>
                <Button
                  type="submit"
                  disabled={isFinalized || form.formState.isSubmitting || saveSalesMutation.isPending}
                >
                  {saveSalesMutation.isPending ? 'Saving...' : isFinalized ? 'Finalized' : 'Save sales'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
