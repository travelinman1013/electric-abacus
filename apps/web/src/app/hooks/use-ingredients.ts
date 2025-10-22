import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Ingredient, IngredientVersion } from '@domain/costing';

import {
  createIngredient,
  deleteIngredient,
  getActiveIngredientIds,
  getIngredient,
  getIngredientVersions,
  listIngredients,
  setIngredientActiveState,
  updateIngredient,
  type CreateIngredientInput,
  type UpdateIngredientInput
} from '../services/firestore';
import { useBusiness } from '../providers/business-provider';

export const useIngredients = () => {
  const { businessId } = useBusiness();
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients', businessId],
    queryFn: () => listIngredients(businessId!),
    enabled: !!businessId
  });
};

export const useActiveIngredientIds = () => {
  const { businessId } = useBusiness();
  return useQuery<string[]>({
    queryKey: ['ingredients', 'active-ids', businessId],
    queryFn: () => getActiveIngredientIds(businessId!),
    enabled: !!businessId
  });
};

export const useIngredient = (ingredientId: string | undefined) => {
  const { businessId } = useBusiness();
  return useQuery<Ingredient | null>({
    queryKey: ['ingredient', businessId, ingredientId],
    queryFn: () => {
      if (!ingredientId || !businessId) {
        return Promise.resolve(null);
      }
      return getIngredient(businessId, ingredientId);
    },
    enabled: Boolean(ingredientId) && Boolean(businessId)
  });
};

export const useIngredientVersions = (ingredientId: string | undefined) => {
  const { businessId } = useBusiness();
  return useQuery<IngredientVersion[]>({
    queryKey: ['ingredient-versions', businessId, ingredientId],
    queryFn: () => {
      if (!ingredientId || !businessId) {
        return Promise.resolve([]);
      }
      return getIngredientVersions(businessId, ingredientId);
    },
    enabled: Boolean(ingredientId) && Boolean(businessId),
    initialData: []
  });
};

export const useCreateIngredient = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();
  return useMutation<Ingredient, Error, CreateIngredientInput>({
    mutationFn: (input) => createIngredient(businessId!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ingredients', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['ingredients', 'active-ids', businessId] });
    }
  });
};

export const useUpdateIngredient = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();
  return useMutation<void, Error, UpdateIngredientInput>({
    mutationFn: (input) => updateIngredient(businessId!, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['ingredients', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['ingredient', businessId, variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['ingredient-versions', businessId, variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['ingredients', 'active-ids', businessId] });
    }
  });
};

interface SetIngredientActiveVariables {
  ingredientId: string;
  isActive: boolean;
}

export const useSetIngredientActive = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();
  return useMutation<void, Error, SetIngredientActiveVariables>({
    mutationFn: ({ ingredientId, isActive }) => setIngredientActiveState(businessId!, ingredientId, isActive),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['ingredients', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['ingredients', 'active-ids', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['ingredient', businessId, variables.ingredientId] });
    }
  });
};

export const useDeleteIngredient = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();
  return useMutation<void, Error, string>({
    mutationFn: (ingredientId) => deleteIngredient(businessId!, ingredientId),
    onSuccess: (_, ingredientId) => {
      void queryClient.invalidateQueries({ queryKey: ['ingredients', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['ingredients', 'active-ids', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['ingredient', businessId, ingredientId] });
    }
  });
};
