import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserPreferences, ThemeMode, BaseColor, LegacyThemeName } from '@domain/preferences';
import { DEFAULT_USER_PREFERENCES, migrateLegacyTheme } from '@domain/preferences';
import { getClientFirestore } from '@electric/firebase';
import { useAuthContext } from './auth-provider';

const PREFERENCES_STORAGE_KEY = 'electric-abacus-preferences';
const DEBOUNCE_DELAY = 1000; // 1 second debounce for Firestore writes

interface PreferencesContextValue {
  preferences: UserPreferences;
  loading: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

interface PreferencesProviderProps {
  children: ReactNode;
}

/**
 * Helper to detect system theme preference
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme by setting CSS classes on HTML element
 * This is the shadcn standard approach - no JavaScript style manipulation
 */
function applyThemeClasses(mode: ThemeMode, baseColor: BaseColor): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const systemTheme = getSystemTheme();
  const effectiveMode = mode === 'system' ? systemTheme : mode;

  console.log(`🎨 Applying theme: mode=${mode} (effective: ${effectiveMode}), baseColor=${baseColor}`);

  // Remove all theme-related classes
  root.classList.remove('light', 'dark');
  root.classList.remove('theme-zinc', 'theme-slate', 'theme-stone', 'theme-gray', 'theme-neutral', 'theme-blue', 'theme-green', 'theme-violet', 'theme-rose', 'theme-orange');

  // Apply mode class (light/dark)
  root.classList.add(effectiveMode);

  // Apply base color theme class
  root.classList.add(`theme-${baseColor}`);

  // Set data attribute for debugging
  root.setAttribute('data-mode', mode);
  root.setAttribute('data-base-color', baseColor);

  console.log(`✅ Theme applied. HTML classes: ${root.classList.toString()}`);
}

/**
 * Migrate legacy theme-based preferences to new mode + baseColor structure
 */
function migrateLegacyPreferences(stored: Record<string, unknown>): UserPreferences {
  // Check if this is legacy format (has 'theme' property but not 'mode')
  if (stored.theme && !stored.mode) {
    const legacyTheme = stored.theme as LegacyThemeName;
    const { mode, baseColor } = migrateLegacyTheme(legacyTheme);

    console.log(`📦 Migrating legacy theme "${legacyTheme}" → mode: ${mode}, baseColor: ${baseColor}`);

    // Create a copy without the theme property (Firestore doesn't allow undefined)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { theme, ...storedWithoutTheme } = stored;

    // Return migrated preferences
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...storedWithoutTheme,
      mode,
      baseColor,
    };
  }

  // Already in new format - but make sure there's no theme property
  if (stored.theme !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { theme, ...storedWithoutTheme } = stored;
    return storedWithoutTheme as unknown as UserPreferences;
  }

  return stored as unknown as UserPreferences;
}

/**
 * PreferencesProvider manages user preferences with a multi-layer caching strategy:
 *
 * 1. Memory: In-memory state for fast access during session
 * 2. localStorage: Persisted across sessions for instant load on app start
 * 3. Firestore: Source of truth, synced across devices
 *
 * Write flow:
 * - Updates are immediately applied to memory state
 * - localStorage is updated immediately for persistence
 * - Firestore writes are debounced to reduce writes
 *
 * Read flow:
 * - On mount, load from localStorage for instant UI
 * - Then fetch from Firestore to get latest cross-device state
 * - Apply theme immediately when preferences load
 *
 * Theming:
 * - Uses shadcn standard: CSS classes only (no JavaScript style manipulation)
 * - Mode: light/dark/system
 * - Base Color: zinc/slate/stone/gray/neutral
 */
