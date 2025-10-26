import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TerminologyKey } from '@domain/terminology';

import { updateBusinessTerminology, resetBusinessTerminology } from '../../../services/firestore';
import { useBusiness } from '../../../providers/business-provider';

/**
 * Type for terminology updates - allows string values for all terminology keys
 */
type TerminologyUpdate = Partial<Record<TerminologyKey, string>>;

/**
 * Hook to update business custom terminology
 *
 * Implements optimistic updates by immediately updating the cache before the server responds.
 * If the update fails, the cache is automatically rolled back to the previous value.
 *
 * @example
 * const updateTerminology = useUpdateTerminology();
 * updateTerminology.mutate({ ingredients: "Products", ingredient: "Product" });
 */
interface MutationContext {
  previousBusiness: unknown;
}

export const useUpdateTerminology = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();

  return useMutation<void, Error, TerminologyUpdate, MutationContext>({
    mutationFn: async (updates: TerminologyUpdate) => {
      if (!businessId) {
        throw new Error('No business selected');
      }

      await updateBusinessTerminology(businessId, updates);
    },
    onMutate: async (updates) => {
      // Cancel outgoing queries to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['business', businessId] });

      // Snapshot the previous value
      const previousBusiness = queryClient.getQueryData(['business', businessId]);

      // Optimistically update the cache
      queryClient.setQueryData(['business', businessId], (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const business = old as Record<string, unknown>;
        return {
          ...business,
          customTerminology: {
            ...(typeof business.customTerminology === 'object' ? business.customTerminology : {}),
            ...updates,
          },
        };
      });

      // Return context with previous value for rollback
      return { previousBusiness };
    },
    onError: (err, updates, context) => {
      // Rollback on error
      if (context?.previousBusiness) {
        queryClient.setQueryData(['business', businessId], context.previousBusiness);
      }
      console.error('Failed to update terminology:', err);
    },
    onSuccess: () => {
      // Invalidate to ensure we have the latest data
      void queryClient.invalidateQueries({ queryKey: ['business', businessId] });
    },
  });
};

/**
 * Hook to reset business custom terminology to defaults
 *
 * Removes the customTerminology field from the business document,
 * causing the app to fall back to DEFAULT_TERMINOLOGY.
 *
 * Implements optimistic updates with automatic rollback on error.
 *
 * @example
 * const resetTerminology = useResetTerminology();
 * resetTerminology.mutate();
 */
export const useResetTerminology = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();

  return useMutation<void, Error, void, MutationContext>({
    mutationFn: async () => {
      if (!businessId) {
        throw new Error('No business selected');
      }

      await resetBusinessTerminology(businessId);
    },
    onMutate: async () => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['business', businessId] });

      // Snapshot the previous value
      const previousBusiness = queryClient.getQueryData(['business', businessId]);

      // Optimistically remove customTerminology from cache
      queryClient.setQueryData(['business', businessId], (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const business = old as Record<string, unknown>;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { customTerminology, ...rest } = business;
        return rest;
      });

      // Return context for rollback
      return { previousBusiness };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousBusiness) {
        queryClient.setQueryData(['business', businessId], context.previousBusiness);
      }
      console.error('Failed to reset terminology:', err);
    },
    onSuccess: () => {
      // Invalidate to ensure we have the latest data
      void queryClient.invalidateQueries({ queryKey: ['business', businessId] });
    },
  });
};
