import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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

export const getClientAuth = (): Auth => getAuth(requireApp());

export const getClientFirestore = (): Firestore => getFirestore(requireApp());
