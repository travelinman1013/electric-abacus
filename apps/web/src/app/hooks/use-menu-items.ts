import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MenuItem, RecipeIngredient } from '@domain/costing';

import {
  deleteMenuItem,
  getMenuItemWithRecipes,
  listMenuItems,
  upsertMenuItem,
  type MenuItemInput,
  type MenuItemWithRecipes,
  type RecipeInput
} from '../services/firestore';

export const useMenuItems = () =>
  useQuery<MenuItem[]>({
    queryKey: ['menu-items'],
    queryFn: () => listMenuItems()
  });

export const useMenuItemWithRecipes = (menuItemId: string | undefined) =>
  useQuery<MenuItemWithRecipes | null>({
    queryKey: ['menu-item', menuItemId],
    queryFn: () => {
      if (!menuItemId) {
        return Promise.resolve(null);
      }
      return getMenuItemWithRecipes(menuItemId);
    },
    enabled: Boolean(menuItemId)
  });

interface UpsertMenuItemVariables {
  item: MenuItemInput;
  recipes: RecipeInput[];
}

export const useUpsertMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation<MenuItem, Error, UpsertMenuItemVariables>({
    mutationFn: ({ item, recipes }) => upsertMenuItem(item, recipes),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['menu-item', result.id] });
    }
  });
};

export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (menuItemId) => deleteMenuItem(menuItemId),
    onSuccess: (_, menuItemId) => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['menu-item', menuItemId] });
    }
  });
};

export const useMenuItemRecipes = (menuItemId: string | undefined) =>
  useQuery<RecipeIngredient[]>({
    queryKey: ['menu-item-recipes', menuItemId],
    queryFn: () => {
      if (!menuItemId) {
        return Promise.resolve([]);
      }
      return getMenuItemWithRecipes(menuItemId).then((result) => result?.recipes ?? []);
    },
    enabled: Boolean(menuItemId),
    initialData: []
  });
