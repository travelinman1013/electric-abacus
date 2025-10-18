#!/usr/bin/env ts-node

/**
 * Backfill Custom Claims Script
 *
 * This script sets custom claims (businessId and role) for all existing users
 * who were created before the multi-tenant onboarding Cloud Function was deployed.
 *
 * Run with: npx ts-node packages/firebase/scripts/backfill-custom-claims.ts
 */

import path from 'node:path';
import dotenv from 'dotenv';
import type { Timestamp } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminFirestore, initFirebaseAdmin } from '../src/admin';

// Load environment variables
const envPath = path.resolve(process.cwd(), '..', '..', '.env');
dotenv.config({ path: envPath });

// Initialize Firebase Admin with credentials from environment
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    'Missing Firebase Admin credentials. Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in .env'
  );
}

initFirebaseAdmin({ projectId, clientEmail, privateKey });

const db = getAdminFirestore();
const auth = getAdminAuth();

interface UserProfile {
  displayName: string;
  email?: string;
  role: 'owner' | 'teamMember';
  businesses: Record<string, {
    businessId: string;
    role: 'owner' | 'teamMember';
    joinedAt: Timestamp;
  }>;
  createdAt: Timestamp;
}

async function backfillCustomClaims() {
  console.log('🚀 Starting custom claims backfill...\n');

  try {
    // 1. Get all users from Firebase Auth
    console.log('📋 Fetching all users from Firebase Auth...');
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;
    console.log(`✅ Found ${users.length} users in Firebase Auth\n`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. Process each user
    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.email} (${user.uid})`);

      try {
        // Check if user already has custom claims
        if (user.customClaims?.businessId && user.customClaims?.role) {
          console.log(`   ⏭️  Already has custom claims:`, {
            businessId: user.customClaims.businessId,
            role: user.customClaims.role
          });
          skippedCount++;
          continue;
        }

        // Get user profile from Firestore
        const userProfileRef = db.collection('users').doc(user.uid);
        const userProfileSnapshot = await userProfileRef.get();

        if (!userProfileSnapshot.exists) {
          console.log(`   ⚠️  No user profile found in Firestore - skipping`);
          skippedCount++;
          continue;
        }

        const userProfile = userProfileSnapshot.data() as UserProfile;

        // Extract businessId and role from profile
        const businessesMap = userProfile.businesses || {};
        const businessIds = Object.keys(businessesMap);

        if (businessIds.length === 0) {
          console.log(`   ⚠️  No businesses found in profile - skipping`);
          skippedCount++;
          continue;
        }

        // Use the first business (for multi-business support in the future, we'd need UI to switch)
        const primaryBusinessId = businessIds[0];
        const businessInfo = businessesMap[primaryBusinessId];
        const role = businessInfo.role || userProfile.role || 'owner';

        console.log(`   🔧 Setting custom claims:`, {
          businessId: primaryBusinessId,
          role: role
        });

        // Set custom claims
        await auth.setCustomUserClaims(user.uid, {
          businessId: primaryBusinessId,
          role: role
        });

        console.log(`   ✅ Custom claims set successfully`);
        successCount++;

      } catch (error) {
        console.error(`   ❌ Error processing user ${user.uid}:`, error);
        errorCount++;
      }
    }

    // 3. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Backfill Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`⏭️  Skipped (already had claims or no profile): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total users processed: ${users.length}`);
    console.log('='.repeat(60));

    if (successCount > 0) {
      console.log('\n⚠️  IMPORTANT: Users must log out and log back in for new claims to take effect!');
      console.log('   Or they can refresh their auth token by calling user.getIdToken(true)');
    }

  } catch (error) {
    console.error('❌ Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillCustomClaims()
  .then(() => {
    console.log('\n✅ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  });
