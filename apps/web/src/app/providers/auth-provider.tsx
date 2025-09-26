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
import { getClientAuth, getClientFirestore } from '@taco/firebase';

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
    console.log('🔥 Initializing auth state listener...');

    const auth = getClientAuth();
    const firestore = getClientFirestore();
    console.log('🔥 Firebase services initialized:', { auth: !!auth, firestore: !!firestore });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('👤 Auth state changed:', { user: firebaseUser?.email || 'null', uid: firebaseUser?.uid });

      if (!firebaseUser) {
        console.log('❌ No user logged in');
        setState({ user: null, profile: null, loading: false });
        return;
      }

      try {
        console.log('📄 Loading user profile for UID:', firebaseUser.uid);
        const profileSnapshot = await getDoc(doc(firestore, `users/${firebaseUser.uid}`));
        console.log('📄 Profile snapshot exists:', profileSnapshot.exists());

        const profile = profileSnapshot.exists()
          ? ({
              uid: firebaseUser.uid,
              ...profileSnapshot.data()
            } as UserProfile)
          : null;

        console.log('✅ User profile loaded:', profile);
        setState({ user: firebaseUser, profile, loading: false });
      } catch (error) {
        console.error('❌ Failed to load user profile', error);
        console.error('Profile loading error details:', {
          uid: firebaseUser.uid,
          errorCode: error instanceof Error ? error.message : 'Unknown error',
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        setState({ user: firebaseUser, profile: null, loading: false });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔐 signIn called with email:', email);
    const auth = getClientAuth();
    console.log('🔐 Got auth instance:', !!auth);

    try {
      console.log('🔐 Attempting signInWithEmailAndPassword...');
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('🔐 signInWithEmailAndPassword successful:', { uid: result.user?.uid, email: result.user?.email });
      return result;
    } catch (error) {
      console.error('🔐 signInWithEmailAndPassword failed:', error);
      throw error;
    }
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
