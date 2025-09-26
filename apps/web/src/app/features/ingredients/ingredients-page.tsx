import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';

import type { Ingredient, IngredientCategory } from '@domain/costing';
import { getConversionFactor, ALLOWED_UNITS, UNIT_LABELS, getCompatibleUnits, type AllowedUnit } from '@domain/units';
import { calculateRecipeCost } from '@domain/costing';

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
import { NumberInput } from '../../components/ui/number-input';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';
import {
  useCreateIngredient,
  useIngredient,
  useIngredientVersions,
  useIngredients,
  useSetIngredientActive,
  useUpdateIngredient
} from '../../hooks/use-ingredients';

type IngredientFormValues = {
  name: string;
  inventoryUnit: string;
  recipeUnit?: string;
  unitsPerCase: number;
  casePrice: number;
  category?: IngredientCategory;
  isActive?: boolean;
  isBatch?: boolean;
  recipeIngredients?: {
    id: string;
    ingredientId: string;
    quantity: number;
    unitOfMeasure: string;
  }[];
  yield?: number;
  yieldUnit?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const toUnitCost = (casePrice: number, unitsPerCase: number) =>
  unitsPerCase ? Number((casePrice / unitsPerCase).toFixed(4)) : 0;

const formatConversionFactor = (inventoryUnit: string, recipeUnit: string) => {
  if (!inventoryUnit || !recipeUnit) {
    return '';
  }

  const factor = getConversionFactor(inventoryUnit, recipeUnit);
  if (factor === null) {
    return 'N/A';
  }

  return factor.toString();
};

const formatUnitOption = (unit: AllowedUnit) => {
  return `${unit} - ${UNIT_LABELS[unit]}`;
};

const getRecipeUnitOptions = (inventoryUnit: string): AllowedUnit[] => {
  if (!inventoryUnit) {
    return [];
  }
  return getCompatibleUnits(inventoryUnit);
};

const buildDefaultRecipeIngredient = (ingredient?: Ingredient) => ({
  id: Math.random().toString(36).substr(2, 9),
  ingredientId: ingredient?.id ?? '',
  quantity: 1,
  unitOfMeasure: ingredient?.recipeUnit ?? ingredient?.inventoryUnit ?? 'unit',
});

const calculateBatchCost = (
  recipeIngredients: IngredientFormValues['recipeIngredients'] = [],
  allIngredients: Ingredient[],
  batchYield: number | undefined
) => {
  if (!recipeIngredients.length || !batchYield || batchYield <= 0) {
    return { totalCost: 0, costPerUnit: 0 };
  }

  // Convert form recipe ingredients to the format expected by calculateRecipeCost
  const recipes = recipeIngredients.map(ri => ({
    id: ri.id,
    ingredientId: ri.ingredientId,
    quantity: ri.quantity,
    unitOfMeasure: ri.unitOfMeasure
  }));

  const costSummary = calculateRecipeCost(recipes, allIngredients);
  const totalCost = costSummary.totalRecipeCost;
  const costPerUnit = totalCost / batchYield;

  return {
    totalCost,
    costPerUnit: Number(costPerUnit.toFixed(4))
  };
};

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
  const [isCreating, setIsCreating] = useState(false);

  const editingIngredient = useIngredient(editingIngredientId || undefined);
  const ingredientVersions = useIngredientVersions(editingIngredientId || undefined);

  const createForm = useForm<IngredientFormValues>({
    defaultValues: {
      name: '',
      inventoryUnit: 'lb',
      recipeUnit: '',
      unitsPerCase: 1,
      casePrice: 0,
      category: 'food' as IngredientCategory,
      isActive: true,
      isBatch: false,
      recipeIngredients: [],
      yield: undefined,
      yieldUnit: ''
    }
  });

  const editForm = useForm<IngredientFormValues>({
    defaultValues: {
      name: '',
      inventoryUnit: 'lb',
      recipeUnit: '',
      unitsPerCase: 1,
      casePrice: 0,
      category: 'food' as IngredientCategory,
      isActive: true,
      isBatch: false,
      recipeIngredients: [],
      yield: undefined,
      yieldUnit: ''
    }
  });

  const createRecipeIngredients = useFieldArray({
    control: createForm.control,
    name: 'recipeIngredients'
  });

  const editRecipeIngredients = useFieldArray({
    control: editForm.control,
    name: 'recipeIngredients'
  });

  useEffect(() => {
    if (editingIngredient.data) {
      editForm.reset({
        name: editingIngredient.data.name,
        inventoryUnit: editingIngredient.data.inventoryUnit,
        recipeUnit: editingIngredient.data.recipeUnit || '',
        unitsPerCase: editingIngredient.data.unitsPerCase,
        casePrice: editingIngredient.data.casePrice,
        category: editingIngredient.data.category,
        isActive: editingIngredient.data.isActive,
        isBatch: editingIngredient.data.isBatch || false,
        recipeIngredients: editingIngredient.data.recipeIngredients || [],
        yield: editingIngredient.data.yield,
        yieldUnit: editingIngredient.data.yieldUnit || ''
      });
    }
  }, [editingIngredient.data, editForm]);

  const sortedIngredients = useMemo(
    () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)),
    [ingredients]
  );

  // Filter out batch ingredients from the recipe ingredients list to prevent circular dependencies
  const availableForBatch = useMemo(
    () => ingredients.filter(ingredient => !ingredient.isBatch && ingredient.isActive),
    [ingredients]
  );

  // Clear recipe unit when inventory unit changes to incompatible category in create form
  useEffect(() => {
    const subscription = createForm.watch((value, { name }) => {
      if (name === 'inventoryUnit') {
        const currentRecipeUnit = createForm.getValues('recipeUnit');
        if (currentRecipeUnit && value.inventoryUnit && !getRecipeUnitOptions(value.inventoryUnit).includes(currentRecipeUnit as AllowedUnit)) {
          createForm.setValue('recipeUnit', '');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [createForm]);

  // Clear recipe unit when inventory unit changes to incompatible category in edit form
  useEffect(() => {
    const subscription = editForm.watch((value, { name }) => {
      if (name === 'inventoryUnit') {
        const currentRecipeUnit = editForm.getValues('recipeUnit');
        if (currentRecipeUnit && value.inventoryUnit && !getRecipeUnitOptions(value.inventoryUnit).includes(currentRecipeUnit as AllowedUnit)) {
          editForm.setValue('recipeUnit', '');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [editForm]);

  // Initialize recipe ingredients when batch is toggled on for create form
  useEffect(() => {
    const subscription = createForm.watch((value, { name }) => {
      if (name === 'isBatch' && value.isBatch && createRecipeIngredients.fields.length === 0) {
        if (availableForBatch.length > 0) {
          createRecipeIngredients.append(buildDefaultRecipeIngredient(availableForBatch[0]));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [createForm, createRecipeIngredients, availableForBatch]);

  // Initialize recipe ingredients when batch is toggled on for edit form
  useEffect(() => {
    const subscription = editForm.watch((value, { name }) => {
      if (name === 'isBatch' && value.isBatch && editRecipeIngredients.fields.length === 0) {
        if (availableForBatch.length > 0) {
          editRecipeIngredients.append(buildDefaultRecipeIngredient(availableForBatch[0]));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [editForm, editRecipeIngredients, availableForBatch]);

  // Calculate batch cost for create form
  const createFormIsBatch = createForm.watch('isBatch');
  const createFormRecipeIngredients = createForm.watch('recipeIngredients');
  const createFormYield = createForm.watch('yield');

  const createBatchCost = useMemo(() => {
    if (!createFormIsBatch) return { totalCost: 0, costPerUnit: 0 };

    return calculateBatchCost(createFormRecipeIngredients, availableForBatch, createFormYield);
  }, [createFormIsBatch, createFormRecipeIngredients, createFormYield, availableForBatch]);

  // Calculate batch cost for edit form
  const editFormIsBatch = editForm.watch('isBatch');
  const editFormRecipeIngredients = editForm.watch('recipeIngredients');
  const editFormYield = editForm.watch('yield');

  const editBatchCost = useMemo(() => {
    if (!editFormIsBatch) return { totalCost: 0, costPerUnit: 0 };

    return calculateBatchCost(editFormRecipeIngredients, availableForBatch, editFormYield);
  }, [editFormIsBatch, editFormRecipeIngredients, editFormYield, availableForBatch]);

  const handleAddRecipeIngredient = (fieldArray: typeof createRecipeIngredients) => {
    const nextIngredient = availableForBatch.find(
      (ingredient) => !fieldArray.fields.some((field) => field.ingredientId === ingredient.id)
    );
    if (!nextIngredient) {
      return;
    }
    fieldArray.append(buildDefaultRecipeIngredient(nextIngredient));
  };

  const renderRecipeRows = (
    fieldArray: typeof createRecipeIngredients,
    form: typeof createForm,
    ingredientsList: Ingredient[],
  ) => {
    const errors = form.formState.errors.recipeIngredients ?? [];
    return fieldArray.fields.map((field, index) => {
      const error = errors[index];
      return (
        <TableRow key={field.id ?? index}>
          <TableCell className="font-medium align-middle min-w-[140px]">
            <Select className="w-full text-sm" {...form.register(`recipeIngredients.${index}.ingredientId` as const)}>
              <option value="">Select</option>
              {ingredientsList.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </Select>
            {error?.ingredientId?.message ? (
              <p className="text-destructive text-xs mt-1">{error.ingredientId.message}</p>
            ) : null}
          </TableCell>
          <TableCell className="align-middle text-right">
            <NumberInput
              className="text-right"
              inputClassName="text-base text-right"
              increment={0.25}
              min={0}
              value={form.watch(`recipeIngredients.${index}.quantity`) || 0}
              onChange={(value) => form.setValue(`recipeIngredients.${index}.quantity`, value)}
            />
            {error?.quantity?.message ? (
              <p className="text-destructive text-xs mt-1">{error.quantity.message}</p>
            ) : null}
          </TableCell>
          <TableCell className="align-middle">
            <Input
              className="w-[90px] text-right text-sm bg-slate-50 cursor-not-allowed"
              readOnly
              {...form.register(`recipeIngredients.${index}.unitOfMeasure` as const)}
            />
            {error?.unitOfMeasure?.message ? (
              <p className="text-destructive text-xs mt-1">{error.unitOfMeasure.message}</p>
            ) : null}
          </TableCell>
          <TableCell className="text-right font-medium align-middle">
            {(() => {
              const ingredientId = form.watch(`recipeIngredients.${index}.ingredientId`);
              const ingredient = ingredientsList.find((ing) => ing.id === ingredientId);
              const quantity = form.watch(`recipeIngredients.${index}.quantity`) || 0;
              const recipeUnit = form.watch(`recipeIngredients.${index}.unitOfMeasure`);

              if (ingredient && quantity > 0) {
                let effectiveUnitCost = ingredient.unitCost;

                // Apply conversion if recipe uses recipe unit
                if (ingredient.recipeUnit && ingredient.conversionFactor && ingredient.conversionFactor > 0) {
                  if (recipeUnit === ingredient.recipeUnit) {
                    effectiveUnitCost = ingredient.unitCost / ingredient.conversionFactor;
                  }
                }

                return formatCurrency(effectiveUnitCost * quantity);
              }
              return '—';
            })()}
          </TableCell>
          <TableCell className="w-[1%] whitespace-nowrap text-right align-middle">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => fieldArray.remove(index)}
              disabled={fieldArray.fields.length === 1}
              className="text-xs px-2 py-1"
            >
              Remove
            </Button>
          </TableCell>
        </TableRow>
      );
    });
  };

  const handleCreate = createForm.handleSubmit(async (values) => {
    setFormError(null);
    setFormSuccess(null);
    try {
      await createIngredientMutation.mutateAsync({ ...values, isActive: true });
      setFormSuccess('Ingredient created');
      setIsCreating(false);
      createForm.reset({
        name: '',
        inventoryUnit: values.inventoryUnit,
        recipeUnit: '',
        unitsPerCase: values.unitsPerCase,
        casePrice: values.casePrice,
        category: 'food' as IngredientCategory,
        isActive: true,
        isBatch: false,
        recipeIngredients: [],
        yield: undefined,
        yieldUnit: ''
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

      <div className={cn('grid gap-6 lg:grid-cols-1 lg:items-start', {
        'xl:grid-cols-[2fr_1fr] 2xl:grid-cols-[3fr_2fr]': editingIngredientId || isCreating,
      })}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Current ingredients</CardTitle>
                <CardDescription>Unit costs update automatically from case price and pack size.</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setIsCreating(true);
                  setEditingIngredientId(null);
                }}
              >
                Create Ingredient
              </Button>
            </div>
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
                      <TableCell>{ingredient.inventoryUnit}</TableCell>
                      <TableCell className="text-right">{ingredient.unitsPerCase}</TableCell>
                      <TableCell className="text-right">{formatCurrency(ingredient.casePrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(ingredient.unitCost)}</TableCell>
                      <TableCell className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleToggleActive(ingredient)}
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
          {isCreating && (
            <Card>
            <CardHeader>
              <CardTitle>Create ingredient</CardTitle>
              <CardDescription>Add new cost inputs to the catalog.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => void handleCreate(e)} noValidate>
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
                  label="Inventory Unit"
                  htmlFor="new-inventory-unit"
                  required
                  error={createForm.formState.errors.inventoryUnit?.message}
                >
                  <Select id="new-inventory-unit" {...createForm.register('inventoryUnit')}>
                    {ALLOWED_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {formatUnitOption(unit)}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  label="Recipe Unit"
                  htmlFor="new-recipe-unit"
                  error={createForm.formState.errors.recipeUnit?.message}
                >
                  <Select
                    id="new-recipe-unit"
                    {...createForm.register('recipeUnit')}
                    onChange={(e) => {
                      createForm.setValue('recipeUnit', e.target.value);
                    }}
                  >
                    <option value="">
                      {createForm.watch('inventoryUnit') ? 'Select recipe unit' : 'Select inventory unit first'}
                    </option>
                    {getRecipeUnitOptions(createForm.watch('inventoryUnit')).map((unit) => (
                      <option key={unit} value={unit}>
                        {formatUnitOption(unit)}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  label="Conversion Factor"
                  htmlFor="new-conversion-factor"
                  description="Automatically calculated when inventory and recipe units are compatible"
                >
                  <div
                    id="new-conversion-factor"
                    className="flex h-9 w-full rounded-md border border-input bg-slate-100 px-3 py-1 text-sm text-slate-500 shadow-sm"
                  >
                    {formatConversionFactor(createForm.watch('inventoryUnit'), createForm.watch('recipeUnit') || '') || 'Enter recipe unit to see conversion'}
                  </div>
                </FormField>

                <FormField
                  label="Category"
                  htmlFor="new-category"
                  error={createForm.formState.errors.category?.message}
                >
                  <Select id="new-category" {...createForm.register('category')}>
                    <option value="food">Food</option>
                    <option value="paper">Paper Goods</option>
                    <option value="other">Other</option>
                  </Select>
                </FormField>

                <FormField
                  label="Batch Recipe"
                  htmlFor="new-is-batch"
                  description="Check this if this ingredient is made from other ingredients in batches"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="new-is-batch"
                      {...createForm.register('isBatch')}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="new-is-batch" className="text-sm font-medium">
                      This is a batch recipe
                    </label>
                  </div>
                </FormField>

                {createFormIsBatch && (
                  <>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-slate-700">Batch Cost:</span>
                        <span className="font-mono text-slate-900">
                          {formatCurrency(createBatchCost.totalCost)}
                        </span>
                      </div>
                      {createBatchCost.costPerUnit > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">Cost per {createForm.watch('yieldUnit') || 'unit'}:</span>
                          <span className="font-mono text-slate-900">
                            {formatCurrency(createBatchCost.costPerUnit)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        label="Batch Yield"
                        htmlFor="new-yield"
                        required
                        error={createForm.formState.errors.yield?.message}
                      >
                        <Input
                          id="new-yield"
                          type="number"
                          min="0"
                          step="0.01"
                          {...createForm.register('yield', { valueAsNumber: true })}
                        />
                      </FormField>

                      <FormField
                        label="Yield Unit"
                        htmlFor="new-yield-unit"
                        required
                        error={createForm.formState.errors.yieldUnit?.message}
                      >
                        <Select id="new-yield-unit" {...createForm.register('yieldUnit')}>
                          <option value="">Select unit</option>
                          {ALLOWED_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {formatUnitOption(unit)}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>

                    <div className="overflow-x-auto -mx-3 sm:-mx-6 px-3 sm:px-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-700">Recipe Ingredients</h4>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddRecipeIngredient(createRecipeIngredients)}
                          disabled={availableForBatch.length === createRecipeIngredients.fields.length}
                        >
                          Add Ingredient
                        </Button>
                      </div>
                      <Table className="min-w-full text-xs sm:text-sm">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-auto min-w-[140px]">Ingredient</TableHead>
                            <TableHead className="w-24 text-right">Quantity</TableHead>
                            <TableHead className="w-20 text-right">Unit</TableHead>
                            <TableHead className="w-24 text-right">Line Cost</TableHead>
                            <TableHead className="w-16 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {renderRecipeRows(createRecipeIngredients, createForm, availableForBatch)}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {!createForm.watch('isBatch') && (
                  <>
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
                  </>
                )}

                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createIngredientMutation.isPending || createForm.formState.isSubmitting}
                  >
                    {createIngredientMutation.isPending ? 'Creating...' : 'Add ingredient'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          )}

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

                <form className="space-y-4" onSubmit={(e) => void handleUpdate(e)} noValidate>
                  <FormField
                    label="Name"
                    htmlFor="edit-name"
                    required
                    error={editForm.formState.errors.name?.message}
                  >
                    <Input id="edit-name" {...editForm.register('name')} />
                  </FormField>

                  <FormField
                    label="Inventory Unit"
                    htmlFor="edit-inventory-unit"
                    required
                    error={editForm.formState.errors.inventoryUnit?.message}
                  >
                    <Select id="edit-inventory-unit" {...editForm.register('inventoryUnit')}>
                      {ALLOWED_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {formatUnitOption(unit)}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField
                    label="Recipe Unit"
                    htmlFor="edit-recipe-unit"
                    error={editForm.formState.errors.recipeUnit?.message}
                  >
                    <Select
                      id="edit-recipe-unit"
                      {...editForm.register('recipeUnit')}
                      onChange={(e) => {
                        editForm.setValue('recipeUnit', e.target.value);
                      }}
                    >
                      <option value="">
                        {editForm.watch('inventoryUnit') ? 'Select recipe unit' : 'Select inventory unit first'}
                      </option>
                      {getRecipeUnitOptions(editForm.watch('inventoryUnit')).map((unit) => (
                        <option key={unit} value={unit}>
                          {formatUnitOption(unit)}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField
                    label="Conversion Factor"
                    htmlFor="edit-conversion-factor"
                    description="Automatically calculated when inventory and recipe units are compatible"
                  >
                    <div
                      id="edit-conversion-factor"
                      className="flex h-9 w-full rounded-md border border-input bg-slate-100 px-3 py-1 text-sm text-slate-500 shadow-sm"
                    >
                      {formatConversionFactor(editForm.watch('inventoryUnit'), editForm.watch('recipeUnit') || '') || 'Enter recipe unit to see conversion'}
                    </div>
                  </FormField>

                  <FormField
                    label="Category"
                    htmlFor="edit-category"
                    error={editForm.formState.errors.category?.message}
                  >
                    <Select id="edit-category" {...editForm.register('category')}>
                      <option value="food">Food</option>
                      <option value="paper">Paper Goods</option>
                      <option value="other">Other</option>
                    </Select>
                  </FormField>

                  <FormField
                    label="Batch Recipe"
                    htmlFor="edit-is-batch"
                    description="Check this if this ingredient is made from other ingredients in batches"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="edit-is-batch"
                        {...editForm.register('isBatch')}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="edit-is-batch" className="text-sm font-medium">
                        This is a batch recipe
                      </label>
                    </div>
                  </FormField>

                  {editFormIsBatch && (
                    <>
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-medium text-slate-700">Batch Cost:</span>
                          <span className="font-mono text-slate-900">
                            {formatCurrency(editBatchCost.totalCost)}
                          </span>
                        </div>
                        {editBatchCost.costPerUnit > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">Cost per {editForm.watch('yieldUnit') || 'unit'}:</span>
                            <span className="font-mono text-slate-900">
                              {formatCurrency(editBatchCost.costPerUnit)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          label="Batch Yield"
                          htmlFor="edit-yield"
                          required
                          error={editForm.formState.errors.yield?.message}
                        >
                          <Input
                            id="edit-yield"
                            type="number"
                            min="0"
                            step="0.01"
                            {...editForm.register('yield', { valueAsNumber: true })}
                          />
                        </FormField>

                        <FormField
                          label="Yield Unit"
                          htmlFor="edit-yield-unit"
                          required
                          error={editForm.formState.errors.yieldUnit?.message}
                        >
                          <Select id="edit-yield-unit" {...editForm.register('yieldUnit')}>
                            <option value="">Select yield unit</option>
                            {ALLOWED_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {formatUnitOption(unit)}
                              </option>
                            ))}
                          </Select>
                        </FormField>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Recipe Ingredients</label>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddRecipeIngredient(editRecipeIngredients)}
                            disabled={editRecipeIngredients.fields.length >= availableForBatch.length}
                          >
                            Add Ingredient
                          </Button>
                        </div>

                        {editRecipeIngredients.fields.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ingredient</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Unit Cost</TableHead>
                                <TableHead className="text-right">Line Total</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {renderRecipeRows(editRecipeIngredients, editForm, availableForBatch)}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </>
                  )}

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
