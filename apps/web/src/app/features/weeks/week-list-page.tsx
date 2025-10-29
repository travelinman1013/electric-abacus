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
import { useTerminology } from '../../hooks/use-terminology';

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

const actionsForRole = (role: UserRole, week: Week, inventoryLabel: string): WeekRowAction[] => {
  if (role === 'owner') {
    return [
      {
        label: week.status === 'draft' ? 'Review & finalize' : 'View review',
        to: `/app/weeks/${week.id}/review`,
        variant: 'default'
      },
      {
        label: inventoryLabel,
        to: `/app/weeks/${week.id}/inventory`,
        variant: 'outline'
      }
    ];
  }

  if (role === 'teamMember') {
    return [
      {
        label: week.status === 'draft' ? 'Enter sales' : 'View sales',
        to: `/app/weeks/${week.id}/sales`,
        variant: 'default'
      },
      {
        label: inventoryLabel,
        to: `/app/weeks/${week.id}/inventory`,
        variant: 'outline'
      }
    ];
  }

  return [];
};

export const WeekListPage = () => {
  const { terms } = useTerminology();
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
      setFormSuccess(`${terms.week} ${values.weekId} created`);
      form.reset({ weekId: nextWeekId() });
    } catch (mutationError) {
      const message =
        mutationError instanceof Error ? mutationError.message : `Unable to create ${terms.week.toLowerCase()} right now.`;
      setFormError(message);
    }
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Weekly Operations</h1>
        <p className="text-sm text-muted-foreground">
          Track draft {terms.weeks.toLowerCase()}, capture team inputs, and finalize reports for franchise fee submission.
        </p>
      </header>

      {isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : `Failed to load ${terms.weeks.toLowerCase()}.`}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Active {terms.weeks.toLowerCase()}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-md border border-dashed border p-6 text-center text-sm text-muted-foreground bg-muted/50">
                Loading {terms.weeks.toLowerCase()}...
              </div>
            ) : sortedWeeks.length ? (
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[80px]">{terms.week}</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Created</TableHead>
                      <TableHead className="text-right min-w-[140px] sm:min-w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedWeeks.map((week) => {
                      const actions = profile ? actionsForRole(profile.role, week, terms.inventory) : [];
                      return (
                        <TableRow key={week.id}>
                          <TableCell className="font-medium text-foreground">{week.id}</TableCell>
                          <TableCell>
                            <Badge variant={badgeVariantByStatus[week.status]} className="uppercase text-[10px] sm:text-xs">
                              {week.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{formatDate(week.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            {actions.length ? (
                              <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                                {actions.map((action) => (
                                  <Link
                                    key={`${week.id}-${action.to}`}
                                    to={action.to}
                                    className={cn(
                                      buttonVariants({
                                        variant: action.variant ?? 'outline',
                                        size: 'sm'
                                      }),
                                      'text-xs whitespace-nowrap'
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
              </div>
            ) : (
              <div className="rounded-md border border-dashed border p-6 text-center text-sm text-muted-foreground bg-muted/50">
                No {terms.weeks.toLowerCase()} yet. Owners can create the first {terms.week.toLowerCase()} to kick off data collection.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{canCreateWeek ? `Create a new ${terms.week.toLowerCase()}` : `Need a ${terms.week.toLowerCase()}?`}</CardTitle>
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
                  label={`${terms.week} ID`}
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
                  {createWeekMutation.isPending ? 'Creating...' : `Create ${terms.week.toLowerCase()}`}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Opening a {terms.week.toLowerCase()} records a draft shell for the team to provide sales and {terms.inventory.toLowerCase()}. Active
                  {terms.ingredients.toLowerCase()} are preloaded for {terms.inventory.toLowerCase()} tracking.
                </p>
              </form>
            ) : (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Only owners can open a new {terms.week.toLowerCase()}. Request an owner to create the {terms.week.toLowerCase()} before entering
                  sales or {terms.inventory.toLowerCase()}.
                </p>
                <p className="text-xs text-muted-foreground">
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
