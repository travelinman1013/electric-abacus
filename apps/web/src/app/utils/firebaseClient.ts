import type { FirebaseOptions } from 'firebase/app';

import { initFirebaseClient } from '@taco/firebase';

let initialized = false;

export const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const initializeFirebaseClient = () => {
  if (initialized) {
    return;
  }

  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length) {
    console.warn(
      `Firebase config is missing values: ${missingKeys.join(', ')}. Check your environment configuration.`
    );
  }

  initFirebaseClient(firebaseConfig);
  initialized = true;
};
