import path from 'node:path';

import dotenv from 'dotenv';
import { Timestamp } from 'firebase-admin/firestore';

import { getAdminAuth, getAdminFirestore, initFirebaseAdmin } from '../src/admin';

const envPath = path.resolve(process.cwd(), '..', '..', '.env');
dotenv.config({ path: envPath });

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required for migration.`);
  }
  return value;
};

interface MigrationStats {
  usersProcessed: number;
  businessesCreated: number;
  ingredientsMigrated: number;
  ingredientVersionsMigrated: number;
  menuItemsMigrated: number;
  recipesMigrated: number;
  weeksMigrated: number;
  salesMigrated: number;
  inventoryMigrated: number;
  costSnapshotsMigrated: number;
  reportsMigrated: number;
}

const DEFAULT_BUSINESS_ID = 'default-business';

const main = async () => {
  const projectId = required('FIREBASE_PROJECT_ID');
  const clientEmail = required('FIREBASE_CLIENT_EMAIL');
  const privateKey = required('FIREBASE_PRIVATE_KEY');

  initFirebaseAdmin({ projectId, clientEmail, privateKey });

  const auth = getAdminAuth();
  const db = getAdminFirestore();

  console.log('🚀 Starting multi-tenant migration...');
  console.log(`📊 Target business ID: ${DEFAULT_BUSINESS_ID}\n`);

  const stats: MigrationStats = {
    usersProcessed: 0,
    businessesCreated: 0,
    ingredientsMigrated: 0,
    ingredientVersionsMigrated: 0,
    menuItemsMigrated: 0,
    recipesMigrated: 0,
    weeksMigrated: 0,
    salesMigrated: 0,
    inventoryMigrated: 0,
    costSnapshotsMigrated: 0,
    reportsMigrated: 0,
  };

  // ===== STEP 1: Create default business =====
  console.log('🏢 Step 1: Creating default business...');
  await db.doc(`businesses/${DEFAULT_BUSINESS_ID}`).set({
    name: 'Default Business',
    createdAt: Timestamp.now(),
  });
  stats.businessesCreated++;
  console.log(`✅ Created business: ${DEFAULT_BUSINESS_ID}\n`);

  // ===== STEP 2: Process users and set custom claims =====
  console.log('👥 Step 2: Processing users and setting custom claims...');
  const usersSnapshot = await db.collection('users').get();

  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();
    const role = userData.role || 'owner';

    // Set custom claims with businessId and role
    await auth.setCustomUserClaims(uid, {
      businessId: DEFAULT_BUSINESS_ID,
      role: role,
    });

    // Update user profile with businesses map
    await db.doc(`users/${uid}`).update({
      businesses: {
        [DEFAULT_BUSINESS_ID]: {
          businessId: DEFAULT_BUSINESS_ID,
          role: role,
          joinedAt: userData.createdAt || Timestamp.now(),
        },
      },
      updatedAt: Timestamp.now(),
    });

    stats.usersProcessed++;
    console.log(`  ✓ Processed user ${uid} (${role})`);
  }
  console.log(`✅ Processed ${stats.usersProcessed} users\n`);

  // ===== STEP 3: Migrate ingredients =====
  console.log('🥫 Step 3: Migrating ingredients...');
  const ingredientsSnapshot = await db.collection('ingredients').get();

  for (const ingredientDoc of ingredientsSnapshot.docs) {
    const ingredientId = ingredientDoc.id;
    const ingredientData = ingredientDoc.data();

    // Copy to new nested path
    await db.doc(`businesses/${DEFAULT_BUSINESS_ID}/ingredients/${ingredientId}`).set(ingredientData);
    stats.ingredientsMigrated++;

    // Migrate versions subcollection
    const versionsSnapshot = await db.collection(`ingredients/${ingredientId}/versions`).get();
    for (const versionDoc of versionsSnapshot.docs) {
      const versionId = versionDoc.id;
      const versionData = versionDoc.data();
      await db.doc(`businesses/${DEFAULT_BUSINESS_ID}/ingredients/${ingredientId}/versions/${versionId}`).set(versionData);
      stats.ingredientVersionsMigrated++;
    }

    console.log(`  ✓ Migrated ingredient ${ingredientId} with ${versionsSnapshot.size} versions`);
  }
  console.log(`✅ Migrated ${stats.ingredientsMigrated} ingredients with ${stats.ingredientVersionsMigrated} versions\n`);

  // ===== STEP 4: Migrate menu items =====
  console.log('🌮 Step 4: Migrating menu items...');
  const menuItemsSnapshot = await db.collection('menuItems').get();

  for (const menuItemDoc of menuItemsSnapshot.docs) {
    const menuItemId = menuItemDoc.id;
    const menuItemData = menuItemDoc.data();

    // Copy to new nested path
    await db.doc(`businesses/${DEFAULT_BUSINESS_ID}/menuItems/${menuItemId}`).set(menuItemData);
    stats.menuItemsMigrated++;

    // Migrate recipes subcollection
    const recipesSnapshot = await db.collection(`menuItems/${menuItemId}/recipes`).get();
    for (const recipeDoc of recipesSnapshot.docs) {
      const recipeId = recipeDoc.id;
      const recipeData = recipeDoc.data();
      await db.doc(`businesses/${DEFAULT_BUSINESS_ID}/menuItems/${menuItemId}/recipes/${recipeId}`).set(recipeData);
      stats.recipesMigrated++;
    }

    console.log(`  ✓ Migrated menu item ${menuItemId} with ${recipesSnapshot.size} recipes`);
  }
  console.log(`✅ Migrated ${stats.menuItemsMigrated} menu items with ${stats.recipesMigrated} recipes\n`);

  // ===== STEP 5: Migrate weeks =====
  console.log('📅 Step 5: Migrating weeks...');
  const weeksSnapshot = await db.collection('weeks').get();

  for (const weekDoc of weeksSnapshot.docs) {
    const weekId = weekDoc.id;
    const weekData = weekDoc.data();

    // Copy to new nested path
    await db.doc(`businesses/${DEFAULT_BUSINESS_ID}/weeks/${weekId}`).set(weekData);
    stats.weeksMigrated++;

    // Migrate sales subcollection
    const salesSnapshot = await db.collection(`weeks/${weekId}/sales`).get();
    for (const salesDoc of salesSnapshot.docs) {
      const salesId = salesDoc.id;
      const salesData = salesDoc.data();
      await db.doc(`businesses/${DEFAULT_BUSINESS_ID}/weeks/${weekId}/sales/${salesId}`).set(salesData);
      stats.salesMigrated++;
    }

    // Migrate inventory subcollection
    const inventorySnapshot = await db.collection(`weeks/${weekId}/inventory`).get();
    for (const inventoryDoc of inventorySnapshot.docs) {
      const inventoryId = inventoryDoc.id;
      const inventoryData = inventoryDoc.data();
      await db.doc(`businesses/${DEFAULT_BUSINESS_ID}/weeks/${weekId}/inventory/${inventoryId}`).set(inventoryData);
      stats.inventoryMigrated++;
    }

    // Migrate costSnapshot subcollection
    const costSnapshotSnapshot = await db.collection(`weeks/${weekId}/costSnapshot`).get();
    for (const costSnapshotDoc of costSnapshotSnapshot.docs) {
      const costSnapshotId = costSnapshotDoc.id;
      const costSnapshotData = costSnapshotDoc.data();
      await db.doc(`businesses/${DEFAULT_BUSINESS_ID}/weeks/${weekId}/costSnapshot/${costSnapshotId}`).set(costSnapshotData);
      stats.costSnapshotsMigrated++;
    }

    // Migrate report subcollection
    const reportSnapshot = await db.collection(`weeks/${weekId}/report`).get();
    for (const reportDoc of reportSnapshot.docs) {
      const reportId = reportDoc.id;
      const reportData = reportDoc.data();
      await db.doc(`businesses/${DEFAULT_BUSINESS_ID}/weeks/${weekId}/report/${reportId}`).set(reportData);
      stats.reportsMigrated++;
    }

    console.log(`  ✓ Migrated week ${weekId} with ${salesSnapshot.size} sales, ${inventorySnapshot.size} inventory, ${costSnapshotSnapshot.size} cost snapshots, ${reportSnapshot.size} reports`);
  }
  console.log(`✅ Migrated ${stats.weeksMigrated} weeks\n`);

  // ===== SUMMARY =====
  console.log('🎉 Migration completed successfully!\n');
  console.log('📊 Migration Summary:');
  console.log(`  - Users processed: ${stats.usersProcessed}`);
  console.log(`  - Businesses created: ${stats.businessesCreated}`);
  console.log(`  - Ingredients migrated: ${stats.ingredientsMigrated}`);
  console.log(`  - Ingredient versions migrated: ${stats.ingredientVersionsMigrated}`);
  console.log(`  - Menu items migrated: ${stats.menuItemsMigrated}`);
  console.log(`  - Recipes migrated: ${stats.recipesMigrated}`);
  console.log(`  - Weeks migrated: ${stats.weeksMigrated}`);
  console.log(`  - Sales records migrated: ${stats.salesMigrated}`);
  console.log(`  - Inventory records migrated: ${stats.inventoryMigrated}`);
  console.log(`  - Cost snapshots migrated: ${stats.costSnapshotsMigrated}`);
  console.log(`  - Reports migrated: ${stats.reportsMigrated}\n`);

  console.log('⚠️  IMPORTANT: Next Steps');
  console.log('  1. Deploy new Firestore security rules: firebase deploy --only firestore:rules');
  console.log('  2. Deploy Cloud Functions: firebase deploy --only functions');
  console.log('  3. Test with existing users (they need to refresh their auth tokens)');
  console.log('  4. Once verified, delete old flat collections (manually for safety)\n');
};

main().catch((error) => {
  console.error('❌ Migration failed');
  console.error(error);
  process.exitCode = 1;
});
