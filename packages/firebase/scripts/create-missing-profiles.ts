import path from 'node:path';

import dotenv from 'dotenv';
import { Timestamp } from 'firebase-admin/firestore';

import { getAdminAuth, getAdminFirestore, initFirebaseAdmin } from '../src/admin';

const envPath = path.resolve(process.cwd(), '..', '..', '.env');
dotenv.config({ path: envPath });

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required.`);
  }
  return value;
};

const main = async () => {
  const projectId = required('FIREBASE_PROJECT_ID');
  const clientEmail = required('FIREBASE_CLIENT_EMAIL');
  const privateKey = required('FIREBASE_PRIVATE_KEY');

  initFirebaseAdmin({ projectId, clientEmail, privateKey });

  const auth = getAdminAuth();
  const db = getAdminFirestore();

  console.log('🔍 Checking for users with missing Firestore profiles...\n');

  // Get all auth users
  const authUsers = await auth.listUsers();

  let createdCount = 0;
  let skippedCount = 0;

  for (const authUser of authUsers.users) {
    const uid = authUser.uid;
    const email = authUser.email || 'unknown';
    const displayName = authUser.displayName || email.split('@')[0];
    const customClaims = authUser.customClaims || {};
    const role = customClaims.role || null;

    console.log(`Checking user: ${email} (${uid})`);

    // Check if Firestore profile exists
    const profileRef = db.doc(`users/${uid}`);
    const profileSnap = await profileRef.get();

    if (profileSnap.exists) {
      console.log(`  ✓ Profile already exists - skipping\n`);
      skippedCount++;
      continue;
    }

    // Profile is missing - create it
    console.log(`  ✗ Profile missing - creating...`);

    if (!role || (role !== 'owner' && role !== 'teamMember')) {
      console.log(`  ⚠️  Warning: User has invalid role "${role}" - defaulting to "teamMember"`);
    }

    const profileData = {
      displayName,
      role: role || 'teamMember',
      createdAt: Timestamp.now(),
    };

    await profileRef.set(profileData);
    console.log(`  ✅ Created profile for ${email}`);
    console.log(`     Role: ${profileData.role}`);
    console.log(`     Display Name: ${profileData.displayName}\n`);

    createdCount++;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Summary:');
  console.log(`   Total users checked: ${authUsers.users.length}`);
  console.log(`   Profiles created: ${createdCount}`);
  console.log(`   Profiles already existed: ${skippedCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (createdCount > 0) {
    console.log('🎉 Missing profiles have been created! You should now be able to log in.');
  } else {
    console.log('ℹ️  All users already have profiles.');
  }
};

main().catch((error) => {
  console.error('❌ Failed to create profiles');
  console.error(error);
  process.exitCode = 1;
});
