import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DEFAULT_TERMINOLOGY } from '@domain/terminology';

import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useTerminology } from '../../hooks/useTerminology';
import { useUpdateTerminology, useResetTerminology } from './hooks/useTerminologyMutations';

/**
 * Zod schema for terminology form validation
 * Each terminology field must be a non-empty string with max 50 characters
 */
const terminologySchema = z.object({
  ingredients: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  ingredient: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  menuItems: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  menuItem: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  recipes: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  recipe: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  weeks: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  week: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  inventory: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
});

type TerminologyFormData = z.infer<typeof terminologySchema>;

/**
 * BusinessTerminology - Settings page for customizing business terminology
 *
 * This page allows business owners to customize the labels used throughout
 * the application for business entities like ingredients, menu items, etc.
 *
 * Features:
 * - Form validation with React Hook Form and Zod
 * - Optimistic updates for instant feedback
 * - Reset to defaults with confirmation
 * - Success/error message handling
 * - Loading states during mutations
 *
 * Access: Restricted to users with role="owner" via RoleGuard in routes
 */
export const BusinessTerminology = () => {
  const { terms, isLoading: termsLoading } = useTerminology();
  const updateTerminology = useUpdateTerminology();
  const resetTerminology = useResetTerminology();

  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Initialize form with current terminology values
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<TerminologyFormData>({
    resolver: zodResolver(terminologySchema),
    defaultValues: terms,
    values: terms, // Update form when terms change
  });

  /**
   * Handle form submission
   * Saves the updated terminology to Firestore with optimistic updates
   */
  const onSubmit = async (data: TerminologyFormData) => {
    try {
      await updateTerminology.mutateAsync(data);
      setSaveMessage({ type: 'success', message: 'Terminology updated successfully' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update terminology',
      });
    }
  };

  /**
   * Handle reset to defaults
   * Shows confirmation dialog before removing custom terminology
   */
  const handleReset = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all terminology to defaults? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      await resetTerminology.mutateAsync();
      reset({ ...DEFAULT_TERMINOLOGY }); // Reset form to default values
      setSaveMessage({ type: 'success', message: 'Terminology reset to defaults' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to reset terminology',
      });
    }
  };

  if (termsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500">Loading terminology...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-slate-900">Business Terminology</h1>
        <p className="text-sm text-slate-500">
          Customize the labels used throughout the app to match your business language
        </p>
      </header>

      {saveMessage && (
        <div
          className={
            saveMessage.type === 'success'
              ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'
              : 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
          }
        >
          {saveMessage.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Custom Labels</CardTitle>
          <CardDescription>
            Change how business entities are labeled in your workspace. For example, change "Ingredients"
            to "Products" or "Menu Items" to "Dishes".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ingredients (plural) */}
              <div className="space-y-2">
                <Label htmlFor="ingredients">
                  Ingredients (plural)
                  {errors.ingredients && (
                    <span className="text-red-600 text-xs ml-2">{errors.ingredients.message}</span>
                  )}
                </Label>
                <Input
                  id="ingredients"
                  {...register('ingredients')}
                  placeholder={DEFAULT_TERMINOLOGY.ingredients}
                  className={errors.ingredients ? 'border-red-300' : ''}
                />
                <p className="text-xs text-slate-500">Default: {DEFAULT_TERMINOLOGY.ingredients}</p>
              </div>

              {/* Ingredient (singular) */}
              <div className="space-y-2">
                <Label htmlFor="ingredient">
                  Ingredient (singular)
                  {errors.ingredient && (
                    <span className="text-red-600 text-xs ml-2">{errors.ingredient.message}</span>
                  )}
                </Label>
                <Input
                  id="ingredient"
                  {...register('ingredient')}
                  placeholder={DEFAULT_TERMINOLOGY.ingredient}
                  className={errors.ingredient ? 'border-red-300' : ''}
                />
                <p className="text-xs text-slate-500">Default: {DEFAULT_TERMINOLOGY.ingredient}</p>
              </div>

              {/* Menu Items (plural) */}
              <div className="space-y-2">
                <Label htmlFor="menuItems">
                  Menu Items (plural)
                  {errors.menuItems && (
                    <span className="text-red-600 text-xs ml-2">{errors.menuItems.message}</span>
                  )}
                </Label>
                <Input
                  id="menuItems"
                  {...register('menuItems')}
                  placeholder={DEFAULT_TERMINOLOGY.menuItems}
                  className={errors.menuItems ? 'border-red-300' : ''}
                />
                <p className="text-xs text-slate-500">Default: {DEFAULT_TERMINOLOGY.menuItems}</p>
              </div>

              {/* Menu Item (singular) */}
              <div className="space-y-2">
                <Label htmlFor="menuItem">
                  Menu Item (singular)
                  {errors.menuItem && (
                    <span className="text-red-600 text-xs ml-2">{errors.menuItem.message}</span>
                  )}
                </Label>
                <Input
                  id="menuItem"
                  {...register('menuItem')}
                  placeholder={DEFAULT_TERMINOLOGY.menuItem}
                  className={errors.menuItem ? 'border-red-300' : ''}
                />
                <p className="text-xs text-slate-500">Default: {DEFAULT_TERMINOLOGY.menuItem}</p>
              </div>

              {/* Recipes (plural) */}
              <div className="space-y-2">
                <Label htmlFor="recipes">
                  Recipes (plural)
                  {errors.recipes && (
                    <span className="text-red-600 text-xs ml-2">{errors.recipes.message}</span>
                  )}
                </Label>
                <Input
                  id="recipes"
                  {...register('recipes')}
                  placeholder={DEFAULT_TERMINOLOGY.recipes}
                  className={errors.recipes ? 'border-red-300' : ''}
                />
                <p className="text-xs text-slate-500">Default: {DEFAULT_TERMINOLOGY.recipes}</p>
              </div>

              {/* Recipe (singular) */}
              <div className="space-y-2">
                <Label htmlFor="recipe">
                  Recipe (singular)
                  {errors.recipe && (
                    <span className="text-red-600 text-xs ml-2">{errors.recipe.message}</span>
                  )}
                </Label>
                <Input
                  id="recipe"
                  {...register('recipe')}
                  placeholder={DEFAULT_TERMINOLOGY.recipe}
                  className={errors.recipe ? 'border-red-300' : ''}
                />
                <p className="text-xs text-slate-500">Default: {DEFAULT_TERMINOLOGY.recipe}</p>
              </div>

              {/* Weeks (plural) */}
              <div className="space-y-2">
                <Label htmlFor="weeks">
                  Weeks (plural)
                  {errors.weeks && <span className="text-red-600 text-xs ml-2">{errors.weeks.message}</span>}
                </Label>
                <Input
                  id="weeks"
                  {...register('weeks')}
                  placeholder={DEFAULT_TERMINOLOGY.weeks}
                  className={errors.weeks ? 'border-red-300' : ''}
                />
                <p className="text-xs text-slate-500">Default: {DEFAULT_TERMINOLOGY.weeks}</p>
              </div>

              {/* Week (singular) */}
              <div className="space-y-2">
                <Label htmlFor="week">
                  Week (singular)
                  {errors.week && <span className="text-red-600 text-xs ml-2">{errors.week.message}</span>}
                </Label>
                <Input
                  id="week"
                  {...register('week')}
                  placeholder={DEFAULT_TERMINOLOGY.week}
                  className={errors.week ? 'border-red-300' : ''}
                />
                <p className="text-xs text-slate-500">Default: {DEFAULT_TERMINOLOGY.week}</p>
              </div>

              {/* Inventory */}
              <div className="space-y-2">
                <Label htmlFor="inventory">
                  Inventory
                  {errors.inventory && (
                    <span className="text-red-600 text-xs ml-2">{errors.inventory.message}</span>
                  )}
                </Label>
                <Input
                  id="inventory"
                  {...register('inventory')}
                  placeholder={DEFAULT_TERMINOLOGY.inventory}
                  className={errors.inventory ? 'border-red-300' : ''}
                />
                <p className="text-xs text-slate-500">Default: {DEFAULT_TERMINOLOGY.inventory}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t">
              <Button
                type="submit"
                disabled={!isDirty || updateTerminology.isPending}
                className="min-w-[120px]"
              >
                {updateTerminology.isPending ? 'Saving...' : 'Save Changes'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={resetTerminology.isPending}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                {resetTerminology.isPending ? 'Resetting...' : 'Reset to Defaults'}
              </Button>

              {isDirty && (
                <p className="text-xs text-slate-500">You have unsaved changes</p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="text-slate-600">
              Your custom labels will appear throughout the app. For example:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 ml-2">
              <li>Navigation: "{terms.ingredients}", "{terms.menuItems}", "{terms.weeks}"</li>
              <li>Page headers: "Add {terms.ingredient}", "Edit {terms.menuItem}"</li>
              <li>Tables: "{terms.ingredients} List", "{terms.inventory} Tracking"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
