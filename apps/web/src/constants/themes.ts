import type { ThemeDefinition, ThemeName } from '@domain/preferences';

/**
 * Theme definitions for Electric Abacus
 *
 * Each theme uses HSL color format for maximum flexibility with Tailwind CSS.
 * Colors are defined as HSL values without the 'hsl()' wrapper for compatibility
 * with Tailwind's color system.
 *
 * Color guidelines:
 * - Primary: Main brand color, used for CTAs and interactive elements
 * - Secondary: Supporting color for less prominent UI elements
 * - Destructive: Error states and dangerous actions
 * - Muted: Subtle backgrounds and less important text
 * - Accent: Highlighted elements and special states
 */

export const THEMES: Record<ThemeName, ThemeDefinition> = {
  default: {
    name: 'default',
    displayName: 'Electric Orange',
    description: 'Warm orange primary with navy secondary - the classic Electric Abacus look',
    colors: {
      // Core colors - warm orange primary
      primary: '24 95% 53%', // hsl(24, 95%, 53%) - vibrant orange
      primaryForeground: '48 100% 99%', // near white
      secondary: '216 34% 17%', // navy blue
      secondaryForeground: '48 100% 99%',

      // UI colors
      background: '210 20% 98%', // very light gray-blue
      foreground: '222 47% 11%', // dark blue-gray
      border: '216 34% 17%',
      input: '216 34% 17%',
      ring: '24 95% 53%', // orange for focus rings

      // State colors
      destructive: '0 84% 60%',
      destructiveForeground: '48 100% 99%',
      muted: '216 34% 92%',
      mutedForeground: '216 34% 30%',
      accent: '48 100% 96%',
      accentForeground: '24 95% 22%',

      // Surface colors
      popover: '0 0% 100%',
      popoverForeground: '222 47% 11%',
      card: '0 0% 100%',
      cardForeground: '222 47% 11%',
    },
  },

  'ocean-blue': {
    name: 'ocean-blue',
    displayName: 'Ocean Blue',
    description: 'Cool blue tones for reduced eye strain during long shifts',
    colors: {
      // Core colors - ocean blue
      primary: '199 89% 48%', // hsl(199, 89%, 48%) - ocean blue
      primaryForeground: '0 0% 100%',
      secondary: '217 33% 17%', // deep ocean
      secondaryForeground: '0 0% 100%',

      // UI colors
      background: '210 40% 98%',
      foreground: '217 33% 12%',
      border: '214 32% 91%',
      input: '214 32% 91%',
      ring: '199 89% 48%',

      // State colors
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      muted: '210 40% 96%',
      mutedForeground: '217 33% 40%',
      accent: '199 89% 96%',
      accentForeground: '199 89% 20%',

      // Surface colors
      popover: '0 0% 100%',
      popoverForeground: '217 33% 12%',
      card: '0 0% 100%',
      cardForeground: '217 33% 12%',
    },
  },

  'forest-green': {
    name: 'forest-green',
    displayName: 'Forest Green',
    description: 'Earthy greens for a calming, natural workspace',
    colors: {
      // Core colors - forest green
      primary: '142 71% 45%', // hsl(142, 71%, 45%) - forest green
      primaryForeground: '0 0% 100%',
      secondary: '160 84% 15%', // deep forest
      secondaryForeground: '0 0% 100%',

      // UI colors
      background: '140 20% 98%',
      foreground: '160 84% 10%',
      border: '143 30% 85%',
      input: '143 30% 85%',
      ring: '142 71% 45%',

      // State colors
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      muted: '140 25% 93%',
      mutedForeground: '160 50% 30%',
      accent: '142 71% 95%',
      accentForeground: '142 71% 20%',

      // Surface colors
      popover: '0 0% 100%',
      popoverForeground: '160 84% 10%',
      card: '0 0% 100%',
      cardForeground: '160 84% 10%',
    },
  },

  'professional-gray': {
    name: 'professional-gray',
    displayName: 'Professional Gray',
    description: 'Monochromatic corporate look for a sophisticated feel',
    colors: {
      // Core colors - professional grays
      primary: '215 20% 35%', // hsl(215, 20%, 35%) - slate blue-gray
      primaryForeground: '0 0% 100%',
      secondary: '215 25% 15%', // dark charcoal
      secondaryForeground: '0 0% 100%',

      // UI colors
      background: '0 0% 98%',
      foreground: '215 25% 10%',
      border: '214 15% 85%',
      input: '214 15% 85%',
      ring: '215 20% 35%',

      // State colors
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      muted: '210 10% 93%',
      mutedForeground: '215 15% 40%',
      accent: '215 20% 93%',
      accentForeground: '215 25% 15%',

      // Surface colors
      popover: '0 0% 100%',
      popoverForeground: '215 25% 10%',
      card: '0 0% 100%',
      cardForeground: '215 25% 10%',
    },
  },

  'high-contrast': {
    name: 'high-contrast',
    displayName: 'High Contrast',
    description: 'WCAG AAA compliant theme for maximum accessibility',
    colors: {
      // Core colors - high contrast
      primary: '221 83% 53%', // hsl(221, 83%, 53%) - vibrant blue
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 0%', // pure black
      secondaryForeground: '0 0% 100%',

      // UI colors
      background: '0 0% 100%', // pure white
      foreground: '0 0% 0%', // pure black
      border: '0 0% 20%',
      input: '0 0% 95%',
      ring: '221 83% 53%',

      // State colors
      destructive: '0 100% 40%', // darker red for better contrast
      destructiveForeground: '0 0% 100%',
      muted: '0 0% 90%',
      mutedForeground: '0 0% 10%',
      accent: '45 100% 51%', // yellow for high visibility
      accentForeground: '0 0% 0%',

      // Surface colors
      popover: '0 0% 100%',
      popoverForeground: '0 0% 0%',
      card: '0 0% 100%',
      cardForeground: '0 0% 0%',
    },
  },
};

export const THEME_OPTIONS: Array<{ value: ThemeName; label: string; description: string }> = [
  {
    value: 'default',
    label: THEMES.default.displayName,
    description: THEMES.default.description,
  },
  {
    value: 'ocean-blue',
    label: THEMES['ocean-blue'].displayName,
    description: THEMES['ocean-blue'].description,
  },
  {
    value: 'forest-green',
    label: THEMES['forest-green'].displayName,
    description: THEMES['forest-green'].description,
  },
  {
    value: 'professional-gray',
    label: THEMES['professional-gray'].displayName,
    description: THEMES['professional-gray'].description,
  },
  {
    value: 'high-contrast',
    label: THEMES['high-contrast'].displayName,
    description: THEMES['high-contrast'].description,
  },
];

/**
 * Apply a theme to the document root
 */
export function applyTheme(themeName: ThemeName): void {
  const theme = THEMES[themeName];
  if (!theme) {
    console.warn(`Theme "${themeName}" not found, falling back to default`);
    applyTheme('default');
    return;
  }

  const root = document.documentElement;

  // Set theme name as data attribute for CSS selectors
  root.setAttribute('data-theme', themeName);

  // Apply all color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variables
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssVar}`, value as string);
  });
}

/**
 * Get the current theme name from the document
 */
export function getCurrentTheme(): ThemeName {
  const themeName = document.documentElement.getAttribute('data-theme') as ThemeName;
  return themeName && THEMES[themeName] ? themeName : 'default';
}
