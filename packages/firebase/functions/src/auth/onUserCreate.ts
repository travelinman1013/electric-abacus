import * as admin from 'firebase-admin';
import type { AuthUserRecord } from 'firebase-functions/v2/identity';

/**
 * Handles new user creation by:
 * 1. Creating a new business for the user
 * 2. Setting custom claims (businessId and role)
 * 3. Creating a user profile document
 */
export async function handleUserCreate(user: AuthUserRecord): Promise<void> {
  const db = admin.firestore();
  const auth = admin.auth();

  try {
    // Generate a business ID
    const businessRef = db.collection('businesses').doc();
    const businessId = businessRef.id;

    // Create the business document with default values
    await businessRef.set({
      name: `${user.displayName || user.email}'s Business`,
      industry: 'other',
      teamSize: '1-5',
      createdAt: new Date(),
      ownerId: user.uid,
    });

    // Set custom claims for the user
    await auth.setCustomUserClaims(user.uid, {
      businessId,
      role: 'owner',
    });

    // Create user profile document
    await db.collection('users').doc(user.uid).set({
      displayName: user.displayName || user.email || 'Unknown User',
      email: user.email,
      role: 'owner',
      createdAt: new Date(),
      businesses: {
        [businessId]: {
          businessId,
          role: 'owner',
          joinedAt: new Date(),
        },
      },
    });

    console.log(`Successfully created business ${businessId} for user ${user.uid}`);
  } catch (error) {
    console.error('Error in handleUserCreate:', error);
    throw error;
  }
}
