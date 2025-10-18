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

export const getClientAuth = (): Auth => {
  console.log('🔐 getClientAuth called');
  const app = requireApp();
  const auth = getAuth(app);
  console.log('🔐 Auth instance created:', !!auth);
  return auth;
};

export const getClientFirestore = (): Firestore => {
  console.log('🔥 getClientFirestore called');
  const app = requireApp();
  const firestore = getFirestore(app);
  console.log('🔥 Firestore instance created:', !!firestore);
  return firestore;
};

export const getClientFunctions = (): Functions => {
  console.log('⚡ getClientFunctions called');
  const app = requireApp();
  const functions = getFunctions(app);
  console.log('⚡ Functions instance created:', !!functions);
  return functions;
};
