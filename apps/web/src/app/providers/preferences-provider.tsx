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
import type { UserPreferences } from '@domain/preferences';
import { getClientFirestore } from '@electric/firebase';
import { useAuthContext } from './auth-provider';
import { applyTheme } from '../../constants/themes';

// Default preferences defined locally to avoid module resolution issues
const DEFAULT_USER_PREFERENCES: UserPreferences = {
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
 */
export const PreferencesProvider = ({ children }: PreferencesProviderProps) => {
  const { user } = useAuthContext();
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    // Try to load from localStorage for instant initial render
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as UserPreferences;
          // Apply theme immediately on load
          applyTheme(parsed.theme);
          return parsed;
        }
      } catch (error) {
        console.warn('Failed to load preferences from localStorage:', error);
      }
    }
    // Fallback to default and apply default theme
    applyTheme(DEFAULT_USER_PREFERENCES.theme);
    return DEFAULT_USER_PREFERENCES;
  });
  const [loading, setLoading] = useState(true);
  const [pendingWrite, setPendingWrite] = useState<NodeJS.Timeout | null>(null);

  // Load preferences from Firestore on auth
  useEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_USER_PREFERENCES);
      applyTheme(DEFAULT_USER_PREFERENCES.theme);
      setLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const firestore = getClientFirestore();
        const preferencesDoc = await getDoc(doc(firestore, `users/${user.uid}/preferences/settings`));

        if (preferencesDoc.exists()) {
          const firestorePrefs = preferencesDoc.data() as UserPreferences;
          console.log('✅ Loaded preferences from Firestore:', firestorePrefs);

          setPreferences(firestorePrefs);
          applyTheme(firestorePrefs.theme);

          // Update localStorage with Firestore data
          localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(firestorePrefs));
        } else {
          console.log('📝 No preferences found in Firestore, using defaults');
          // Save defaults to Firestore for new users
          const firestore = getClientFirestore();
          await setDoc(doc(firestore, `users/${user.uid}/preferences/settings`), {
            ...DEFAULT_USER_PREFERENCES,
            updatedAt: new Date().toISOString(),
          });

          setPreferences(DEFAULT_USER_PREFERENCES);
          applyTheme(DEFAULT_USER_PREFERENCES.theme);
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
  }, [user]);

  // Debounced Firestore write
  const writeToFirestore = useCallback(
    async (prefs: UserPreferences) => {
      if (!user) return;

      try {
        const firestore = getClientFirestore();
        await setDoc(doc(firestore, `users/${user.uid}/preferences/settings`), {
          ...prefs,
          updatedAt: new Date().toISOString(),
        });
        console.log('✅ Preferences saved to Firestore');
      } catch (error) {
        console.error('❌ Failed to save preferences to Firestore:', error);
      }
    },
    [user]
  );

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      const newPreferences: UserPreferences = {
        ...preferences,
        ...updates,
      };

      // 1. Update memory state immediately
      setPreferences(newPreferences);

      // 2. Update localStorage immediately
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(newPreferences));

      // 3. Apply theme if it changed
      if (updates.theme && updates.theme !== preferences.theme) {
        applyTheme(updates.theme);
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
    applyTheme(DEFAULT_USER_PREFERENCES.theme);
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
