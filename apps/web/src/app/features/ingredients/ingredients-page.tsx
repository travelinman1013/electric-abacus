import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';

import type { Ingredient, IngredientCategory } from '@domain/costing';
import { getConversionFactor, ALLOWED_UNITS, UNIT_LABELS, getCompatibleUnits, type AllowedUnit } from '@domain/units';
import { calculateRecipeCost } from '@domain/costing';

import { FormField } from '../../components/forms/FormField';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { useTerminology } from '../../hooks/use-terminology';
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { NativeSelect as Select } from '../../components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';
import {
  useCreateIngredient,
  useDeleteIngredient,
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
  const { terms } = useTerminology();
  const {
    data: ingredients = [],
    isLoading,
    isError,
    error: ingredientsError
  } = useIngredients();
  const createIngredientMutation = useCreateIngredient();
  const updateIngredientMutation = useUpdateIngredient();
  const setActiveMutation = useSetIngredientActive();
  const deleteIngredientMutation = useDeleteIngredient();

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingIngredientId, setDeletingIngredientId] = useState<string | null>(null);

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
          {/* Ingredient column - auto width from colgroup */}
          <TableCell className="font-medium align-middle">
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
          {/* Quantity column - 90px from colgroup */}
          <TableCell className="align-middle px-2">
            <Input
              type="number"
              step="0.25"
              min={0}
              className="w-full text-center text-sm px-2"
              {...form.register(`recipeIngredients.${index}.quantity`, { valueAsNumber: true })}
            />
            {error?.quantity?.message ? (
              <p className="text-destructive text-xs mt-1 text-center">{error.quantity.message}</p>
            ) : null}
          </TableCell>
          {/* Unit column - 100px from colgroup */}
          <TableCell className="align-middle px-2">
            <Input
              className="w-full text-center text-sm bg-muted cursor-not-allowed px-2"
              readOnly
              {...form.register(`recipeIngredients.${index}.unitOfMeasure` as const)}
            />
            {error?.unitOfMeasure?.message ? (
              <p className="text-destructive text-xs mt-1 text-center">{error.unitOfMeasure.message}</p>
            ) : null}
          </TableCell>
          {/* Line Cost column - 100px from colgroup */}
          <TableCell className="text-right font-medium align-middle">
            {(() => {
              const ingredientId = form.watch(`recipeIngredients.${index}.ingredientId`);
              const ingredient = ingredientsList.find((ing) => ing.id === ingredientId);
              const quantity = form.watch(`recipeIngredients.${index}.quantity`) || 0;
              const recipeUnit = form.watch(`recipeIngredients.${index}.unitOfMeasure`);

              if (ingredient && quantity > 0 && recipeUnit) {
                // Use domain calculateRecipeCost for accurate calculation including batch ingredients
                const singleRecipe = [{
                  id: '1',
                  ingredientId,
                  quantity,
                  unitOfMeasure: recipeUnit
                }];
                const costSummary = calculateRecipeCost(singleRecipe, ingredientsList);
                return formatCurrency(costSummary.totalRecipeCost);
              }
              return '—';
            })()}
          </TableCell>
          {/* Remove column - 120px from colgroup */}
          <TableCell className="whitespace-nowrap text-right align-middle">
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

  const handleDeleteClick = (ingredientId: string) => {
    setDeletingIngredientId(ingredientId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingIngredientId) return;

    setFormError(null);
    setFormSuccess(null);
    try {
      await deleteIngredientMutation.mutateAsync(deletingIngredientId);
      if (editingIngredientId === deletingIngredientId) {
        setEditingIngredientId(null);
      }
      setDeletingIngredientId(null);
      setFormSuccess('Ingredient deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete ingredient.';
      setFormError(message);
      setDeletingIngredientId(null);
    }
  };

  const getDeletingIngredientUsage = () => {
    if (!deletingIngredientId) return { usedInMenuItems: [], usedInBatchIngredients: [] };

    const usedInMenuItems: string[] = [];
    const usedInBatchIngredients: string[] = [];

    // Check if ingredient is used in any batch ingredients
    ingredients.forEach(ingredient => {
      if (ingredient.isBatch && ingredient.recipeIngredients) {
        const usesIngredient = ingredient.recipeIngredients.some(
          ri => ri.ingredientId === deletingIngredientId
        );
        if (usesIngredient) {
          usedInBatchIngredients.push(ingredient.name);
        }
      }
    });

    // Note: We can't check menu items here without fetching all their recipes
    // For simplicity, we'll just warn about batch ingredients for now

    return { usedInMenuItems, usedInBatchIngredients };
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-foreground">{terms.ingredient} catalog</h1>
        <p className="text-sm text-muted-foreground">
          Manage cost inputs that drive the weekly franchise fee report. {terms.ingredient} versions capture price
          changes over time.
        </p>
      </header>

      {isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ingredientsError instanceof Error ? ingredientsError.message : `Failed to load ${terms.ingredients.toLowerCase()}.`}
        </div>
      ) : null}

      <div className={cn('grid gap-6 lg:grid-cols-1 lg:items-start', {
        'xl:grid-cols-[2fr_1fr] 2xl:grid-cols-[3fr_2fr]': editingIngredientId || isCreating,
      })}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Current {terms.ingredients.toLowerCase()}</CardTitle>
                <CardDescription>Unit costs update automatically from case price and pack size.</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setIsCreating(true);
                  setEditingIngredientId(null);
                }}
              >
                Create {terms.ingredient}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-md border border-dashed border p-6 text-center text-sm text-muted-foreground bg-muted/50">
                Loading {terms.ingredients.toLowerCase()}...
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                <Table className="w-full text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-auto min-w-[100px] sm:min-w-[120px]">Name</TableHead>
                      <TableHead className="w-16 sm:w-24">Status</TableHead>
                      <TableHead className="w-16 sm:w-20">Unit</TableHead>
                      <TableHead className="hidden sm:table-cell w-20 sm:w-24 text-right">Units / case</TableHead>
                      <TableHead className="hidden md:table-cell w-20 sm:w-24 text-right">Case price</TableHead>
                      <TableHead className="w-20 sm:w-24 text-right">Unit cost</TableHead>
                      <TableHead className="w-24 sm:w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedIngredients.map((ingredient) => (
                      <TableRow key={ingredient.id}>
                        <TableCell className="font-medium text-foreground">{ingredient.name}</TableCell>
                        <TableCell>
                          <Badge variant={ingredient.isActive ? 'success' : 'warning'} className="text-[10px] sm:text-xs">
                            {ingredient.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">{ingredient.inventoryUnit}</TableCell>
                        <TableCell className="hidden sm:table-cell text-right font-mono text-xs sm:text-sm text-muted-foreground">{ingredient.unitsPerCase}</TableCell>
                        <TableCell className="hidden md:table-cell text-right font-mono text-xs sm:text-sm text-muted-foreground">{formatCurrency(ingredient.casePrice)}</TableCell>
                        <TableCell className="text-right font-mono text-xs sm:text-sm text-muted-foreground">{formatCurrency(ingredient.unitCost)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleToggleActive(ingredient)}
                              disabled={setActiveMutation.isPending}
                              className="text-xs whitespace-nowrap"
                            >
                              {ingredient.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setEditingIngredientId(ingredient.id)}
                              variant={editingIngredientId === ingredient.id ? 'secondary' : 'ghost'}
                              className="text-xs whitespace-nowrap"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteClick(ingredient.id)}
                              disabled={deleteIngredientMutation.isPending}
                              className="text-xs whitespace-nowrap"
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            Updating {terms.ingredient.toLowerCase()} will spawn a new version record used for future {terms.weeks.toLowerCase()}.
          </CardFooter>
        </Card>

        <Dialog open={isCreating} onOpenChange={(open) => !open && setIsCreating(false)}>
          <DialogContent
            className="max-h-[85vh] w-[90vw] max-w-none rounded-lg lg:max-h-[90vh] lg:max-w-4xl flex flex-col gap-0"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              setTimeout(() => {
                const firstInput = document.getElementById('new-name');
                if (firstInput) {
                  firstInput.focus();
                }
              }, 0);
            }}
          >
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border bg-card z-10">
              <DialogTitle>Create {terms.ingredient.toLowerCase()}</DialogTitle>
              <DialogDescription>Add new cost inputs to the catalog.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              <form className="space-y-4" onSubmit={(e) => void handleCreate(e)} noValidate id="create-ingredient-form">
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

                {/* Hide conversion factor for batch ingredients */}
                {!createForm.watch('isBatch') && (
                  <FormField
                    label="Conversion Factor"
                    htmlFor="new-conversion-factor"
                    description="Automatically calculated when inventory and recipe units are compatible"
                  >
                    <div
                      id="new-conversion-factor"
                      className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground shadow-sm"
                    >
                      {formatConversionFactor(createForm.watch('inventoryUnit'), createForm.watch('recipeUnit') || '') || 'Enter recipe unit to see conversion'}
                    </div>
                  </FormField>
                )}

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
                    <div className="rounded-md border border bg-muted/50 p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-muted-foreground">Batch Cost:</span>
                        <span className="font-mono text-foreground">
                          {formatCurrency(createBatchCost.totalCost)}
                        </span>
                      </div>
                      {createBatchCost.costPerUnit > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-muted-foreground">Cost per {createForm.watch('yieldUnit') || 'unit'}:</span>
                          <span className="font-mono text-foreground">
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
                        <h4 className="text-sm font-medium text-foreground">{terms.recipe} {terms.ingredients}</h4>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddRecipeIngredient(createRecipeIngredients)}
                          disabled={availableForBatch.length === createRecipeIngredients.fields.length}
                        >
                          Add {terms.ingredient}
                        </Button>
                      </div>
                      <Table className="w-full text-xs">
                        <colgroup>
                          <col />
                          <col style={{ width: '90px' }} />
                          <col style={{ width: '100px' }} />
                          <col style={{ width: '100px' }} />
                          <col style={{ width: '120px' }} />
                        </colgroup>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{terms.ingredient}</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit</TableHead>
                            <TableHead className="text-right">Line Cost</TableHead>
                            <TableHead className="text-right"></TableHead>
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

              </form>
            </div>
            <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border bg-card z-10 flex-row justify-between sm:justify-between gap-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-ingredient-form"
                size="sm"
                disabled={createIngredientMutation.isPending || createForm.formState.isSubmitting}
              >
                {createIngredientMutation.isPending ? 'Creating...' : `Add ${terms.ingredient.toLowerCase()}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingIngredientId} onOpenChange={(open) => !open && setEditingIngredientId(null)}>
          <DialogContent
            className="max-h-[85vh] w-[90vw] max-w-none rounded-lg lg:max-h-[90vh] lg:max-w-4xl flex flex-col gap-0"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              setTimeout(() => {
                const firstInput = document.getElementById('edit-name');
                if (firstInput) {
                  firstInput.focus();
                }
              }, 0);
            }}
          >
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border bg-card z-10">
              <DialogTitle>Edit {terms.ingredient.toLowerCase()}</DialogTitle>
              <DialogDescription>
                Update pricing or pack sizes to spawn a new cost version.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4">
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

                <form className="space-y-4" onSubmit={(e) => void handleUpdate(e)} noValidate id="edit-ingredient-form">
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

                  {/* Hide conversion factor for batch ingredients */}
                  {!editForm.watch('isBatch') && (
                    <FormField
                      label="Conversion Factor"
                      htmlFor="edit-conversion-factor"
                      description="Automatically calculated when inventory and recipe units are compatible"
                    >
                      <div
                        id="edit-conversion-factor"
                        className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground shadow-sm"
                      >
                        {formatConversionFactor(editForm.watch('inventoryUnit'), editForm.watch('recipeUnit') || '') || 'Enter recipe unit to see conversion'}
                      </div>
                    </FormField>
                  )}

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
                      <div className="rounded-md border border bg-muted/50 p-3">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-medium text-muted-foreground">Batch Cost:</span>
                          <span className="font-mono text-foreground">
                            {formatCurrency(editBatchCost.totalCost)}
                          </span>
                        </div>
                        {editBatchCost.costPerUnit > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-muted-foreground">Cost per {editForm.watch('yieldUnit') || 'unit'}:</span>
                            <span className="font-mono text-foreground">
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

                      <div className="overflow-x-auto -mx-3 sm:-mx-6 px-3 sm:px-6">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-foreground">{terms.recipe} {terms.ingredients}</h4>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddRecipeIngredient(editRecipeIngredients)}
                            disabled={editRecipeIngredients.fields.length >= availableForBatch.length}
                          >
                            Add {terms.ingredient}
                          </Button>
                        </div>

                        {editRecipeIngredients.fields.length > 0 && (
                          <Table className="w-full text-xs">
                            <colgroup>
                              <col />
                              <col style={{ width: '90px' }} />
                              <col style={{ width: '100px' }} />
                              <col style={{ width: '100px' }} />
                              <col style={{ width: '120px' }} />
                            </colgroup>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{terms.ingredient}</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Unit</TableHead>
                                <TableHead className="text-right">Line Cost</TableHead>
                                <TableHead className="text-right"></TableHead>
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

                  <div className="text-xs text-muted-foreground">
                    Unit cost will update to{' '}
                    {formatCurrency(
                      toUnitCost(
                        editForm.watch('casePrice') ?? 0,
                        editForm.watch('unitsPerCase') ?? 1
                      )
                    )}
                    .
                  </div>
                </form>

                <div className="space-y-3 rounded-md border border bg-muted/50 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Version history</p>
                  {ingredientVersions.data?.length ? (
                    <ul className="space-y-1">
                      {ingredientVersions.data.map((version) => (
                        <li key={version.id} className="flex items-center justify-between">
                          <span>
                            {formatCurrency(version.unitCost)} • {version.unitsPerCase} {version.id}
                          </span>
                          <span className="text-muted-foreground/70">
                            {new Date(version.effectiveFrom).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No versions recorded yet.</p>
                  )}
                </div>
            </div>
            <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border bg-card z-10 flex-row justify-between sm:justify-between gap-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingIngredientId(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-ingredient-form"
                size="sm"
                disabled={
                  editForm.formState.isSubmitting || updateIngredientMutation.isPending || isLoading
                }
              >
                {updateIngredientMutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={Boolean(deletingIngredientId)} onOpenChange={(open) => !open && setDeletingIngredientId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {terms.ingredient}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {terms.ingredient.toLowerCase()}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const usage = getDeletingIngredientUsage();
            const hasUsage = usage.usedInBatchIngredients.length > 0;

            return hasUsage ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-semibold mb-1">Warning: This {terms.ingredient.toLowerCase()} is currently in use</p>
                {usage.usedInBatchIngredients.length > 0 && (
                  <div>
                    <p className="font-medium">Used in batch {terms.ingredients.toLowerCase()}:</p>
                    <ul className="list-disc list-inside ml-2">
                      {usage.usedInBatchIngredients.map(name => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-2">Deleting this {terms.ingredient.toLowerCase()} may cause issues with these {terms.recipes.toLowerCase()}.</p>
              </div>
            ) : null;
          })()}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteConfirm()}
              disabled={deleteIngredientMutation.isPending}
            >
              {deleteIngredientMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
