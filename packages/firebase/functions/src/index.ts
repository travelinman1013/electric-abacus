import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { setupNewBusinessAccount } from './auth/setupNewBusinessAccount';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Callable Cloud Function for setting up a new business account.
 * This is the preferred method for user onboarding via the signup wizard.
 *
 * Called by the frontend after user authentication is created.
 * Handles business creation, user profile creation, and custom claims setup.
 */
export const setupNewBusinessAccountCallable = onCall(
  { region: 'us-central1' },
  async (request) => {
    return setupNewBusinessAccount(request.data, request);
  }
);
