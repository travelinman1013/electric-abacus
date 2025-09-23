import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import type { UserProfile, UserRole } from '@domain/costing';
import { getClientAuth, getClientFirestore } from '@firebase/services';

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

type AuthState = {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true });

  useEffect(() => {
    const auth = getClientAuth();
    const firestore = getClientFirestore();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ user: null, profile: null, loading: false });
        return;
      }

      try {
        const profileSnapshot = await getDoc(doc(firestore, `users/${firebaseUser.uid}`));
        const profile = profileSnapshot.exists()
          ? ({
              uid: firebaseUser.uid,
              ...profileSnapshot.data()
            } as UserProfile)
          : null;

        setState({ user: firebaseUser, profile, loading: false });
      } catch (error) {
        console.error('Failed to load user profile', error);
        setState({ user: firebaseUser, profile: null, loading: false });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getClientAuth();
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOutUser = useCallback(async () => {
    const auth = getClientAuth();
    await signOut(auth);
  }, []);

  const hasRole = useCallback(
    (role: UserRole) => state.profile?.role === role,
    [state.profile?.role]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      profile: state.profile,
      loading: state.loading,
      signIn,
      signOut: signOutUser,
      hasRole
    }),
    [hasRole, signIn, signOutUser, state.loading, state.profile, state.user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
