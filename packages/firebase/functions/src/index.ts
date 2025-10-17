import * as admin from 'firebase-admin';
import { onUserCreated } from 'firebase-functions/v2/identity';
import { handleUserCreate } from './auth/onUserCreate';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Cloud Function triggered when a new user is created.
 * Creates a business for the user and sets custom claims.
 *
 * Note: Using onUserCreated instead of beforeUserCreated because
 * blocking functions require Google Cloud Identity Platform (GCIP).
 * The user will need to refresh their token after signup to get custom claims.
 */
export const onUserCreate = onUserCreated(async (event) => {
  await handleUserCreate(event.data);
});
