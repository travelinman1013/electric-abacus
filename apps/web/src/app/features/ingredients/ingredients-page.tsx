import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import type { Ingredient } from '@domain/costing';

import { FormField } from '../../components/forms/FormField';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import {
  useCreateIngredient,
  useIngredient,
  useIngredientVersions,
  useIngredients,
  useSetIngredientActive,
  useUpdateIngredient
} from '../../hooks/use-ingredients';

const ingredientSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  unitOfMeasure: z.string().min(1, 'Unit of measure required'),
  unitsPerCase: z
    .number({ invalid_type_error: 'Enter the units per case' })
    .positive('Must be greater than zero'),
  casePrice: z
    .number({ invalid_type_error: 'Enter the case price' })
    .nonnegative('Case price cannot be negative'),
  isActive: z.boolean().optional()
});

type IngredientFormValues = z.infer<typeof ingredientSchema>;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const toUnitCost = (casePrice: number, unitsPerCase: number) =>
  unitsPerCase ? Number((casePrice / unitsPerCase).toFixed(4)) : 0;

export const IngredientsPage = () => {
  const {
    data: ingredients = [],
    isLoading,
    isError,
    error: ingredientsError
  } = useIngredients();
  const createIngredientMutation = useCreateIngredient();
  const updateIngredientMutation = useUpdateIngredient();
  const setActiveMutation = useSetIngredientActive();

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);

  const editingIngredient = useIngredient(editingIngredientId);
  const ingredientVersions = useIngredientVersions(editingIngredientId);

  const createForm = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: '',
      unitOfMeasure: 'lb',
      unitsPerCase: 1,
      casePrice: 0,
      isActive: true
    }
  });

  const editForm = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: '',
      unitOfMeasure: 'lb',
      unitsPerCase: 1,
      casePrice: 0,
      isActive: true
    }
  });

  useEffect(() => {
    if (editingIngredient.data) {
      editForm.reset({
        name: editingIngredient.data.name,
        unitOfMeasure: editingIngredient.data.unitOfMeasure,
        unitsPerCase: editingIngredient.data.unitsPerCase,
        casePrice: editingIngredient.data.casePrice,
        isActive: editingIngredient.data.isActive
      });
    }
  }, [editingIngredient.data, editForm]);

  const sortedIngredients = useMemo(
    () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)),
    [ingredients]
  );

  const handleCreate = createForm.handleSubmit(async (values) => {
    setFormError(null);
    setFormSuccess(null);
    try {
      await createIngredientMutation.mutateAsync({ ...values, isActive: true });
      setFormSuccess('Ingredient created');
      createForm.reset({
        name: '',
        unitOfMeasure: values.unitOfMeasure,
        unitsPerCase: values.unitsPerCase,
        casePrice: values.casePrice,
        isActive: true
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create ingredient.';
      setFormError(message);
    }
  });

  const handleUpdate = editForm.handleSubmit(async (values) => {
    if (!editingIngredientId) {
      return;
    }
    setFormError(null);
    setFormSuccess(null);
    try {
      const currentActive = editingIngredient.data?.isActive ?? values.isActive ?? true;
      await updateIngredientMutation.mutateAsync({ id: editingIngredientId, ...values, isActive: currentActive });
      setFormSuccess('Ingredient updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update ingredient.';
      setFormError(message);
    }
  });

  const handleToggleActive = async (ingredient: Ingredient) => {
    try {
      await setActiveMutation.mutateAsync({ ingredientId: ingredient.id, isActive: !ingredient.isActive });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update ingredient status.';
      setFormError(message);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-slate-900">Ingredient catalog</h1>
        <p className="text-sm text-slate-500">
          Manage cost inputs that drive the weekly franchise fee report. Ingredient versions capture price
          changes over time.
        </p>
      </header>

      {isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ingredientsError instanceof Error ? ingredientsError.message : 'Failed to load ingredients.'}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current ingredients</CardTitle>
            <CardDescription>Unit costs update automatically from case price and pack size.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Loading ingredients...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Units / case</TableHead>
                    <TableHead className="text-right">Case price</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedIngredients.map((ingredient) => (
                    <TableRow key={ingredient.id}>
                      <TableCell className="font-medium text-slate-800">{ingredient.name}</TableCell>
                      <TableCell>
                        <Badge variant={ingredient.isActive ? 'success' : 'warning'}>
                          {ingredient.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{ingredient.unitOfMeasure}</TableCell>
                      <TableCell className="text-right">{ingredient.unitsPerCase}</TableCell>
                      <TableCell className="text-right">{formatCurrency(ingredient.casePrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(ingredient.unitCost)}</TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(ingredient)}
                          disabled={setActiveMutation.isPending}
                        >
                          {ingredient.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setEditingIngredientId(ingredient.id)}
                          variant={editingIngredientId === ingredient.id ? 'secondary' : 'ghost'}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="text-sm text-slate-500">
            Updating an ingredient will spawn a new version record used for future weeks.
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create ingredient</CardTitle>
              <CardDescription>Add new cost inputs to the catalog.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreate} noValidate>
                {formError && !editingIngredientId ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {formError}
                  </div>
                ) : null}
                {formSuccess && !editingIngredientId ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {formSuccess}
                  </div>
                ) : null}

                <FormField
                  label="Name"
                  htmlFor="new-name"
                  required
                  error={createForm.formState.errors.name?.message}
                >
                  <Input id="new-name" {...createForm.register('name')} />
                </FormField>

                <FormField
                  label="Unit of measure"
                  htmlFor="new-unit"
                  required
                  error={createForm.formState.errors.unitOfMeasure?.message}
                >
                  <Input id="new-unit" {...createForm.register('unitOfMeasure')} />
                </FormField>

                <FormField
                  label="Units per case"
                  htmlFor="new-units"
                  required
                  error={createForm.formState.errors.unitsPerCase?.message}
                >
                  <Input
                    id="new-units"
                    type="number"
                    min="0"
                    step="0.01"
                    {...createForm.register('unitsPerCase', { valueAsNumber: true })}
                  />
                </FormField>

                <FormField
                  label="Case price"
                  htmlFor="new-case-price"
                  required
                  error={createForm.formState.errors.casePrice?.message}
                >
                  <Input
                    id="new-case-price"
                    type="number"
                    min="0"
                    step="0.01"
                    {...createForm.register('casePrice', { valueAsNumber: true })}
                  />
                </FormField>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createIngredientMutation.isPending || createForm.formState.isSubmitting}
                >
                  {createIngredientMutation.isPending ? 'Creating...' : 'Add ingredient'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {editingIngredientId ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit ingredient</CardTitle>
                <CardDescription>
                  Update pricing or pack sizes to spawn a new cost version.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formError && editingIngredientId ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {formError}
                  </div>
                ) : null}
                {formSuccess && editingIngredientId ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {formSuccess}
                  </div>
                ) : null}

                <form className="space-y-4" onSubmit={handleUpdate} noValidate>
                  <FormField
                    label="Name"
                    htmlFor="edit-name"
                    required
                    error={editForm.formState.errors.name?.message}
                  >
                    <Input id="edit-name" {...editForm.register('name')} />
                  </FormField>

                  <FormField
                    label="Unit of measure"
                    htmlFor="edit-unit"
                    required
                    error={editForm.formState.errors.unitOfMeasure?.message}
                  >
                    <Input id="edit-unit" {...editForm.register('unitOfMeasure')} />
                  </FormField>

                  <FormField
                    label="Units per case"
                    htmlFor="edit-units"
                    required
                    error={editForm.formState.errors.unitsPerCase?.message}
                  >
                    <Input
                      id="edit-units"
                      type="number"
                      min="0"
                      step="0.01"
                      {...editForm.register('unitsPerCase', { valueAsNumber: true })}
                    />
                  </FormField>

                  <FormField
                    label="Case price"
                    htmlFor="edit-case-price"
                    required
                    error={editForm.formState.errors.casePrice?.message}
                  >
                    <Input
                      id="edit-case-price"
                      type="number"
                      min="0"
                      step="0.01"
                      {...editForm.register('casePrice', { valueAsNumber: true })}
                    />
                  </FormField>

                  <div className="text-xs text-slate-500">
                    Unit cost will update to{' '}
                    {formatCurrency(
                      toUnitCost(
                        editForm.watch('casePrice') ?? 0,
                        editForm.watch('unitsPerCase') ?? 1
                      )
                    )}
                    .
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Button type="button" variant="ghost" onClick={() => setEditingIngredientId(null)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        editForm.formState.isSubmitting || updateIngredientMutation.isPending || isLoading
                      }
                    >
                      {updateIngredientMutation.isPending ? 'Saving...' : 'Save changes'}
                    </Button>
                  </div>
                </form>

                <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-700">Version history</p>
                  {ingredientVersions.data?.length ? (
                    <ul className="space-y-1">
                      {ingredientVersions.data.map((version) => (
                        <li key={version.id} className="flex items-center justify-between">
                          <span>
                            {formatCurrency(version.unitCost)} • {version.unitsPerCase} {version.id}
                          </span>
                          <span className="text-slate-400">
                            {new Date(version.effectiveFrom).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">No versions recorded yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};
