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
import { useBusiness } from '../providers/business-provider';

export const useMenuItems = () => {
  const { businessId } = useBusiness();
  return useQuery<MenuItem[]>({
    queryKey: ['menu-items', businessId],
    queryFn: () => listMenuItems(businessId!),
    enabled: !!businessId
  });
};

export const useMenuItemWithRecipes = (menuItemId: string | undefined) => {
  const { businessId } = useBusiness();
  return useQuery<MenuItemWithRecipes | null>({
    queryKey: ['menu-item', businessId, menuItemId],
    queryFn: () => {
      if (!menuItemId || !businessId) {
        return Promise.resolve(null);
      }
      return getMenuItemWithRecipes(businessId, menuItemId);
    },
    enabled: Boolean(menuItemId) && Boolean(businessId)
  });
};

interface UpsertMenuItemVariables {
  item: MenuItemInput;
  recipes: RecipeInput[];
}

export const useUpsertMenuItem = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();
  return useMutation<MenuItem, Error, UpsertMenuItemVariables>({
    mutationFn: ({ item, recipes }) => upsertMenuItem(businessId!, item, recipes),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', businessId] });
      queryClient.invalidateQueries({ queryKey: ['menu-item', businessId, result.id] });
    }
  });
};

export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();
  return useMutation<void, Error, string>({
    mutationFn: (menuItemId) => deleteMenuItem(businessId!, menuItemId),
    onSuccess: (_, menuItemId) => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', businessId] });
      queryClient.invalidateQueries({ queryKey: ['menu-item', businessId, menuItemId] });
    }
  });
};

export const useMenuItemRecipes = (menuItemId: string | undefined) => {
  const { businessId } = useBusiness();
  return useQuery<RecipeIngredient[]>({
    queryKey: ['menu-item-recipes', businessId, menuItemId],
    queryFn: () => {
      if (!menuItemId || !businessId) {
        return Promise.resolve([]);
      }
      return getMenuItemWithRecipes(businessId, menuItemId).then((result) => result?.recipes ?? []);
    },
    enabled: Boolean(menuItemId) && Boolean(businessId),
    initialData: []
  });
};
