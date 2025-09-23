import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useWeek, useSaveWeekSales, useWeekSales } from '../../hooks/use-weeks';

const daysOfWeek = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' }
] as const;

const salesSchema = z.object(
  daysOfWeek.reduce<Record<(typeof daysOfWeek)[number]['key'], z.ZodNumber>>((shape, day) => {
    shape[day.key] = z
      .number({ invalid_type_error: 'Enter a valid amount' })
      .min(0, 'No negative values')
      .max(1_000_000, 'That total looks too high');
    return shape;
  }, {} as Record<(typeof daysOfWeek)[number]['key'], z.ZodNumber>)
);

type SalesFormValues = z.infer<typeof salesSchema>;

const toDefaultSales = () =>
  daysOfWeek.reduce<SalesFormValues>((acc, day) => {
    acc[day.key] = 0;
    return acc;
  }, {} as SalesFormValues);

export const SalesEntryPage = () => {
  const { weekId } = useParams<{ weekId: string }>();
  const { data: week } = useWeek(weekId);
  const { data: salesData, isLoading, isError, error } = useWeekSales(weekId);
  const saveSalesMutation = useSaveWeekSales();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const form = useForm<SalesFormValues>({
    resolver: zodResolver(salesSchema),
    defaultValues: useMemo(() => toDefaultSales(), [])
  });

  useEffect(() => {
    if (salesData) {
      form.reset({
        mon: salesData.mon,
        tue: salesData.tue,
        wed: salesData.wed,
        thu: salesData.thu,
        fri: salesData.fri,
        sat: salesData.sat,
        sun: salesData.sun
      });
    }
  }, [salesData, form]);

  const isFinalized = week?.status === 'finalized';

  const onSubmit = form.handleSubmit(async (values) => {
    if (!weekId) {
      return;
    }
    setFormError(null);
    setFormSuccess(null);
    try {
      await saveSalesMutation.mutateAsync({ weekId, data: values });
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
          Capture net sales for each day of the week. Values feed into the owner's costing review.
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

              <div className="grid gap-4 md:grid-cols-2">
                {daysOfWeek.map((day) => (
                  <FormField
                    key={day.key}
                    label={day.label}
                    htmlFor={day.key}
                    required
                    description="Enter net sales in USD"
                    error={form.formState.errors[day.key]?.message}
                  >
                    <Input
                      id={day.key}
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={isFinalized}
                      {...form.register(day.key, { valueAsNumber: true })}
                    />
                  </FormField>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-500">
                <p>
                  Sales totals auto-save with each submit. Owners can review totals before finalizing the
                  week.
                </p>
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
