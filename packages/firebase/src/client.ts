import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

let firebaseApp: FirebaseApp | undefined;

export const initFirebaseClient = (options: FirebaseOptions): FirebaseApp => {
  if (!firebaseApp) {
    firebaseApp = initializeApp(options);
  }

  return firebaseApp;
};

const requireApp = (): FirebaseApp => {
  if (firebaseApp) {
    return firebaseApp;
  }

  const existing = getApps()[0];
  if (!existing) {
    throw new Error('Firebase app has not been initialized. Call initFirebaseClient first.');
  }

  firebaseApp = existing;
  return firebaseApp;
};

// Cache Firebase service instances at module level to reduce redundant calls
let cachedAuth: Auth | undefined;
let cachedFirestore: Firestore | undefined;
let cachedFunctions: Functions | undefined;

export const getClientAuth = (): Auth => {
  if (cachedAuth) {
    return cachedAuth;
  }
  const app = requireApp();
  cachedAuth = getAuth(app);
  return cachedAuth;
};

export const getClientFirestore = (): Firestore => {
  if (cachedFirestore) {
    return cachedFirestore;
  }
  const app = requireApp();
  cachedFirestore = getFirestore(app);
  return cachedFirestore;
};

export const getClientFunctions = (): Functions => {
  if (cachedFunctions) {
    return cachedFunctions;
  }
  const app = requireApp();
  cachedFunctions = getFunctions(app);
  return cachedFunctions;
};
