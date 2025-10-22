import { useCallback, useEffect, useState } from 'react';
import type { TableType } from '@domain/preferences';
import { usePreferences } from '../providers/preferences-provider';

export interface ColumnWidths {
  ingredient?: number;
  qty?: number;
  unit?: number;
  total?: number;
}

interface ColumnConstraints {
  min: number;
  max?: number;
}

const DEFAULT_WIDTHS: Required<ColumnWidths> = {
  ingredient: 0, // auto width
  qty: 90,
  unit: 100,
  total: 100,
};

const COLUMN_CONSTRAINTS: Record<keyof ColumnWidths, ColumnConstraints> = {
  ingredient: { min: 150 },
  qty: { min: 70, max: 120 },
  unit: { min: 70, max: 120 },
  total: { min: 80, max: 150 },
};

interface UseResizableColumnsOptions {
  tableType?: TableType;
}

export const useResizableColumns = (options: UseResizableColumnsOptions = {}) => {
  const { tableType = 'menuItems' } = options;
  const { preferences, updatePreferences } = usePreferences();

  const [columnWidths, setColumnWidths] = useState<Required<ColumnWidths>>(DEFAULT_WIDTHS);
  const [isLocked, setIsLocked] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Load from preferences on mount and when preferences change
  useEffect(() => {
    try {
      const savedWidths = preferences.columns.widths[tableType];
      const savedLocked = preferences.columns.lockStates[tableType];

      if (savedWidths && Object.keys(savedWidths).length > 0) {
        setColumnWidths({ ...DEFAULT_WIDTHS, ...savedWidths });
      }

      setIsLocked(savedLocked ?? false);
    } catch (error) {
      console.error(`Failed to load column widths for ${tableType}`, error);
    }
  }, [tableType, preferences.columns]);

  // Save to preferences when widths change
  const saveWidths = useCallback(
    (widths: Required<ColumnWidths>) => {
      try {
        void updatePreferences({
          columns: {
            ...preferences.columns,
            widths: {
              ...preferences.columns.widths,
              [tableType]: widths,
            },
          },
        });
      } catch (error) {
        console.error(`Failed to save column widths for ${tableType}`, error);
      }
    },
    [tableType, preferences.columns, updatePreferences]
  );

  // Handle column resize - accepts absolute width
  const handleResize = useCallback(
    (columnKey: keyof ColumnWidths, newWidth: number) => {
      if (isLocked) return;

      const constraints = COLUMN_CONSTRAINTS[columnKey];
      let constrainedWidth = Math.max(newWidth, constraints.min);
      if (constraints.max) {
        constrainedWidth = Math.min(constrainedWidth, constraints.max);
      }

      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: Math.round(constrainedWidth),
      }));
    },
    [isLocked],
  );

  // Save widths on resize end
  const handleResizeEnd = useCallback(() => {
    saveWidths(columnWidths);
    setIsResizing(false);
  }, [columnWidths, saveWidths]);

  // Toggle lock state
  const toggleLock = useCallback(() => {
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    try {
      void updatePreferences({
        columns: {
          ...preferences.columns,
          lockStates: {
            ...preferences.columns.lockStates,
            [tableType]: newLocked,
          },
        },
      });
    } catch (error) {
      console.error(`Failed to save lock state for ${tableType}`, error);
    }
  }, [isLocked, tableType, preferences.columns, updatePreferences]);

  // Reset to default widths
  const resetWidths = useCallback(() => {
    setColumnWidths(DEFAULT_WIDTHS);
    saveWidths(DEFAULT_WIDTHS);
  }, [saveWidths]);

  return {
    columnWidths,
    isLocked,
    isResizing,
    setIsResizing,
    handleResize,
    handleResizeEnd,
    toggleLock,
    resetWidths,
  };
};
