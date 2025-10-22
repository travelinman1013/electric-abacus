import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

/**
 * Validation schema for business details (server-side)
 * Duplicated from domain package to avoid import issues in Cloud Functions
 */
const businessDetailsSchema = z.object({
  name: z
    .string()
    .min(1, 'Business name is required')
    .max(100, 'Business name must be 100 characters or less')
    .trim(),
  industry: z.enum(
    ['restaurant', 'cafe', 'food-truck', 'bakery', 'bar', 'catering', 'other'],
    {
      errorMap: () => ({ message: 'Please select a valid industry' })
    }
  ),
  teamSize: z.enum(['1-5', '6-10', '11-25', '26-50', '50+'], {
    errorMap: () => ({ message: 'Please select a valid team size' })
  })
});

interface BusinessDetails {
  name: string;
  industry: string;
  teamSize: string;
}

interface SetupBusinessAccountContext {
  auth?: {
    uid: string;
    token?: Record<string, unknown>;
  };
}

/**
 * Sets up a new business account for a user.
 * This function is idempotent and handles:
 * - Validation of business details
 * - Checking if user already has a business
 * - Creating business document
 * - Creating user profile document
 * - Setting custom claims (businessId and role)
 *
 * @param data - Business details from the signup form
 * @param context - Firebase Auth context
 * @returns Success response with businessId
 */
export async function setupNewBusinessAccount(
  data: unknown,
  context: SetupBusinessAccountContext
): Promise<{ success: boolean; businessId: string; message: string }> {
  // 1. Authentication check
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to create a business');
  }

  const userId = context.auth.uid;
  console.log(`📝 Setting up business for user: ${userId}`);

  // 2. Server-side validation
  const validationResult = businessDetailsSchema.safeParse(data);
  if (!validationResult.success) {
    const errorMessage = validationResult.error.errors.map((e) => e.message).join(', ');
    console.error(`❌ Validation failed for user ${userId}:`, errorMessage);
    throw new HttpsError('invalid-argument', `Invalid business details: ${errorMessage}`);
  }

  const businessDetails: BusinessDetails = validationResult.data;

  // 3. Idempotency checks
  const db = admin.firestore();
  const auth = admin.auth();

  try {
    // Check if user already has custom claims with businessId
    const userRecord = await auth.getUser(userId);
    if (userRecord.customClaims?.businessId) {
      const existingBusinessId = userRecord.customClaims.businessId as string;
      console.warn(
        `⚠️ User ${userId} already has businessId in custom claims: ${existingBusinessId}`
      );
      throw new HttpsError('already-exists', 'User already has a business account', {
        businessId: existingBusinessId
      });
    }

    // Double-check UserProfile doesn't exist
    const userProfileRef = db.collection('users').doc(userId);
    const existingProfile = await userProfileRef.get();
    if (existingProfile.exists) {
      console.warn(`⚠️ User ${userId} already has a profile document`);
      throw new HttpsError(
        'already-exists',
        'User profile already exists. Please contact support.'
      );
    }

    // 4. Atomic transaction: Create Business + UserProfile
    const businessRef = db.collection('businesses').doc();
    const businessId = businessRef.id;

    console.log(`🏢 Creating business ${businessId} for user ${userId}`);

    await db.runTransaction(async (transaction) => {
      // Create Business document
      transaction.set(businessRef, {
        name: businessDetails.name,
        industry: businessDetails.industry,
        teamSize: businessDetails.teamSize,
        ownerId: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create UserProfile document
      transaction.set(userProfileRef, {
        displayName: userRecord.displayName || userRecord.email || 'Unknown User',
        email: userRecord.email || null,
        role: 'owner',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        businesses: {
          [businessId]: {
            businessId,
            role: 'owner',
            joinedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        }
      });
    });

    console.log(`✅ Transaction completed: Business and UserProfile created`);

    // 5. Set custom claims (after transaction succeeds)
    await auth.setCustomUserClaims(userId, {
      businessId,
      role: 'owner'
    });

    console.log(`✅ Custom claims set for user ${userId}: businessId=${businessId}, role=owner`);

    return {
      success: true,
      businessId,
      message: 'Business account created successfully'
    };
  } catch (error) {
    // Re-throw HttpsError as-is
    if (error instanceof HttpsError) {
      throw error;
    }

    // Log and wrap unexpected errors
    console.error('❌ Unexpected error in setupNewBusinessAccount:', error);
    throw new HttpsError(
      'internal',
      'Failed to create business account. Please try again or contact support.',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}