export const PreferencesProvider = ({ children }: PreferencesProviderProps) => {
  const { user } = useAuthContext();
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    // Try to load from localStorage for instant initial render
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const migrated = migrateLegacyPreferences(parsed);
          // Apply theme immediately on load
          applyThemeClasses(migrated.mode, migrated.baseColor);
          return migrated;
        }
      } catch (error) {
        console.warn('Failed to load preferences from localStorage:', error);
      }
    }
    // Fallback to default and apply default theme
    applyThemeClasses(DEFAULT_USER_PREFERENCES.mode, DEFAULT_USER_PREFERENCES.baseColor);
    return DEFAULT_USER_PREFERENCES;
  });
  const [loading, setLoading] = useState(true);
  const [pendingWrite, setPendingWrite] = useState<NodeJS.Timeout | null>(null);

  // Debounced Firestore write
  const writeToFirestore = useCallback(
    async (prefs: UserPreferences) => {
      if (!user) return;

      try {
        const firestore = getClientFirestore();

        // Remove any undefined values (Firestore doesn't support them)
        // Also ensure we never have a 'theme' property (legacy)
        const cleanPrefs = Object.fromEntries(
          Object.entries(prefs).filter(([key, value]) => key !== 'theme' && value !== undefined)
        );

        await setDoc(doc(firestore, `users/${user.uid}/preferences/settings`), {
          ...cleanPrefs,
          updatedAt: new Date().toISOString(),
        });
        console.log('✅ Preferences saved to Firestore');
      } catch (error) {
        console.error('❌ Failed to save preferences to Firestore:', error);
      }
    },
    [user]
  );

  // Listen for system theme changes when mode is 'system'
  useEffect(() => {
    if (preferences.mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Re-apply theme classes to pick up new system theme
      applyThemeClasses(preferences.mode, preferences.baseColor);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences.mode, preferences.baseColor]);

  // Load preferences from Firestore on auth
  useEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_USER_PREFERENCES);
      applyThemeClasses(DEFAULT_USER_PREFERENCES.mode, DEFAULT_USER_PREFERENCES.baseColor);
      setLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const firestore = getClientFirestore();
        const preferencesDoc = await getDoc(doc(firestore, `users/${user.uid}/preferences/settings`));

        if (preferencesDoc.exists()) {
          const firestorePrefs = preferencesDoc.data();
          const migrated = migrateLegacyPreferences(firestorePrefs);
          console.log('✅ Loaded preferences from Firestore:', migrated);

          setPreferences(migrated);
          applyThemeClasses(migrated.mode, migrated.baseColor);

          // Update localStorage with Firestore data (clean)
          const cleanMigrated = Object.fromEntries(
            Object.entries(migrated).filter(([key]) => key !== 'theme')
          );
          localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(cleanMigrated));

          // If we migrated, save back to Firestore
          if (firestorePrefs.theme && !firestorePrefs.mode) {
            console.log('💾 Saving migrated preferences to Firestore');
            await writeToFirestore(migrated);
          }
        } else {
          console.log('📝 No preferences found in Firestore, using defaults');
          // Save defaults to Firestore for new users
          await setDoc(doc(firestore, `users/${user.uid}/preferences/settings`), {
            ...DEFAULT_USER_PREFERENCES,
            updatedAt: new Date().toISOString(),
          });

          setPreferences(DEFAULT_USER_PREFERENCES);
          applyThemeClasses(DEFAULT_USER_PREFERENCES.mode, DEFAULT_USER_PREFERENCES.baseColor);
          localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(DEFAULT_USER_PREFERENCES));
        }
      } catch (error) {
        console.error('❌ Failed to load preferences from Firestore:', error);
        // Keep using localStorage/defaults on error
      } finally {
        setLoading(false);
      }
    };

    void loadPreferences();
  }, [user, writeToFirestore]);

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      const newPreferences: UserPreferences = {
        ...preferences,
        ...updates,
      };

      // 1. Update memory state immediately
      setPreferences(newPreferences);

      // 2. Update localStorage immediately (ensure no theme property)
      const cleanPrefs = Object.fromEntries(
        Object.entries(newPreferences).filter(([key]) => key !== 'theme')
      );
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(cleanPrefs));

      // 3. Apply theme if mode or baseColor changed
      if (
        (updates.mode && updates.mode !== preferences.mode) ||
        (updates.baseColor && updates.baseColor !== preferences.baseColor)
      ) {
        const mode = updates.mode ?? preferences.mode;
        const baseColor = updates.baseColor ?? preferences.baseColor;
        applyThemeClasses(mode, baseColor);
      }

      // 4. Debounce Firestore write
      if (pendingWrite) {
        clearTimeout(pendingWrite);
      }

      const timeoutId = setTimeout(() => {
        void writeToFirestore(newPreferences);
        setPendingWrite(null);
      }, DEBOUNCE_DELAY);

      setPendingWrite(timeoutId);
    },
    [preferences, pendingWrite, writeToFirestore]
  );

  const resetPreferences = useCallback(async () => {
    setPreferences(DEFAULT_USER_PREFERENCES);
    applyThemeClasses(DEFAULT_USER_PREFERENCES.mode, DEFAULT_USER_PREFERENCES.baseColor);
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(DEFAULT_USER_PREFERENCES));

    if (pendingWrite) {
      clearTimeout(pendingWrite);
    }

    await writeToFirestore(DEFAULT_USER_PREFERENCES);
  }, [pendingWrite, writeToFirestore]);

  // Cleanup pending writes on unmount
  useEffect(() => {
    return () => {
      if (pendingWrite) {
        clearTimeout(pendingWrite);
      }
    };
  }, [pendingWrite]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      loading,
      updatePreferences,
      resetPreferences,
    }),
    [preferences, loading, updatePreferences, resetPreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
};
