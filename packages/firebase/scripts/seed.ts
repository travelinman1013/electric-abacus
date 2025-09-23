import path from 'node:path';

import dotenv from 'dotenv';
import { Timestamp } from 'firebase-admin/firestore';

import { getAdminAuth, getAdminFirestore, initFirebaseAdmin } from '../src/admin';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

type SeedUserInput = {
  email: string;
  displayName: string;
  password: string;
  role: 'owner' | 'teamMember';
};

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required for seeding.`);
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

  const users: SeedUserInput[] = [
    {
      email: 'regan.owner@tacocasa.test',
      displayName: 'Regan Owner',
      password: 'OwnerPass123!',
      role: 'owner'
    },
    {
      email: 'taylor.team@tacocasa.test',
      displayName: 'Taylor Team Member',
      password: 'TeamPass123!',
      role: 'teamMember'
    }
  ];

  const userIds: Record<string, string> = {};

  for (const user of users) {
    const existing = await auth
      .getUserByEmail(user.email)
      .catch(() => undefined);

    const uid = existing?.uid
      ?? (
        await auth.createUser({
          email: user.email,
          displayName: user.displayName,
          password: user.password
        })
      ).uid;

    userIds[user.role] = uid;

    await db.doc(`users/${uid}`).set({
      displayName: user.displayName,
      role: user.role,
      createdAt: Timestamp.now()
    });
  }

  const ingredients = [
    {
      id: 'seasoned-beef',
      name: 'Seasoned Beef',
      unitOfMeasure: 'lb',
      unitsPerCase: 20,
      casePrice: 120,
      unitCost: Number((120 / 20).toFixed(4))
    },
    {
      id: 'cheddar-cheese',
      name: 'Cheddar Cheese',
      unitOfMeasure: 'lb',
      unitsPerCase: 10,
      casePrice: 58,
      unitCost: Number((58 / 10).toFixed(4))
    },
    {
      id: 'flour-tortillas',
      name: 'Flour Tortillas',
      unitOfMeasure: 'case',
      unitsPerCase: 288,
      casePrice: 75,
      unitCost: Number((75 / 288).toFixed(4))
    }
  ];

  for (const ingredient of ingredients) {
    await db.doc(`ingredients/${ingredient.id}`).set({
      name: ingredient.name,
      unitOfMeasure: ingredient.unitOfMeasure,
      unitsPerCase: ingredient.unitsPerCase,
      casePrice: ingredient.casePrice,
      unitCost: ingredient.unitCost,
      isActive: true,
      createdAt: Timestamp.now()
    });

    const versionId = `${new Date().getFullYear()}-v1`;
    await db.doc(`ingredients/${ingredient.id}/versions/${versionId}`).set({
      casePrice: ingredient.casePrice,
      unitsPerCase: ingredient.unitsPerCase,
      unitCost: ingredient.unitCost,
      effectiveFrom: Timestamp.now(),
      effectiveTo: null
    });
  }

  const weekId = '2025-W39';
  await db.doc(`weeks/${weekId}`).set({
    status: 'draft',
    createdAt: Timestamp.now(),
    finalizedAt: null,
    finalizedBy: null
  });

  await db.doc(`weeks/${weekId}/sales/daily`).set({
    mon: 0,
    tue: 0,
    wed: 0,
    thu: 0,
    fri: 0,
    sat: 0,
    sun: 0
  });

  for (const ingredient of ingredients) {
    await db.doc(`weeks/${weekId}/inventory/${ingredient.id}`).set({
      begin: 0,
      received: 0,
      end: 0
    });
  }

  console.log('Seed data created successfully.');
  console.log('Owner login:', users.find((user) => user.role === 'owner')?.email);
  console.log('Team member login:', users.find((user) => user.role === 'teamMember')?.email);
};

main().catch((error) => {
  console.error('Failed to seed Firebase project');
  console.error(error);
  process.exitCode = 1;
});
