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
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import type { BusinessDetails, UserProfile, UserRole } from '@domain/costing';
import { getClientAuth, getClientFirestore, getClientFunctions } from '@electric/firebase';

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, businessDetails: BusinessDetails) => Promise<void>;
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

/**
 * Polls for custom claims (businessId and role) with exponential backoff.
 * This handles the eventual consistency of Firebase Auth custom claims.
 *
 * @param user - The Firebase user to check claims for
 * @param maxAttempts - Maximum number of polling attempts (default: 10)
 * @param initialDelay - Initial delay in milliseconds (default: 500ms)
 * @returns Promise<boolean> - True if claims are available, false if timeout
 */
async function waitForCustomClaims(
  user: FirebaseUser,
  maxAttempts = 10,
  initialDelay = 500
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Force refresh the token to get latest claims
    const tokenResult = await user.getIdTokenResult(true);

    if (tokenResult.claims.businessId && tokenResult.claims.role) {
      console.log(`✅ Claims available after ${attempt + 1} attempt(s)`, {
        businessId: tokenResult.claims.businessId,
        role: tokenResult.claims.role
      });
      return true;
    }

    // Exponential backoff: 500ms, 1s, 2s, 4s, 8s, 16s...
    const delay = initialDelay * Math.pow(2, attempt);
    console.log(`⏳ Waiting for claims... attempt ${attempt + 1}/${maxAttempts} (${delay}ms delay)`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  console.error('❌ Claims never appeared after maximum attempts', {
    maxAttempts,
    totalWaitTime: initialDelay * (Math.pow(2, maxAttempts) - 1)
  });
  return false;
}

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
    } catch (error) {
      console.error('🔐 signInWithEmailAndPassword failed:', error);
      throw error;
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, businessDetails: BusinessDetails) => {
      console.log('✍️ signUp called with email:', email);
      const auth = getClientAuth();
      const functions = getClientFunctions();

      try {
        // 1. Create Firebase Auth user
        console.log('✍️ Creating Firebase Auth user...');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('✅ Firebase Auth user created:', { uid: user.uid, email: user.email });

        // 2. Call Cloud Function to set up business
        console.log('🏢 Calling setupNewBusinessAccountCallable...');
        const setupFunction = httpsCallable<BusinessDetails, { success: boolean; businessId: string; message: string }>(
          functions,
          'setupNewBusinessAccountCallable'
        );
        const result = await setupFunction(businessDetails);
        console.log('✅ Business setup result:', result.data);

        // 3. Poll for custom claims with exponential backoff
        console.log('🔄 Waiting for custom claims to propagate...');
        const claimsAvailable = await waitForCustomClaims(user);

        if (!claimsAvailable) {
          throw new Error(
            'Account setup is taking longer than expected. Please try signing in again in a few moments.'
          );
        }

        // 4. Auth state will update automatically via onAuthStateChanged
        console.log('✅ Signup complete, auth state will update automatically...');
      } catch (error: unknown) {
        console.error('❌ Signup error:', error);

        // Enhanced error handling
        const firebaseError = error as { code?: string; message?: string };
        if (firebaseError.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered. Please sign in instead.');
        } else if (firebaseError.code === 'auth/weak-password') {
          throw new Error('Password is too weak. Please use a stronger password.');
        } else if (firebaseError.code === 'auth/invalid-email') {
          throw new Error('Please enter a valid email address.');
        } else if (firebaseError.code === 'functions/already-exists') {
          throw new Error('Account setup already completed. Please sign in.');
        } else if (firebaseError.code === 'functions/invalid-argument') {
          throw new Error('Invalid business details. Please check your information.');
        } else {
          throw new Error(
            firebaseError.message || 'Failed to create account. Please try again.'
          );
        }
      }
    },
    []
  );

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
      signUp,
      signOut: signOutUser,
      hasRole
    }),
    [hasRole, signIn, signUp, signOutUser, state.loading, state.profile, state.user]
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
