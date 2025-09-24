import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import type { Ingredient } from '@domain/costing';
import { calculateFoodCostPercentage } from '@domain/costing';

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
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useIngredients } from '../../hooks/use-ingredients';
import {
  useDeleteMenuItem,
  useMenuItemWithRecipes,
  useMenuItems,
  useUpsertMenuItem
} from '../../hooks/use-menu-items';

const recipeSchema = z.object({
  ingredientId: z.string().min(1, 'Choose an ingredient'),
  quantity: z
    .number({ invalid_type_error: 'Enter a quantity' })
    .positive('Quantity must be greater than zero'),
  unitOfMeasure: z.string().min(1, 'Unit is required')
});

const menuItemSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  isActive: z.boolean().optional(),
  sellingPrice: z
    .number({ invalid_type_error: 'Enter a valid price' })
    .nonnegative('Price cannot be negative')
    .optional(),
  recipes: z.array(recipeSchema).min(1, 'Add at least one ingredient')
});

type MenuItemFormValues = z.infer<typeof menuItemSchema>;

const formatIngredientList = (ingredients: string[]) =>
  ingredients.length ? ingredients.join(', ') : 'No recipe yet';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

const buildDefaultRecipe = (ingredient?: Ingredient) => ({
  ingredientId: ingredient?.id ?? '',
  quantity: 1,
  unitOfMeasure: ingredient?.unitOfMeasure ?? 'unit'
});

