import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import type { Ingredient, RecipeCostSummary } from '@domain/costing';
import { calculateFoodCostPercentage, calculateRecipeCostWithPercentage } from '@domain/costing';

import { FormField } from '../../components/forms/FormField';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeadResizable,
  TableRow,
} from '../../components/ui/table';
import { useIngredients } from '../../hooks/use-ingredients';
import {
  useDeleteMenuItem,
  useMenuItemWithRecipes,
  useMenuItems,
  useUpsertMenuItem,
} from '../../hooks/use-menu-items';
import { useResizableColumns } from '../../hooks/use-resizable-columns';
import { useBusiness } from '../../providers/business-provider';
import { getMenuItemWithRecipes } from '../../services/firestore';

const recipeSchema = z.object({
  ingredientId: z.string().min(1, 'Choose an ingredient'),
  quantity: z
    .number({ invalid_type_error: 'Enter a quantity' })
    .positive('Quantity must be greater than zero')
    .refine((val) => {
      const decimalPlaces = (val.toString().split('.')[1] || '').length;
      return decimalPlaces <= 2;
    }, 'Quantity cannot have more than 2 decimal places'),
  unitOfMeasure: z.string().min(1, 'Unit is required'),
});

const menuItemSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  isActive: z.boolean().optional(),
  sellingPrice: z
    .number({ invalid_type_error: 'Enter a valid price' })
    .nonnegative('Price cannot be negative')
    .optional(),
  recipes: z.array(recipeSchema).min(1, 'Add at least one ingredient'),
});

type MenuItemFormValues = z.infer<typeof menuItemSchema>;

const recipesEqual = (left: MenuItemFormValues['recipes'], right: MenuItemFormValues['recipes']) =>
  left.length === right.length &&
  left.every((recipe, index) => {
    const other = right[index];
    if (!other) {
      return false;
    }
    return (
      recipe.ingredientId === other.ingredientId &&
      recipe.quantity === other.quantity &&
      recipe.unitOfMeasure === other.unitOfMeasure
    );
  });

const formatIngredientList = (ingredients: string[]) =>
  ingredients.length ? ingredients.join(', ') : 'No recipe yet';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

const buildDefaultRecipe = (ingredient?: Ingredient) => ({
  ingredientId: ingredient?.id ?? '',
  quantity: 1,
  unitOfMeasure: ingredient?.recipeUnit ?? ingredient?.inventoryUnit ?? 'unit',
});


const foodCostPercentageClass = (percentage: number) => {
  if (percentage <= 0) {
    return 'text-slate-500';
  }
  if (percentage <= 30) {
    return 'text-green-700';
  }
  if (percentage <= 35) {
    return 'text-yellow-700';
  }
  return 'text-red-700';
};

