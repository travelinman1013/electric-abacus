/**
 * User preferences and theming types for Electric Abacus
 *
 * Supports 6 key preference categories:
 * 1. Theme selection
 * 2. Table density
 * 3. Currency & number formatting
 * 4. Column width persistence
 * 5. Default start page
 * 6. Notification preferences
 */

export type ThemeName =
  | 'default'
  | 'ocean-blue'
  | 'forest-green'
  | 'professional-gray'
  | 'high-contrast';

export interface ThemeDefinition {
  name: ThemeName;
  displayName: string;
  description: string;
  colors: {
    // Core colors
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;

    // UI colors
    background: string;
    foreground: string;
    border: string;
    input: string;
    ring: string;

    // State colors
    destructive: string;
    destructiveForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;

    // Surface colors
    popover: string;
    popoverForeground: string;
    card: string;
    cardForeground: string;
  };
}

export type TableDensity = 'compact' | 'comfortable' | 'spacious';

export interface TableDensityConfig {
  paddingY: string;
  paddingX: string;
  fontSize: string;
  lineHeight: string;
}

export type CurrencySymbol = '$' | '£' | '€' | '¥';

export type DecimalPrecision = 0 | 1 | 2;

export type ThousandsSeparator = 'comma' | 'period' | 'space' | 'none';

export interface NumberFormatPreferences {
  currency: CurrencySymbol;
  decimals: DecimalPrecision;
  thousandsSeparator: ThousandsSeparator;
}

export type TableType =
  | 'menuItems'
  | 'ingredients'
  | 'inventory'
  | 'sales'
  | 'weeks'
  | 'review';

export type ColumnWidthMap = Record<string, number>;

export interface ColumnPreferences {
  widths: Record<TableType, ColumnWidthMap>;
  lockStates: Record<TableType, boolean>;
}

export type AppStartPage =
  | '/app/weeks'
  | '/app/weeks/current'
  | '/app/menu-items'
  | '/app/ingredients'
  | '/app/review';

export interface NotificationPreferences {
  // Food cost percentage threshold for warnings
  foodCostWarningThreshold: number; // default: 35

  // Success message display duration in milliseconds
  successToastDuration: number; // default: 3000 (3s)

  // Future features (placeholders)
  lowInventoryAlerts?: boolean;
  weekFinalizationReminders?: boolean;
}

export interface UserPreferences {
  // 1. Theme selection
  theme: ThemeName;

  // 2. Table density
  tableDensity: TableDensity;

  // 3. Number formatting
  numberFormat: NumberFormatPreferences;

  // 4. Column width persistence
  columns: ColumnPreferences;

  // 5. Default start page
  defaultStartPage: AppStartPage;

  // 6. Notification preferences
  notifications: NotificationPreferences;

  // Metadata
  version: number; // for future migrations
  updatedAt?: string;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'default',
  tableDensity: 'comfortable',
  numberFormat: {
    currency: '$',
    decimals: 2,
    thousandsSeparator: 'comma',
  },
  columns: {
    widths: {
      menuItems: {},
      ingredients: {},
      inventory: {},
      sales: {},
      weeks: {},
      review: {},
    },
    lockStates: {
      menuItems: false,
      ingredients: false,
      inventory: false,
      sales: false,
      weeks: false,
      review: false,
    },
  },
  defaultStartPage: '/app/weeks',
  notifications: {
    foodCostWarningThreshold: 35,
    successToastDuration: 3000,
    lowInventoryAlerts: false,
    weekFinalizationReminders: false,
  },
  version: 1,
};

export const TABLE_DENSITY_CONFIGS: Record<TableDensity, TableDensityConfig> = {
  compact: {
    paddingY: '0.25rem',
    paddingX: '0.5rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  comfortable: {
    paddingY: '0.5rem',
    paddingX: '0.75rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  spacious: {
    paddingY: '0.75rem',
    paddingX: '1rem',
    fontSize: '1rem',
    lineHeight: '1.5rem',
  },
};