export const MenuItemsPage = () => {
  const {
    data: menuItems = [],
    isLoading: menuItemsLoading,
    isError: menuItemsError,
    error: menuItemsErrorObject
  } = useMenuItems();
  const {
    data: ingredients = [],
    isLoading: ingredientsLoading,
    isError: ingredientsError,
    error: ingredientsErrorObject
  } = useIngredients();
  const upsertMenuItemMutation = useUpsertMenuItem();
  const deleteMenuItemMutation = useDeleteMenuItem();

  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);

  const editingMenuItem = useMenuItemWithRecipes(editingMenuItemId);

  const activeIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.isActive),
    [ingredients]
  );

  const ingredientNameById = useMemo(() => {
    return new Map(ingredients.map((ingredient) => [ingredient.id, ingredient.name]));
  }, [ingredients]);


  const createForm = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      isActive: true,
      sellingPrice: undefined,
      recipes: []
    }
  });
  const createRecipes = useFieldArray({ control: createForm.control, name: 'recipes' });

  const editForm = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      isActive: true,
      sellingPrice: undefined,
      recipes: []
    }
  });
  const editRecipes = useFieldArray({ control: editForm.control, name: 'recipes' });

  const createSellingPrice = createForm.watch('sellingPrice');

  // Calculate recipe cost dynamically by watching individual recipe fields
  const calculateDynamicRecipeCost = (recipes: typeof createRecipes, form: typeof createForm) => {
    let totalRecipeCost = 0;

    recipes.fields.forEach((_, index) => {
      const ingredientId = form.watch(`recipes.${index}.ingredientId`);
      const quantity = form.watch(`recipes.${index}.quantity`) || 0;
      const ingredient = ingredients.find((ing) => ing.id === ingredientId);

      if (ingredient && quantity > 0) {
        totalRecipeCost += ingredient.unitCost * quantity;
      }
    });

    return {
      totalRecipeCost,
      foodCostPercentage: createSellingPrice
        ? calculateFoodCostPercentage(totalRecipeCost, createSellingPrice)
        : 0
    };
  };

  const createRecipeCostSummary = calculateDynamicRecipeCost(createRecipes, createForm);

  const editSellingPrice = editForm.watch('sellingPrice');

  // Calculate edit recipe cost dynamically by watching individual recipe fields
  const calculateDynamicEditRecipeCost = (recipes: typeof editRecipes, form: typeof editForm) => {
    let totalRecipeCost = 0;

    recipes.fields.forEach((_, index) => {
      const ingredientId = form.watch(`recipes.${index}.ingredientId`);
      const quantity = form.watch(`recipes.${index}.quantity`) || 0;
      const ingredient = ingredients.find((ing) => ing.id === ingredientId);

      if (ingredient && quantity > 0) {
        totalRecipeCost += ingredient.unitCost * quantity;
      }
    });

    return {
      totalRecipeCost,
      foodCostPercentage: editSellingPrice
        ? calculateFoodCostPercentage(totalRecipeCost, editSellingPrice)
        : 0
    };
  };

  const editRecipeCostSummary = calculateDynamicEditRecipeCost(editRecipes, editForm);

  useEffect(() => {
    if (activeIngredients.length && !createForm.getValues('recipes').length) {
      createForm.reset({
        name: '',
        isActive: true,
        sellingPrice: undefined,
        recipes: [buildDefaultRecipe(activeIngredients[0])]
      });
    }
  }, [activeIngredients, createForm]);

  useEffect(() => {
    if (editingMenuItem.data) {
      editForm.reset({
        name: editingMenuItem.data.item.name,
        isActive: editingMenuItem.data.item.isActive,
        sellingPrice: editingMenuItem.data.item.sellingPrice,
        recipes: editingMenuItem.data.recipes.map((recipe) => ({
          ingredientId: recipe.ingredientId,
          quantity: recipe.quantity,
          unitOfMeasure: recipe.unitOfMeasure
        }))
      });
      if (!editingMenuItem.data.recipes.length && activeIngredients.length) {
        editRecipes.replace([buildDefaultRecipe(activeIngredients[0])]);
      }
    } else if (!editingMenuItemId) {
      editForm.reset({ name: '', isActive: true, sellingPrice: undefined, recipes: [] });
      editRecipes.replace([]);
    }
  }, [editingMenuItem.data, editingMenuItemId, activeIngredients, editForm, editRecipes]);

  const handleCreate = createForm.handleSubmit(async (values) => {
    setFormMessage(null);
    try {
      await upsertMenuItemMutation.mutateAsync({
        item: {
          name: values.name,
          isActive: values.isActive ?? true,
          sellingPrice: values.sellingPrice
        },
        recipes: values.recipes
      });
      setFormMessage({ type: 'success', message: 'Menu item created' });
      const defaultRecipe = activeIngredients[0] ? [buildDefaultRecipe(activeIngredients[0])] : [];
      createForm.reset({ name: '', isActive: true, sellingPrice: undefined, recipes: defaultRecipe });
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
          sellingPrice: values.sellingPrice
        },
        recipes: values.recipes
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

  const handleAddRecipeRow = (target: 'create' | 'edit') => {
    const form = target === 'create' ? createForm : editForm;
    const array = target === 'create' ? createRecipes : editRecipes;
    const usedIngredientIds = new Set(form.getValues('recipes').map((recipe) => recipe.ingredientId));
    const nextIngredient = activeIngredients.find((ingredient) => !usedIngredientIds.has(ingredient.id));
    if (!nextIngredient) {
      return;
    }
    array.append(buildDefaultRecipe(nextIngredient));
  };

  const renderRecipeRows = (
    array: typeof createRecipes,
    form: typeof createForm,
    ingredientsList: Ingredient[]
  ) => {
    const errors = form.formState.errors.recipes ?? [];
    return array.fields.map((field, index) => {
      const error = errors[index];
      return (
        <TableRow key={field.id ?? index}>
          <TableCell>
            <Select
              {...form.register(`recipes.${index}.ingredientId` as const)}
            >
              <option value="">Select ingredient</option>
              {ingredientsList.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </Select>
            {error?.ingredientId?.message ? (
              <p className="text-xs text-destructive">{error.ingredientId.message}</p>
            ) : null}
          </TableCell>
          <TableCell>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register(`recipes.${index}.quantity` as const, { valueAsNumber: true })}
            />
            {error?.quantity?.message ? (
              <p className="text-xs text-destructive">{error.quantity.message}</p>
            ) : null}
          </TableCell>
          <TableCell>
            <Input {...form.register(`recipes.${index}.unitOfMeasure` as const)} />
            {error?.unitOfMeasure?.message ? (
              <p className="text-xs text-destructive">{error.unitOfMeasure.message}</p>
            ) : null}
          </TableCell>
          <TableCell className="text-right text-sm text-slate-600 font-mono">
            {(() => {
              const ingredientId = form.watch(`recipes.${index}.ingredientId`);
              const ingredient = ingredientsList.find((ing) => ing.id === ingredientId);
              return ingredient ? formatCurrency(ingredient.unitCost) : '—';
            })()}
          </TableCell>
          <TableCell className="text-right text-sm text-slate-900 font-mono font-medium">
            {(() => {
              const ingredientId = form.watch(`recipes.${index}.ingredientId`);
              const ingredient = ingredientsList.find((ing) => ing.id === ingredientId);
              const quantity = form.watch(`recipes.${index}.quantity`) || 0;
              if (ingredient && quantity > 0) {
                return formatCurrency(ingredient.unitCost * quantity);
              }
              return '—';
            })()}
          </TableCell>
          <TableCell className="text-right">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => array.remove(index)}
              disabled={array.fields.length === 1}
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
          Keep menu items in sync with ingredient recipes. Costs roll up automatically in the review step.
        </p>
      </header>

      {combinedError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
      {formMessage ? (
        <div
          className={
            formMessage.type === 'success'
              ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'
              : 'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
          }
        >
          {formMessage.message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Menu catalog</CardTitle>
              <CardDescription>Deactivate items to hide them from costing and reporting.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Loading menu items...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipe</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-slate-800">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? 'success' : 'warning'}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {editingMenuItemId === item.id && editingMenuItem.data
                          ? formatIngredientList(
                              editingMenuItem.data.recipes.map(
                                (recipe) => ingredientNameById.get(recipe.ingredientId) ?? recipe.ingredientId
                              )
                            )
                          : 'Select to view recipe'}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant={editingMenuItemId === item.id ? 'secondary' : 'ghost'}
                          onClick={() => setEditingMenuItemId(item.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteMenuItemMutation.isPending}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="text-sm text-slate-500">
            Recipes are versioned implicitly via ingredient history; finalize to snapshot costs.
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create menu item</CardTitle>
              <CardDescription>Define an item and its ingredient recipe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={handleCreate} noValidate>
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
                </FormField>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Recipe Cost:</span>
                    <span className="font-mono text-slate-900">
                      {formatCurrency(createRecipeCostSummary.totalRecipeCost)}
                    </span>
                  </div>
                  {createRecipeCostSummary.foodCostPercentage > 0 && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="font-medium text-slate-700">Food Cost %:</span>
                      <span
                        className={`font-mono ${
                          createRecipeCostSummary.foodCostPercentage <= 30
                            ? 'text-green-700'
                            : createRecipeCostSummary.foodCostPercentage <= 35
                              ? 'text-yellow-700'
                              : 'text-red-700'
                        }`}
                      >
                        {formatPercentage(createRecipeCostSummary.foodCostPercentage)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Line Total</TableHead>
                        <TableHead className="text-right">Remove</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {renderRecipeRows(createRecipes, createForm, activeIngredients)}
                      <TableRow className="border-t-2 bg-slate-50">
                        <TableCell colSpan={4} className="text-right font-medium text-slate-900">
                          Recipe Total:
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(createRecipeCostSummary.totalRecipeCost)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {createForm.formState.errors.recipes?.root?.message ? (
                  <p className="text-xs text-destructive">
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    upsertMenuItemMutation.isPending || createForm.formState.isSubmitting || !activeIngredients.length
                  }
                >
                  {upsertMenuItemMutation.isPending ? 'Saving...' : 'Save menu item'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {editingMenuItemId ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit menu item</CardTitle>
                <CardDescription>Adjust the recipe or toggle active state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form className="space-y-4" onSubmit={handleUpdate} noValidate>
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
                  </FormField>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">Recipe Cost:</span>
                      <span className="font-mono text-slate-900">
                        {formatCurrency(editRecipeCostSummary.totalRecipeCost)}
                      </span>
                    </div>
                    {editRecipeCostSummary.foodCostPercentage > 0 && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="font-medium text-slate-700">Food Cost %:</span>
                        <span
                          className={`font-mono ${
                            editRecipeCostSummary.foodCostPercentage <= 30
                              ? 'text-green-700'
                              : editRecipeCostSummary.foodCostPercentage <= 35
                                ? 'text-yellow-700'
                                : 'text-red-700'
                          }`}
                        >
                          {formatPercentage(editRecipeCostSummary.foodCostPercentage)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingredient</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Line Total</TableHead>
                          <TableHead className="text-right">Remove</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {renderRecipeRows(editRecipes, editForm, activeIngredients)}
                        <TableRow className="border-t-2 bg-slate-50">
                          <TableCell colSpan={4} className="text-right font-medium text-slate-900">
                            Recipe Total:
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 font-mono">
                            {formatCurrency(editRecipeCostSummary.totalRecipeCost)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {editForm.formState.errors.recipes?.root?.message ? (
                    <p className="text-xs text-destructive">
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

                  <div className="flex items-center justify-between gap-3">
                    <Button type="button" variant="ghost" onClick={() => setEditingMenuItemId(null)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={editForm.formState.isSubmitting || upsertMenuItemMutation.isPending}
                    >
                      {upsertMenuItemMutation.isPending ? 'Saving...' : 'Update menu item'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};
