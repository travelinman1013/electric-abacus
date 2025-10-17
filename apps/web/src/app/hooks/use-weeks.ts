import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ReportSummary,
  Week,
  WeeklyCostSnapshotEntry,
  WeeklyInventoryEntry,
  WeeklySales
} from '@domain/costing';

import {
  createWeek,
  finalizeWeek,
  getCostSnapshots,
  getWeek,
  getWeekInventory,
  getWeekReport,
  getWeekSales,
  listWeeks,
  saveWeekInventory,
  saveWeekSales
} from '../services/firestore';
import { useBusiness } from '../providers/business-provider';

interface CreateWeekVariables {
  weekId: string;
  ingredientIds?: string[];
}

interface SaveWeekSalesVariables {
  weekId: string;
  data: Omit<WeeklySales, 'id' | 'weekId'>;
}

interface SaveWeekInventoryVariables {
  weekId: string;
  entries: WeeklyInventoryEntry[];
}

interface FinalizeWeekVariables {
  weekId: string;
}

export const useWeeks = () => {
  const { businessId } = useBusiness();
  return useQuery<Week[]>({
    queryKey: ['weeks', businessId],
    queryFn: () => listWeeks(businessId!),
    enabled: !!businessId
  });
};

export const useWeek = (weekId: string | undefined) => {
  const { businessId } = useBusiness();
  return useQuery<Week | null>({
    queryKey: ['week', businessId, weekId],
    queryFn: () => {
      if (!weekId) {
        return Promise.resolve(null);
      }
      return getWeek(businessId!, weekId);
    },
    enabled: Boolean(weekId) && !!businessId
  });
};

export const useCreateWeek = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();
  return useMutation<void, Error, CreateWeekVariables>({
    mutationFn: ({ weekId, ingredientIds }) => createWeek(businessId!, weekId, { ingredientIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks', businessId] });
    }
  });
};

export const useWeekSales = (weekId: string | undefined) => {
  const { businessId } = useBusiness();
  return useQuery<WeeklySales | null>({
    queryKey: ['week-sales', businessId, weekId],
    queryFn: () => {
      if (!weekId) {
        return Promise.resolve(null);
      }
      return getWeekSales(businessId!, weekId);
    },
    enabled: Boolean(weekId) && !!businessId
  });
};

export const useSaveWeekSales = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();
  return useMutation<void, Error, SaveWeekSalesVariables>({
    mutationFn: ({ weekId, data }) => saveWeekSales(businessId!, weekId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['week-sales', businessId, variables.weekId] });
      queryClient.invalidateQueries({ queryKey: ['week', businessId, variables.weekId] });
    }
  });
};

export const useWeekInventory = (weekId: string | undefined) => {
  const { businessId } = useBusiness();
  return useQuery<WeeklyInventoryEntry[]>({
    queryKey: ['week-inventory', businessId, weekId],
    queryFn: () => {
      if (!weekId) {
        return Promise.resolve([]);
      }
      return getWeekInventory(businessId!, weekId);
    },
    enabled: Boolean(weekId) && !!businessId
  });
};

export const useSaveWeekInventory = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();
  return useMutation<void, Error, SaveWeekInventoryVariables>({
    mutationFn: ({ weekId, entries }) => saveWeekInventory(businessId!, weekId, entries),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['week-inventory', businessId, variables.weekId] });
      queryClient.invalidateQueries({ queryKey: ['week', businessId, variables.weekId] });
    }
  });
};

export const useWeekCostSnapshot = (weekId: string | undefined) => {
  const { businessId } = useBusiness();
  return useQuery<WeeklyCostSnapshotEntry[]>({
    queryKey: ['week-cost-snapshot', businessId, weekId],
    queryFn: () => {
      if (!weekId) {
        return Promise.resolve([]);
      }
      return getCostSnapshots(businessId!, weekId);
    },
    enabled: Boolean(weekId) && !!businessId,
    initialData: []
  });
};

export const useWeekReport = (weekId: string | undefined) => {
  const { businessId } = useBusiness();
  return useQuery<ReportSummary | null>({
    queryKey: ['week-report', businessId, weekId],
    queryFn: () => {
      if (!weekId) {
        return Promise.resolve(null);
      }
      return getWeekReport(businessId!, weekId);
    },
    enabled: Boolean(weekId) && !!businessId
  });
};

export const useFinalizeWeek = () => {
  const queryClient = useQueryClient();
  const { businessId } = useBusiness();
  return useMutation<ReportSummary, Error, FinalizeWeekVariables>({
    mutationFn: ({ weekId }) => finalizeWeek(businessId!, weekId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['week', businessId, variables.weekId] });
      queryClient.invalidateQueries({ queryKey: ['weeks', businessId] });
      queryClient.invalidateQueries({ queryKey: ['week-inventory', businessId, variables.weekId] });
      queryClient.invalidateQueries({ queryKey: ['week-cost-snapshot', businessId, variables.weekId] });
      queryClient.invalidateQueries({ queryKey: ['week-report', businessId, variables.weekId] });
    }
  });
};
