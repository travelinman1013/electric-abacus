import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useBusiness } from '../../../providers/business-provider';
import { useWeeks } from '../../../hooks/use-weeks';
import { useMenuItems } from '../../../hooks/use-menu-items';
import { useIngredients } from '../../../hooks/use-ingredients';
import { getWeekInventory } from '../../../services/firestore';

/**
 * Fetches the last N finalized weeks ordered by weekId descending
 * @param limit Maximum number of weeks to fetch (default: 12)
 */
export const useWeeksHistory = (limit = 12) => {
  const { data: allWeeks = [], isLoading, isError, error } = useWeeks();

  const finalizedWeeks = useMemo(() => {
    return allWeeks
      .filter((week) => week.status === 'finalized')
      .sort((a, b) => (a.id > b.id ? -1 : 1)) // Sort by weekId descending
      .slice(0, limit);
  }, [allWeeks, limit]);

  return {
    data: finalizedWeeks,
    isLoading,
    isError,
    error
  };
};

interface MenuItemAnalytics {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * Fetches menu items for analytics
 * Note: Recipe cost calculations will be added in next phase
 */
export const useMenuAnalytics = () => {
  const { data: menuItems = [], isLoading, isError, error } = useMenuItems();

  const analytics = useMemo<MenuItemAnalytics[]>(() => {
    return menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      isActive: item.isActive
    }));
  }, [menuItems]);

  return {
    data: analytics,
    isLoading,
    isError,
    error
  };
};

interface InventoryAnalytics {
  totalValue: number;
  valueByCategory: {
    food: number;
    paper: number;
    other: number;
  };
}

/**
 * Calculates total inventory value and value by category from most recent finalized week
 */
export const useInventoryAnalytics = () => {
  const { businessId } = useBusiness();
  const { data: ingredients = [], isLoading: ingredientsLoading } = useIngredients();
  const { data: finalizedWeeks = [] } = useWeeksHistory(1); // Get most recent finalized week

  const mostRecentWeekId = finalizedWeeks[0]?.id;

  // Fetch inventory for most recent finalized week
  const { data: inventoryEntries = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['week-inventory', businessId, mostRecentWeekId],
    queryFn: () => {
      if (!mostRecentWeekId || !businessId) {
        return Promise.resolve([]);
      }
      return getWeekInventory(businessId, mostRecentWeekId);
    },
    enabled: Boolean(mostRecentWeekId) && Boolean(businessId)
  });

  const analytics = useMemo<InventoryAnalytics>(() => {
    if (!inventoryEntries.length || !ingredients.length) {
      return {
        totalValue: 0,
        valueByCategory: {
          food: 0,
          paper: 0,
          other: 0
        }
      };
    }

    // Create ingredient lookup map
    const ingredientMap = new Map(ingredients.map((ing) => [ing.id, ing]));

    let totalValue = 0;
    const valueByCategory = {
      food: 0,
      paper: 0,
      other: 0
    };

    inventoryEntries.forEach((entry) => {
      const ingredient = ingredientMap.get(entry.ingredientId);
      if (!ingredient) return;

      // Calculate value from ending inventory
      const value = entry.end * ingredient.costPerUnit;
      totalValue += value;

      // Add to category total
      valueByCategory[ingredient.category] += value;
    });

    return {
      totalValue,
      valueByCategory
    };
  }, [inventoryEntries, ingredients]);

  return {
    data: analytics,
    isLoading: ingredientsLoading || inventoryLoading,
    isError: false,
    error: null
  };
};
