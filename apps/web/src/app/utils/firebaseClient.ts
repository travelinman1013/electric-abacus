import type { FirebaseOptions } from 'firebase/app';

import { initFirebaseClient } from '@lightning/firebase';

let initialized = false;

// Debug environment variables
console.log('🌍 Raw environment variables:', {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? '***present***' : 'MISSING',
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID ? '***present***' : 'MISSING',
  VITE_FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
});

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
  console.log('🚀 initializeFirebaseClient called');

  if (initialized) {
    console.log('✅ Firebase client already initialized');
    return;
  }

  console.log('🔧 Firebase config:', {
    apiKey: firebaseConfig.apiKey ? '***present***' : 'MISSING',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId ? '***present***' : 'MISSING',
    measurementId: firebaseConfig.measurementId
  });

  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length) {
    console.error(
      '❌ Firebase config is missing values:', missingKeys.join(', ')
    );
    console.error('Check your environment configuration in .env file');
  } else {
    console.log('✅ All Firebase config values present');
  }

  try {
    console.log('🔥 Initializing Firebase client...');
    initFirebaseClient(firebaseConfig);
    console.log('✅ Firebase client initialized successfully');
    initialized = true;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase client:', error);
    throw error;
  }
};
