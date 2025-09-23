import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Ingredient, IngredientVersion } from '@domain/costing';

import {
  createIngredient,
  getActiveIngredientIds,
  getIngredient,
  getIngredientVersions,
  listIngredients,
  setIngredientActiveState,
  updateIngredient,
  type CreateIngredientInput,
  type UpdateIngredientInput
} from '../services/firestore';

export const useIngredients = () =>
  useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: () => listIngredients()
  });

export const useActiveIngredientIds = () =>
  useQuery<string[]>({
    queryKey: ['ingredients', 'active-ids'],
    queryFn: () => getActiveIngredientIds()
  });

export const useIngredient = (ingredientId: string | undefined) =>
  useQuery<Ingredient | null>({
    queryKey: ['ingredient', ingredientId],
    queryFn: () => {
      if (!ingredientId) {
        return Promise.resolve(null);
      }
      return getIngredient(ingredientId);
    },
    enabled: Boolean(ingredientId)
  });

export const useIngredientVersions = (ingredientId: string | undefined) =>
  useQuery<IngredientVersion[]>({
    queryKey: ['ingredient-versions', ingredientId],
    queryFn: () => {
      if (!ingredientId) {
        return Promise.resolve([]);
      }
      return getIngredientVersions(ingredientId);
    },
    enabled: Boolean(ingredientId),
    initialData: []
  });

export const useCreateIngredient = () => {
  const queryClient = useQueryClient();
  return useMutation<Ingredient, Error, CreateIngredientInput>({
    mutationFn: (input) => createIngredient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients', 'active-ids'] });
    }
  });
};

export const useUpdateIngredient = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, UpdateIngredientInput>({
    mutationFn: (input) => updateIngredient(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ingredient-versions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ingredients', 'active-ids'] });
    }
  });
};

interface SetIngredientActiveVariables {
  ingredientId: string;
  isActive: boolean;
}

export const useSetIngredientActive = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, SetIngredientActiveVariables>({
    mutationFn: ({ ingredientId, isActive }) => setIngredientActiveState(ingredientId, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients', 'active-ids'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', variables.ingredientId] });
    }
  });
};
