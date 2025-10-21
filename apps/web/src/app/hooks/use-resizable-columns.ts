import { useCallback, useEffect, useState } from 'react';

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

const STORAGE_KEY_WIDTHS = 'menuItemTable:columnWidths';
const STORAGE_KEY_LOCKED = 'menuItemTable:isLocked';

export const useResizableColumns = () => {
  const [columnWidths, setColumnWidths] = useState<Required<ColumnWidths>>(DEFAULT_WIDTHS);
  const [isLocked, setIsLocked] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WIDTHS);
      if (stored) {
        const parsed = JSON.parse(stored) as ColumnWidths;
        setColumnWidths({ ...DEFAULT_WIDTHS, ...parsed });
      }

      const lockedStored = localStorage.getItem(STORAGE_KEY_LOCKED);
      if (lockedStored) {
        setIsLocked(lockedStored === 'true');
      }
    } catch (error) {
      console.error('Failed to load column widths from localStorage', error);
    }
  }, []);

  // Save to localStorage when widths change
  const saveWidths = useCallback((widths: Required<ColumnWidths>) => {
    try {
      localStorage.setItem(STORAGE_KEY_WIDTHS, JSON.stringify(widths));
    } catch (error) {
      console.error('Failed to save column widths to localStorage', error);
    }
  }, []);

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
      localStorage.setItem(STORAGE_KEY_LOCKED, String(newLocked));
    } catch (error) {
      console.error('Failed to save lock state to localStorage', error);
    }
  }, [isLocked]);

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