export const MenuItemsPage = () => {
  const { businessId } = useBusiness();
  const {
    data: menuItems = [],
    isLoading: menuItemsLoading,
    isError: menuItemsError,
    error: menuItemsErrorObject,
  } = useMenuItems();
  const {
    data: ingredients = [],
    isLoading: ingredientsLoading,
    isError: ingredientsError,
    error: ingredientsErrorObject,
  } = useIngredients();
  const upsertMenuItemMutation = useUpsertMenuItem();
  const deleteMenuItemMutation = useDeleteMenuItem();
  const { columnWidths, isLocked, handleResize, handleResizeEnd, toggleLock, resetWidths } = useResizableColumns();

  const [formMessage, setFormMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const editingMenuItem = useMenuItemWithRecipes(editingMenuItemId ?? undefined);

  const activeIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.isActive),
    [ingredients],
  );

  const ingredientNameById = useMemo(() => {
    return new Map(ingredients.map((ingredient) => [ingredient.id, ingredient.name]));
  }, [ingredients]);

  const [catalogCostSummaries, setCatalogCostSummaries] =
    useState<Record<string, RecipeCostSummary>>({});

  // Memoize ingredient cost-relevant fields to trigger recalculation only when costs change
  // This ensures batch ingredient costs update when nested ingredient prices change
  const ingredientCostSignature = useMemo(() => {
    return JSON.stringify(
      ingredients.map((ing) => ({
        id: ing.id,
        unitCost: ing.unitCost,
        isBatch: ing.isBatch,
        yield: ing.yield,
        yieldUnit: ing.yieldUnit,
        recipeIngredients: ing.recipeIngredients?.map((ri) => ({
          ingredientId: ri.ingredientId,
          quantity: ri.quantity,
          unitOfMeasure: ri.unitOfMeasure,
        })),
      })),
    );
  }, [ingredients]);

  useEffect(() => {
    if (!menuItems.length) {
      setCatalogCostSummaries((current) => (Object.keys(current).length ? {} : current));
      return;
    }

    if (!ingredients.length) {
      return;
    }

    let cancelled = false;

    const loadSummaries = async () => {
      if (!businessId) {
        return;
      }
      try {
        const results = await Promise.all(
          menuItems.map(async (item) => {
            const detail = await getMenuItemWithRecipes(businessId, item.id);
            if (!detail) {
              return null;
            }
            const summary = calculateRecipeCostWithPercentage(
              detail.recipes,
              ingredients,
              detail.item.sellingPrice,
            );
            return [detail.item.id, summary] as const;
          }),
        );

        if (cancelled) {
          return;
        }

        setCatalogCostSummaries((current) => {
          const next: Record<string, RecipeCostSummary> = {};
          results.forEach((entry) => {
            if (!entry) {
              return;
            }
            const [id, summary] = entry;
            next[id] = summary;
          });

          const currentKeys = Object.keys(current);
          const nextKeys = Object.keys(next);
          const isSame =
            currentKeys.length === nextKeys.length &&
            currentKeys.every((key) => {
              const currentSummary = current[key];
              const nextSummary = next[key];
              return (
                nextSummary &&
                currentSummary.totalRecipeCost === nextSummary.totalRecipeCost &&
                currentSummary.foodCostPercentage === nextSummary.foodCostPercentage
              );
            });

          return isSame ? current : next;
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load menu item recipe summaries', error);
        }
      }
    };

    void loadSummaries();

    return () => {
      cancelled = true;
    };
  }, [businessId, ingredientCostSignature, menuItems]);

  const createForm = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      isActive: true,
      sellingPrice: undefined,
      recipes: [],
    },
  });
  const createRecipes = useFieldArray({ control: createForm.control, name: 'recipes' });

  const editForm = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      isActive: true,
      sellingPrice: undefined,
      recipes: [],
    },
  });
  const editRecipes = useFieldArray({ control: editForm.control, name: 'recipes' });

  // Watch all form values for live recalculation
  const createRecipesData = createForm.watch('recipes');
  const createSellingPrice = createForm.watch('sellingPrice');

  // Calculate recipe cost using domain logic
  const createRecipeCostSummary = useMemo(() => {
    if (!createRecipesData || !createRecipesData.length) {
      return { totalRecipeCost: 0, foodCostPercentage: 0, ingredients: [] };
    }

    // Ensure all recipe items have required fields including `id`
    const validRecipes = createRecipesData.filter(
      (r) => r.ingredientId && r.quantity > 0 && r.unitOfMeasure
    ).map((r, index) => ({
      id: String(index + 1), // Generate id for calculation
      ingredientId: r.ingredientId,
      quantity: r.quantity,
      unitOfMeasure: r.unitOfMeasure
    }));

    return calculateRecipeCostWithPercentage(
      validRecipes,
      ingredients,
      createSellingPrice
    );
  }, [createRecipesData, ingredients, createSellingPrice]);

  // Watch all edit form values for live recalculation
  const editRecipesData = editForm.watch('recipes');
  const editSellingPrice = editForm.watch('sellingPrice');

  // Calculate edit recipe cost using domain logic
  const editRecipeCostSummary = useMemo(() => {
    if (!editRecipesData || !editRecipesData.length) {
      return { totalRecipeCost: 0, foodCostPercentage: 0, ingredients: [] };
    }

    // Ensure all recipe items have required fields including `id`
    const validRecipes = editRecipesData.filter(
      (r) => r.ingredientId && r.quantity > 0 && r.unitOfMeasure
    ).map((r, index) => ({
      id: String(index + 1), // Generate id for calculation
      ingredientId: r.ingredientId,
      quantity: r.quantity,
      unitOfMeasure: r.unitOfMeasure
    }));

    return calculateRecipeCostWithPercentage(
      validRecipes,
      ingredients,
      editSellingPrice
    );
  }, [editRecipesData, ingredients, editSellingPrice]);

  useEffect(() => {
    if (activeIngredients.length && !createForm.getValues('recipes').length) {
      createForm.reset({
        name: '',
        isActive: true,
        sellingPrice: undefined,
        recipes: [buildDefaultRecipe(activeIngredients[0])],
      });
    }
  }, [activeIngredients, createForm]);

  const { reset: resetEditForm, getValues: getEditFormValues } = editForm;
  const { replace: replaceEditRecipes } = editRecipes;
  const { isDirty: editFormIsDirty } = editForm.formState;
  const lastSyncedMenuItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editingMenuItemId) {
      resetEditForm({ name: '', isActive: true, sellingPrice: undefined, recipes: [] });
      replaceEditRecipes([]);
      lastSyncedMenuItemIdRef.current = null;
      return;
    }

    if (!editingMenuItem.data) {
      return;
    }

    const isNewSelection = lastSyncedMenuItemIdRef.current !== editingMenuItemId;

    if (!isNewSelection && editFormIsDirty) {
      return;
    }

    const desiredRecipes = editingMenuItem.data.recipes.length
      ? editingMenuItem.data.recipes.map((recipe) => ({
          ingredientId: recipe.ingredientId,
          quantity: recipe.quantity,
          unitOfMeasure: recipe.unitOfMeasure,
        }))
      : activeIngredients.length
        ? [buildDefaultRecipe(activeIngredients[0])]
        : [];

    const currentValues = getEditFormValues();
    const normalizedSellingPrice = Number.isFinite(currentValues.sellingPrice)
      ? currentValues.sellingPrice
      : undefined;

    const shouldSync =
      currentValues.name !== editingMenuItem.data.item.name ||
      (currentValues.isActive ?? true) !== (editingMenuItem.data.item.isActive ?? true) ||
      (normalizedSellingPrice ?? undefined) !==
        (editingMenuItem.data.item.sellingPrice ?? undefined) ||
      !recipesEqual(currentValues.recipes, desiredRecipes);

    if (!shouldSync) {
      return;
    }

    resetEditForm({
      name: editingMenuItem.data.item.name,
      isActive: editingMenuItem.data.item.isActive,
      sellingPrice: editingMenuItem.data.item.sellingPrice,
      recipes: desiredRecipes,
    });
    replaceEditRecipes(desiredRecipes);
    lastSyncedMenuItemIdRef.current = editingMenuItemId;
  }, [
    activeIngredients,
    editingMenuItem.data,
    editingMenuItemId,
    getEditFormValues,
    editFormIsDirty,
    replaceEditRecipes,
    resetEditForm,
  ]);

  const handleCreate = createForm.handleSubmit(async (values) => {
    setFormMessage(null);
    try {
      await upsertMenuItemMutation.mutateAsync({
        item: {
          name: values.name,
          isActive: values.isActive ?? true,
          sellingPrice: values.sellingPrice,
        },
        recipes: values.recipes,
      });
      setFormMessage({ type: 'success', message: 'Menu item created' });
      setIsCreating(false);
      const defaultRecipe = activeIngredients[0] ? [buildDefaultRecipe(activeIngredients[0])] : [];
      createForm.reset({
        name: '',
        isActive: true,
        sellingPrice: undefined,
        recipes: defaultRecipe,
      });
      createRecipes.replace(defaultRecipe);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create menu item.';
      setFormMessage({ type: 'error', message });
    }
  });

  const handleUpdate = editForm.handleSubmit(async (values) => {
    if (!editingMenuItemId) {
      return;
    }
    setFormMessage(null);
    try {
      await upsertMenuItemMutation.mutateAsync({
        item: {
          id: editingMenuItemId,
          name: values.name,
          isActive: values.isActive ?? true,
          sellingPrice: values.sellingPrice,
        },
        recipes: values.recipes,
      });
      setFormMessage({ type: 'success', message: 'Menu item updated' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update menu item.';
      setFormMessage({ type: 'error', message });
    }
  });

  const handleDelete = async (menuItemId: string) => {
    setFormMessage(null);
    try {
      await deleteMenuItemMutation.mutateAsync(menuItemId);
      if (editingMenuItemId === menuItemId) {
        setEditingMenuItemId(null);
      }
      setFormMessage({ type: 'success', message: 'Menu item deleted' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete menu item.';
      setFormMessage({ type: 'error', message });
    }
  };

  // Effect to auto-update unit when ingredient changes for create form
  useEffect(() => {
    const subscription = createForm.watch((value, { name }) => {
      if (name && name.includes('ingredientId')) {
        const match = name.match(/recipes\.(\d+)\.ingredientId/);
        if (match) {
          const index = parseInt(match[1], 10);
          const ingredientId = value.recipes?.[index]?.ingredientId;
          const ingredient = ingredients.find(ing => ing.id === ingredientId);

          if (ingredient) {
            const unitToUse = ingredient.recipeUnit ?? ingredient.inventoryUnit;
            createForm.setValue(`recipes.${index}.unitOfMeasure`, unitToUse);
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [createForm, ingredients]);

  // Effect to auto-update unit when ingredient changes for edit form
  useEffect(() => {
    const subscription = editForm.watch((value, { name }) => {
      if (name && name.includes('ingredientId')) {
        const match = name.match(/recipes\.(\d+)\.ingredientId/);
        if (match) {
          const index = parseInt(match[1], 10);
          const ingredientId = value.recipes?.[index]?.ingredientId;
          const ingredient = ingredients.find(ing => ing.id === ingredientId);

          if (ingredient) {
            const unitToUse = ingredient.recipeUnit ?? ingredient.inventoryUnit;
            editForm.setValue(`recipes.${index}.unitOfMeasure`, unitToUse);
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [editForm, ingredients]);

  const handleAddRecipeRow = (target: 'create' | 'edit') => {
    const form = target === 'create' ? createForm : editForm;
    const array = target === 'create' ? createRecipes : editRecipes;
    const usedIngredientIds = new Set(
      form.getValues('recipes').map((recipe) => recipe.ingredientId),
    );
    const nextIngredient = activeIngredients.find(
      (ingredient) => !usedIngredientIds.has(ingredient.id),
    );
    if (!nextIngredient) {
      return;
    }
    array.append(buildDefaultRecipe(nextIngredient));
  };

  // Recipe table row renderer with colgroup-based column widths
  // Column widths are defined in <colgroup> elements for consistent alignment
  const renderRecipeRows = (
    array: typeof createRecipes,
    form: typeof createForm,
    ingredientsList: Ingredient[],
  ) => {
    const errors = form.formState.errors.recipes ?? [];
    return array.fields.map((field, index) => {
      const error = errors[index];
      return (
        <TableRow key={field.id ?? index}>
          {/* Ingredient column - auto width from colgroup */}
          <TableCell className="font-medium align-middle">
            <Select className="w-full text-sm" {...form.register(`recipes.${index}.ingredientId` as const)}>
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
          {/* Qty column - 90px from colgroup */}
          <TableCell className="align-middle px-2">
            <Input
              type="number"
              step={(() => {
                const unitOfMeasure = form.watch(`recipes.${index}.unitOfMeasure`);
                return unitOfMeasure?.toLowerCase() === 'each' ? '1' : '0.25';
              })()}
              min={0}
              className="w-full text-center text-sm px-2"
              {...form.register(`recipes.${index}.quantity`, { valueAsNumber: true })}
            />
            {error?.quantity?.message ? (
              <p className="text-destructive text-xs mt-1 text-center">{error.quantity.message}</p>
            ) : null}
          </TableCell>
          {/* Unit column - 100px from colgroup */}
          <TableCell className="align-middle px-2">
            <Input
              className="w-full text-center text-sm bg-slate-50 cursor-not-allowed px-2"
              readOnly
              {...form.register(`recipes.${index}.unitOfMeasure` as const)}
            />
            {error?.unitOfMeasure?.message ? (
              <p className="text-destructive text-xs mt-1 text-center">{error.unitOfMeasure.message}</p>
            ) : null}
          </TableCell>
          {/* Total column - 100px from colgroup */}
          <TableCell className="text-right font-medium align-middle">
            {(() => {
              const ingredientId = form.watch(`recipes.${index}.ingredientId`);
              const ingredient = ingredientsList.find((ing) => ing.id === ingredientId);
              const quantity = form.watch(`recipes.${index}.quantity`) || 0;
              const recipeUnit = form.watch(`recipes.${index}.unitOfMeasure`);

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
          {/* Remove column - 120px from colgroup */}
          <TableCell className="whitespace-nowrap text-right align-middle">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => array.remove(index)}
              disabled={array.fields.length === 1}
              className="text-xs px-2 py-1"
            >
              Remove
            </Button>
          </TableCell>
        </TableRow>
      );
    });
  };

  const loading = menuItemsLoading || ingredientsLoading;
  const combinedError = menuItemsError || ingredientsError;
  const errorMessage =
    menuItemsErrorObject instanceof Error
      ? menuItemsErrorObject.message
      : ingredientsErrorObject instanceof Error
        ? ingredientsErrorObject.message
        : 'Failed to load menu items.';

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-slate-900">Menu items & recipes</h1>
        <p className="text-sm text-slate-500">
          Keep menu items in sync with ingredient recipes. Costs roll up automatically in the review
          step.
        </p>
      </header>

      {combinedError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {errorMessage}
        </div>
      ) : null}
      {formMessage ? (
        <div
          className={
            formMessage.type === 'success'
              ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'
              : 'border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm'
          }
        >
          {formMessage.message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-1 lg:items-start">
        <Card className="w-full">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Menu catalog</CardTitle>
                <CardDescription>
                  Deactivate items to hide them from costing and reporting.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setIsCreating(true);
                  setEditingMenuItemId(null);
                }}
              >
                Create New Menu Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Loading menu items...
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                <Table className="w-full text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-auto min-w-[100px] sm:min-w-[120px]">Name</TableHead>
                      <TableHead className="w-16 sm:w-24">Status</TableHead>
                      <TableHead className="hidden lg:table-cell max-w-[200px] whitespace-normal">Recipe</TableHead>
                      <TableHead className="hidden md:table-cell w-20 sm:w-24 text-right">Recipe Total</TableHead>
                      <TableHead className="hidden sm:table-cell w-20 sm:w-24 text-right">Selling Price</TableHead>
                      <TableHead className="w-16 sm:w-20 text-right">Food Cost %</TableHead>
                      <TableHead className="w-24 sm:w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item) => {
                      const recipeSummary = catalogCostSummaries[item.id];
                      const foodCostDisplay =
                        recipeSummary && recipeSummary.foodCostPercentage > 0
                          ? formatPercentage(recipeSummary.foodCostPercentage)
                          : '—';
                      const foodCostTextClass =
                        recipeSummary && recipeSummary.foodCostPercentage > 0
                          ? foodCostPercentageClass(recipeSummary.foodCostPercentage)
                          : 'text-slate-500';

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-slate-800">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant={item.isActive ? 'success' : 'warning'} className="text-[10px] sm:text-xs">
                              {item.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs sm:text-sm text-slate-500 max-w-[200px] whitespace-normal break-words">
                            {editingMenuItemId === item.id && editingMenuItem.data
                              ? formatIngredientList(
                                  editingMenuItem.data.recipes.map((recipe) =>
                                    ingredientNameById.get(recipe.ingredientId) ??
                                    recipe.ingredientId,
                                  ),
                                )
                              : 'Select to view recipe'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right font-mono text-xs sm:text-sm text-slate-600">
                            {recipeSummary ? formatCurrency(recipeSummary.totalRecipeCost) : '—'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right font-mono text-xs sm:text-sm text-slate-600">
                            {typeof item.sellingPrice === 'number'
                              ? formatCurrency(item.sellingPrice)
                              : '—'}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-xs sm:text-sm ${foodCostTextClass}`}>
                            {foodCostDisplay}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                              <Button
                                size="sm"
                                variant={editingMenuItemId === item.id ? 'secondary' : 'ghost'}
                                onClick={(e) => {
                                  e.currentTarget.blur();
                                  setEditingMenuItemId(item.id);
                                  setIsCreating(false);
                                }}
                                className="text-xs whitespace-nowrap"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(item.id)}
                                disabled={deleteMenuItemMutation.isPending}
                                className="text-xs whitespace-nowrap"
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-sm text-slate-500">
            Recipes are versioned implicitly via ingredient history; finalize to snapshot costs.
          </CardFooter>
        </Card>

        <Dialog open={isCreating} onOpenChange={(open) => !open && setIsCreating(false)}>
          <DialogContent
            className="max-h-[85vh] w-[90vw] m-4 max-w-none rounded-lg lg:max-h-[90vh] lg:max-w-4xl flex flex-col gap-0"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              setTimeout(() => {
                const firstInput = document.getElementById('menu-name');
                if (firstInput) {
                  firstInput.focus();
                }
              }, 0);
            }}
          >
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-200 bg-white z-10">
              <DialogTitle>Create menu item</DialogTitle>
              <DialogDescription>Define an item and its ingredient recipe.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              <form className="space-y-4" onSubmit={handleCreate} noValidate id="create-menu-item-form">
                <FormField
                  label="Name"
                  htmlFor="menu-name"
                  required
                  error={createForm.formState.errors.name?.message}
                >
                  <Input id="menu-name" {...createForm.register('name')} />
                </FormField>

                <FormField
                  label="Selling Price"
                  htmlFor="menu-selling-price"
                  error={createForm.formState.errors.sellingPrice?.message}
                >
                  <Input
                    id="menu-selling-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...createForm.register('sellingPrice', { valueAsNumber: true })}
                  />
                  {createRecipeCostSummary.totalRecipeCost > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Suggested for 30% food cost: {formatCurrency(createRecipeCostSummary.totalRecipeCost / 0.30)}
                    </p>
                  )}
                </FormField>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Recipe Cost:</span>
                    <span className="font-mono text-slate-900">
                      {formatCurrency(createRecipeCostSummary.totalRecipeCost)}
                    </span>
                  </div>
                  {createRecipeCostSummary.foodCostPercentage > 0 && (
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">Food Cost %:</span>
                      <span
                        className={`font-mono ${foodCostPercentageClass(
                          createRecipeCostSummary.foodCostPercentage,
                        )}`}
                      >
                        {formatPercentage(createRecipeCostSummary.foodCostPercentage)}
                      </span>
                    </div>
                  )}
                  {createRecipeCostSummary.conversionWarnings && createRecipeCostSummary.conversionWarnings.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <div className="font-medium text-yellow-800 mb-1">⚠️ Unit Conversion Warnings:</div>
                      <ul className="text-yellow-700 space-y-0.5">
                        {createRecipeCostSummary.conversionWarnings.map((warning, idx) => (
                          <li key={idx}>
                            <strong>{warning.ingredientName}:</strong> {warning.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto -mx-6 px-6">
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
                        <TableHead>Ingredient</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {renderRecipeRows(createRecipes, createForm, activeIngredients)}
                      <TableRow className="border-t-2 bg-slate-50">
                        <TableCell colSpan={3} className="text-right font-medium text-slate-900 text-sm">
                          Recipe Total:
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(createRecipeCostSummary.totalRecipeCost)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {createForm.formState.errors.recipes?.root?.message ? (
                  <p className="text-destructive text-xs">
                    {createForm.formState.errors.recipes.root.message}
                  </p>
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleAddRecipeRow('create')}
                  disabled={createRecipes.fields.length >= activeIngredients.length}
                >
                  Add ingredient
                </Button>
              </form>
            </div>
            <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-slate-200 bg-white z-10 flex-row justify-between sm:justify-between gap-4">
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
                form="create-menu-item-form"
                size="sm"
                disabled={
                  upsertMenuItemMutation.isPending ||
                  createForm.formState.isSubmitting ||
                  !activeIngredients.length
                }
              >
                {upsertMenuItemMutation.isPending ? 'Saving...' : 'Save menu item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingMenuItemId} onOpenChange={(open) => !open && setEditingMenuItemId(null)}>
            <DialogContent
              className="max-h-[85vh] w-[90vw] m-4 max-w-none rounded-lg lg:max-h-[90vh] lg:max-w-4xl flex flex-col gap-0"
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                // Allow the dialog to open, then focus the first input
                setTimeout(() => {
                  const firstInput = document.getElementById('edit-menu-name');
                  if (firstInput) {
                    firstInput.focus();
                  }
                }, 0);
              }}
            >
              <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-200 bg-white z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle>
                      {editingMenuItem.data?.item.name ? `Edit ${editingMenuItem.data.item.name}` : 'Edit menu item'}
                    </DialogTitle>
                    <DialogDescription>Adjust the recipe or toggle active state.</DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleLock}
                      className="text-xs whitespace-nowrap"
                    >
                      {isLocked ? (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Locked
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                          Unlocked
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetWidths}
                      className="text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                <form className="space-y-4" onSubmit={handleUpdate} noValidate id="edit-menu-item-form">
                  <FormField
                    label="Name"
                    htmlFor="edit-menu-name"
                    required
                    error={editForm.formState.errors.name?.message}
                  >
                    <Input id="edit-menu-name" {...editForm.register('name')} />
                  </FormField>

                  <FormField
                    label="Selling Price"
                    htmlFor="edit-menu-selling-price"
                    error={editForm.formState.errors.sellingPrice?.message}
                  >
                    <Input
                      id="edit-menu-selling-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...editForm.register('sellingPrice', { valueAsNumber: true })}
                    />
                    {editRecipeCostSummary.totalRecipeCost > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Suggested for 30% food cost: {formatCurrency(editRecipeCostSummary.totalRecipeCost / 0.30)}
                      </p>
                    )}
                  </FormField>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">Recipe Cost:</span>
                      <span className="font-mono text-slate-900">
                        {formatCurrency(editRecipeCostSummary.totalRecipeCost)}
                      </span>
                    </div>
                    {editRecipeCostSummary.foodCostPercentage > 0 && (
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">Food Cost %:</span>
                        <span
                          className={`font-mono ${foodCostPercentageClass(
                            editRecipeCostSummary.foodCostPercentage,
                          )}`}
                        >
                          {formatPercentage(editRecipeCostSummary.foodCostPercentage)}
                        </span>
                      </div>
                    )}
                    {editRecipeCostSummary.conversionWarnings && editRecipeCostSummary.conversionWarnings.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <div className="font-medium text-yellow-800 mb-1">⚠️ Unit Conversion Warnings:</div>
                        <ul className="text-yellow-700 space-y-0.5">
                          {editRecipeCostSummary.conversionWarnings.map((warning, idx) => (
                            <li key={idx}>
                              <strong>{warning.ingredientName}:</strong> {warning.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                <div className="overflow-x-auto -mx-6 px-6">
                  <Table className="w-full text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHeadResizable
                          width={columnWidths.ingredient || 150}
                          onResize={(newWidth) => handleResize('ingredient', newWidth)}
                          onResizeEnd={handleResizeEnd}
                          isLocked={isLocked}
                        >
                          Ingredient
                        </TableHeadResizable>
                        <TableHeadResizable
                          className="text-center"
                          width={columnWidths.qty}
                          onResize={(newWidth) => handleResize('qty', newWidth)}
                          onResizeEnd={handleResizeEnd}
                          isLocked={isLocked}
                        >
                          Qty
                        </TableHeadResizable>
                        <TableHeadResizable
                          className="text-center"
                          width={columnWidths.unit}
                          onResize={(newWidth) => handleResize('unit', newWidth)}
                          onResizeEnd={handleResizeEnd}
                          isLocked={isLocked}
                        >
                          Unit
                        </TableHeadResizable>
                        <TableHeadResizable
                          className="text-right"
                          width={columnWidths.total}
                          onResize={(newWidth) => handleResize('total', newWidth)}
                          onResizeEnd={handleResizeEnd}
                          isLocked={isLocked}
                        >
                          Total
                        </TableHeadResizable>
                        <TableHead className="text-right" style={{ width: '120px' }}></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderRecipeRows(editRecipes, editForm, activeIngredients)}
                        <TableRow className="border-t-2 bg-slate-50">
                          <TableCell colSpan={3} className="text-right font-medium text-slate-900 text-sm">
                            Recipe Total:
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(editRecipeCostSummary.totalRecipeCost)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {editForm.formState.errors.recipes?.root?.message ? (
                    <p className="text-destructive text-xs">
                      {editForm.formState.errors.recipes.root.message}
                    </p>
                  ) : null}

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleAddRecipeRow('edit')}
                    disabled={editRecipes.fields.length >= activeIngredients.length}
                  >
                    Add ingredient
                  </Button>
                </form>
              </div>
              <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-slate-200 bg-white z-10 flex-row justify-between sm:justify-between gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingMenuItemId(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-menu-item-form"
                  size="sm"
                  disabled={editForm.formState.isSubmitting || upsertMenuItemMutation.isPending}
                >
                  {upsertMenuItemMutation.isPending ? 'Saving...' : 'Update'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
    </div>
  );
};
