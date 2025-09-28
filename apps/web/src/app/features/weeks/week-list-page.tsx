import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import type { UserRole, Week, WeekStatus } from '@domain/costing';

import { FormField } from '../../components/forms/FormField';
import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';
import { useAuthContext } from '../../providers/auth-provider';
import { useActiveIngredientIds } from '../../hooks/use-ingredients';
import { useCreateWeek, useWeeks } from '../../hooks/use-weeks';

const weekIdSchema = z.object({
  weekId: z
    .string()
    .regex(/^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/, 'Use ISO 8601 week format e.g. 2025-W05')
});

type CreateWeekForm = z.infer<typeof weekIdSchema>;

const badgeVariantByStatus: Record<WeekStatus, 'warning' | 'success'> = {
  draft: 'warning',
  finalized: 'success'
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(new Date(value));
};

const nextWeekId = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const onejan = new Date(Date.UTC(year, 0, 1));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const week = Math.ceil(((today.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
};

type WeekRowAction = {
  label: string;
  to: string;
  variant?: 'default' | 'outline';
};

const actionsForRole = (role: UserRole, week: Week): WeekRowAction[] => {
  if (role === 'owner') {
    return [
      {
        label: week.status === 'draft' ? 'Review & finalize' : 'View review',
        to: `/weeks/${week.id}/review`,
        variant: 'default'
      },
      {
        label: 'Inventory',
        to: `/weeks/${week.id}/inventory`,
        variant: 'outline'
      }
    ];
  }

  if (role === 'teamMember') {
    return [
      {
        label: week.status === 'draft' ? 'Enter sales' : 'View sales',
        to: `/weeks/${week.id}/sales`,
        variant: 'default'
      },
      {
        label: 'Inventory',
        to: `/weeks/${week.id}/inventory`,
        variant: 'outline'
      }
    ];
  }

  return [];
};

export const WeekListPage = () => {
  const { profile } = useAuthContext();
  const { data: weeks = [], isLoading, isError, error } = useWeeks();
  const { data: activeIngredientIds = [] } = useActiveIngredientIds();
  const createWeekMutation = useCreateWeek();

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const form = useForm<CreateWeekForm>({
    resolver: zodResolver(weekIdSchema),
    defaultValues: { weekId: nextWeekId() }
  });

  const sortedWeeks = useMemo(
    () =>
      [...weeks].sort((a, b) => {
        if (a.createdAt === b.createdAt) {
          return a.id > b.id ? -1 : 1;
        }
        return a.createdAt > b.createdAt ? -1 : 1;
      }),
    [weeks]
  );

  const canCreateWeek = profile?.role === 'owner';

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setFormSuccess(null);
    try {
      await createWeekMutation.mutateAsync({
        weekId: values.weekId,
        ingredientIds: activeIngredientIds
      });
      setFormSuccess(`Week ${values.weekId} created`);
      form.reset({ weekId: nextWeekId() });
    } catch (mutationError) {
      const message =
        mutationError instanceof Error ? mutationError.message : 'Unable to create week right now.';
      setFormError(message);
    }
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Weekly Operations</h1>
        <p className="text-sm text-slate-500">
          Track draft weeks, capture team inputs, and finalize reports for franchise fee submission.
        </p>
      </header>

      {isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load weeks.'}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Active weeks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Loading weeks...
              </div>
            ) : sortedWeeks.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedWeeks.map((week) => {
                    const actions = profile ? actionsForRole(profile.role, week) : [];
                    return (
                      <TableRow key={week.id}>
                        <TableCell className="font-medium text-slate-800">{week.id}</TableCell>
                        <TableCell>
                          <Badge variant={badgeVariantByStatus[week.status]} className="uppercase">
                            {week.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(week.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          {actions.length ? (
                            <div className="flex justify-end gap-2">
                              {actions.map((action) => (
                                <Link
                                  key={`${week.id}-${action.to}`}
                                  to={action.to}
                                  className={cn(
                                    buttonVariants({
                                      variant: action.variant ?? 'outline',
                                      size: 'sm'
                                    })
                                  )}
                                >
                                  {action.label}
                                </Link>
                              ))}
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No weeks yet. Owners can create the first week to kick off data collection.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{canCreateWeek ? 'Create a new week' : 'Need a week?'}</CardTitle>
          </CardHeader>
          <CardContent>
            {canCreateWeek ? (
              <form className="space-y-4" onSubmit={onSubmit} noValidate>
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

                <FormField
                  label="Week ID"
                  htmlFor="weekId"
                  required
                  description="Use ISO week format: YYYY-W##"
                  error={form.formState.errors.weekId?.message}
                >
                  <Input id="weekId" placeholder="2025-W05" {...form.register('weekId')} />
                </FormField>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createWeekMutation.isPending || form.formState.isSubmitting}
                >
                  {createWeekMutation.isPending ? 'Creating...' : 'Create week'}
                </Button>
                <p className="text-xs text-slate-500">
                  Opening a week records a draft shell for the team to provide sales and inventory. Active
                  ingredients are preloaded for inventory tracking.
                </p>
              </form>
            ) : (
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  Only owners can open a new week. Request an owner to create the week before entering
                  sales or inventory.
                </p>
                <p className="text-xs text-slate-500">
                  Tip: Use the Seed script to provision a sample draft week during local development.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
