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

export const useWeeks = () =>
  useQuery<Week[]>({
    queryKey: ['weeks'],
    queryFn: () => listWeeks()
  });

export const useWeek = (weekId: string | undefined) =>
  useQuery<Week | null>({
    queryKey: ['week', weekId],
    queryFn: () => {
      if (!weekId) {
        return Promise.resolve(null);
      }
      return getWeek(weekId);
    },
    enabled: Boolean(weekId)
  });

export const useCreateWeek = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, CreateWeekVariables>({
    mutationFn: ({ weekId, ingredientIds }) => createWeek(weekId, { ingredientIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks'] });
    }
  });
};

export const useWeekSales = (weekId: string | undefined) =>
  useQuery<WeeklySales | null>({
    queryKey: ['week-sales', weekId],
    queryFn: () => {
      if (!weekId) {
        return Promise.resolve(null);
      }
      return getWeekSales(weekId);
    },
    enabled: Boolean(weekId)
  });

export const useSaveWeekSales = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, SaveWeekSalesVariables>({
    mutationFn: ({ weekId, data }) => saveWeekSales(weekId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['week-sales', variables.weekId] });
      queryClient.invalidateQueries({ queryKey: ['week', variables.weekId] });
    }
  });
};

export const useWeekInventory = (weekId: string | undefined) =>
  useQuery<WeeklyInventoryEntry[]>({
    queryKey: ['week-inventory', weekId],
    queryFn: () => {
      if (!weekId) {
        return Promise.resolve([]);
      }
      return getWeekInventory(weekId);
    },
    enabled: Boolean(weekId)
  });

export const useSaveWeekInventory = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, SaveWeekInventoryVariables>({
    mutationFn: ({ weekId, entries }) => saveWeekInventory(weekId, entries),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['week-inventory', variables.weekId] });
      queryClient.invalidateQueries({ queryKey: ['week', variables.weekId] });
    }
  });
};

export const useWeekCostSnapshot = (weekId: string | undefined) =>
  useQuery<WeeklyCostSnapshotEntry[]>({
    queryKey: ['week-cost-snapshot', weekId],
    queryFn: () => {
      if (!weekId) {
        return Promise.resolve([]);
      }
      return getCostSnapshots(weekId);
    },
    enabled: Boolean(weekId),
    initialData: []
  });

export const useWeekReport = (weekId: string | undefined) =>
  useQuery<ReportSummary | null>({
    queryKey: ['week-report', weekId],
    queryFn: () => {
      if (!weekId) {
        return Promise.resolve(null);
      }
      return getWeekReport(weekId);
    },
    enabled: Boolean(weekId)
  });

export const useFinalizeWeek = () => {
  const queryClient = useQueryClient();
  return useMutation<ReportSummary, Error, FinalizeWeekVariables>({
    mutationFn: ({ weekId }) => finalizeWeek(weekId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['week', variables.weekId] });
      queryClient.invalidateQueries({ queryKey: ['weeks'] });
      queryClient.invalidateQueries({ queryKey: ['week-inventory', variables.weekId] });
      queryClient.invalidateQueries({ queryKey: ['week-cost-snapshot', variables.weekId] });
      queryClient.invalidateQueries({ queryKey: ['week-report', variables.weekId] });
    }
  });
};
