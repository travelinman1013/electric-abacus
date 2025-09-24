import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

let adminApp: App | undefined;

export const initFirebaseAdmin = (config: FirebaseAdminConfig): App => {
  if (adminApp) {
    return adminApp;
  }

  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return existing;
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey.replace(/\\n/g, '\n'),
    }),
    projectId: config.projectId,
  });

  return adminApp;
};

export const getAdminFirestore = () => getFirestore(initOrThrow());

export const getAdminAuth = () => getAuth(initOrThrow());

const initOrThrow = (): App => {
  if (adminApp) {
    return adminApp;
  }

  const existing = getApps()[0];
  if (!existing) {
    throw new Error('Firebase admin app has not been initialized.');
  }

  adminApp = existing;
  return adminApp;
};
