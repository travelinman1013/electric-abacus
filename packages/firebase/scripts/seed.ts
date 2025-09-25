import path from 'node:path';

import dotenv from 'dotenv';
import { Timestamp } from 'firebase-admin/firestore';

import { getAdminAuth, getAdminFirestore, initFirebaseAdmin } from '../src/admin';

const envPath = path.resolve(process.cwd(), '..', '..', '.env');
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
      role: 'owner',
    },
    {
      email: 'taylor.team@tacocasa.test',
      displayName: 'Taylor Team Member',
      password: 'TeamPass123!',
      role: 'teamMember',
    },
  ];

  const userIds: Record<string, string> = {};

  for (const user of users) {
    const existing = await auth.getUserByEmail(user.email).catch(() => undefined);

    const uid =
      existing?.uid ??
      (
        await auth.createUser({
          email: user.email,
          displayName: user.displayName,
          password: user.password,
        })
      ).uid;

    userIds[user.role] = uid;

    await db.doc(`users/${uid}`).set({
      displayName: user.displayName,
      role: user.role,
      createdAt: Timestamp.now(),
    });
  }

  const ozToLb = (ounces: number) => Number((ounces / 16).toFixed(4));

  // Ingredient mix approximates the Taco Casa portion sheet so seeded data feels real.
  const ingredients = [
    {
      id: 'seasoned-beef',
      name: 'Seasoned Beef',
      unitOfMeasure: 'lb',
      unitsPerCase: 20,
      casePrice: 120,
      unitCost: Number((120 / 20).toFixed(4)),
    },
    {
      id: 'refried-beans',
      name: 'Refried Beans',
      unitOfMeasure: 'lb',
      unitsPerCase: 30,
      casePrice: 52,
      unitCost: Number((52 / 30).toFixed(4)),
    },
    {
      id: 'taco-shell-55',
      name: '5.5" Taco Shell',
      unitOfMeasure: 'each',
      unitsPerCase: 200,
      casePrice: 42,
      unitCost: Number((42 / 200).toFixed(4)),
    },
    {
      id: 'tostada-shell',
      name: 'Tostada Shell',
      unitOfMeasure: 'each',
      unitsPerCase: 150,
      casePrice: 45,
      unitCost: Number((45 / 150).toFixed(4)),
    },
    {
      id: 'flour-tortilla-10in',
      name: '10" Flour Tortilla',
      unitOfMeasure: 'each',
      unitsPerCase: 144,
      casePrice: 36,
      unitCost: Number((36 / 144).toFixed(4)),
    },
    {
      id: 'burger-bun',
      name: '4" Sandwich Bun',
      unitOfMeasure: 'each',
      unitsPerCase: 96,
      casePrice: 18,
      unitCost: Number((18 / 96).toFixed(4)),
    },
    {
      id: 'cheddar-cheese',
      name: 'Shredded Cheddar Cheese',
      unitOfMeasure: 'lb',
      unitsPerCase: 10,
      casePrice: 58,
      unitCost: Number((58 / 10).toFixed(4)),
    },
    {
      id: 'shredded-lettuce',
      name: 'Shredded Lettuce',
      unitOfMeasure: 'lb',
      unitsPerCase: 20,
      casePrice: 24,
      unitCost: Number((24 / 20).toFixed(4)),
    },
    {
      id: 'taco-sauce',
      name: 'Red Taco Sauce',
      unitOfMeasure: 'oz',
      unitsPerCase: 512,
      casePrice: 38,
      unitCost: Number((38 / 512).toFixed(4)),
    },
    {
      id: 'sour-cream',
      name: 'Sour Cream',
      unitOfMeasure: 'lb',
      unitsPerCase: 24,
      casePrice: 36,
      unitCost: Number((36 / 24).toFixed(4)),
    },
    {
      id: 'diced-tomatoes',
      name: 'Diced Tomatoes',
      unitOfMeasure: 'lb',
      unitsPerCase: 25,
      casePrice: 32,
      unitCost: Number((32 / 25).toFixed(4)),
    },
    {
      id: 'chili-base',
      name: 'Seasoned Chili',
      unitOfMeasure: 'lb',
      unitsPerCase: 30,
      casePrice: 55,
      unitCost: Number((55 / 30).toFixed(4)),
    },
    {
      id: 'diced-onions',
      name: 'Diced Onions',
      unitOfMeasure: 'lb',
      unitsPerCase: 20,
      casePrice: 18,
      unitCost: Number((18 / 20).toFixed(4)),
    },
    {
      id: 'corn-chips',
      name: 'Corn Chips',
      unitOfMeasure: 'each',
      unitsPerCase: 500,
      casePrice: 12,
      unitCost: Number((12 / 500).toFixed(4)),
    },
  ];

  for (const ingredient of ingredients) {
    await db.doc(`ingredients/${ingredient.id}`).set({
      name: ingredient.name,
      unitOfMeasure: ingredient.unitOfMeasure,
      unitsPerCase: ingredient.unitsPerCase,
      casePrice: ingredient.casePrice,
      unitCost: ingredient.unitCost,
      isActive: true,
      createdAt: Timestamp.now(),
    });

    const versionId = `${new Date().getFullYear()}-v1`;
    await db.doc(`ingredients/${ingredient.id}/versions/${versionId}`).set({
      casePrice: ingredient.casePrice,
      unitsPerCase: ingredient.unitsPerCase,
      unitCost: ingredient.unitCost,
      effectiveFrom: Timestamp.now(),
      effectiveTo: null,
    });
  }

  const menuItems = [
    {
      id: 'soft-taco',
      name: 'Soft Taco',
      sellingPrice: 2.29,
      recipes: [
        { ingredientId: 'taco-shell-55', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'seasoned-beef', quantity: ozToLb(1.5), unitOfMeasure: 'lb' },
        { ingredientId: 'shredded-lettuce', quantity: ozToLb(0.75), unitOfMeasure: 'lb' },
        { ingredientId: 'cheddar-cheese', quantity: ozToLb(0.25), unitOfMeasure: 'lb' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'taco-burger',
      name: 'Taco Burger',
      sellingPrice: 3.49,
      recipes: [
        { ingredientId: 'burger-bun', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'seasoned-beef', quantity: ozToLb(1.5), unitOfMeasure: 'lb' },
        { ingredientId: 'shredded-lettuce', quantity: ozToLb(1), unitOfMeasure: 'lb' },
        { ingredientId: 'cheddar-cheese', quantity: ozToLb(0.25), unitOfMeasure: 'lb' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'diced-tomatoes', quantity: ozToLb(0.5), unitOfMeasure: 'lb' },
      ],
    },
    {
      id: 'bean-tostada',
      name: 'Bean Tostada',
      sellingPrice: 3.29,
      recipes: [
        { ingredientId: 'tostada-shell', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: ozToLb(2.5), unitOfMeasure: 'lb' },
        { ingredientId: 'shredded-lettuce', quantity: ozToLb(1), unitOfMeasure: 'lb' },
        { ingredientId: 'cheddar-cheese', quantity: ozToLb(0.25), unitOfMeasure: 'lb' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'diced-tomatoes', quantity: ozToLb(0.5), unitOfMeasure: 'lb' },
      ],
    },
    {
      id: 'beef-tostada',
      name: 'Beef Tostada',
      sellingPrice: 3.79,
      recipes: [
        { ingredientId: 'tostada-shell', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: ozToLb(2.5), unitOfMeasure: 'lb' },
        { ingredientId: 'seasoned-beef', quantity: ozToLb(1), unitOfMeasure: 'lb' },
        { ingredientId: 'shredded-lettuce', quantity: ozToLb(1), unitOfMeasure: 'lb' },
        { ingredientId: 'cheddar-cheese', quantity: ozToLb(0.25), unitOfMeasure: 'lb' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'diced-tomatoes', quantity: ozToLb(0.5), unitOfMeasure: 'lb' },
      ],
    },
    {
      id: 'refried-beans-side',
      name: 'Refried Beans',
      sellingPrice: 2.19,
      recipes: [
        { ingredientId: 'refried-beans', quantity: ozToLb(4), unitOfMeasure: 'lb' },
        { ingredientId: 'cheddar-cheese', quantity: ozToLb(0.5), unitOfMeasure: 'lb' },
        { ingredientId: 'taco-sauce', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'tostada-grande',
      name: 'Tostada Grande',
      sellingPrice: 4.49,
      recipes: [
        { ingredientId: 'tostada-shell', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: ozToLb(3), unitOfMeasure: 'lb' },
        { ingredientId: 'seasoned-beef', quantity: ozToLb(1.5), unitOfMeasure: 'lb' },
        { ingredientId: 'shredded-lettuce', quantity: ozToLb(1), unitOfMeasure: 'lb' },
        { ingredientId: 'sour-cream', quantity: ozToLb(0.5), unitOfMeasure: 'lb' },
        { ingredientId: 'cheddar-cheese', quantity: ozToLb(0.5), unitOfMeasure: 'lb' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'diced-tomatoes', quantity: ozToLb(1), unitOfMeasure: 'lb' },
      ],
    },
    {
      id: 'bean-burrito',
      name: 'Bean Burrito',
      sellingPrice: 2.69,
      recipes: [
        { ingredientId: 'flour-tortilla-10in', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: ozToLb(2.5), unitOfMeasure: 'lb' },
        { ingredientId: 'cheddar-cheese', quantity: ozToLb(1), unitOfMeasure: 'lb' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'combo-burrito',
      name: 'Combo Burrito',
      sellingPrice: 3.69,
      recipes: [
        { ingredientId: 'flour-tortilla-10in', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: ozToLb(2.5), unitOfMeasure: 'lb' },
        { ingredientId: 'seasoned-beef', quantity: ozToLb(1.5), unitOfMeasure: 'lb' },
        { ingredientId: 'cheddar-cheese', quantity: ozToLb(1), unitOfMeasure: 'lb' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'chili-burrito',
      name: 'Chili Burrito',
      sellingPrice: 3.99,
      recipes: [
        { ingredientId: 'flour-tortilla-10in', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: ozToLb(4), unitOfMeasure: 'lb' },
        { ingredientId: 'chili-base', quantity: ozToLb(3), unitOfMeasure: 'lb' },
        { ingredientId: 'cheddar-cheese', quantity: ozToLb(0.5), unitOfMeasure: 'lb' },
        { ingredientId: 'diced-onions', quantity: ozToLb(0.5), unitOfMeasure: 'lb' },
        { ingredientId: 'corn-chips', quantity: 2, unitOfMeasure: 'each' },
      ],
    },
  ];

  for (const menuItem of menuItems) {
    await db.doc(`menuItems/${menuItem.id}`).set({
      name: menuItem.name,
      isActive: true,
      sellingPrice: menuItem.sellingPrice,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    for (const recipe of menuItem.recipes) {
      const recipeId = recipe.ingredientId;
      await db.doc(`menuItems/${menuItem.id}/recipes/${recipeId}`).set({
        ingredientId: recipe.ingredientId,
        quantity: recipe.quantity,
        unitOfMeasure: recipe.unitOfMeasure,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
  }

  const weekId = '2025-W39';
  await db.doc(`weeks/${weekId}`).set({
    status: 'draft',
    createdAt: Timestamp.now(),
    finalizedAt: null,
    finalizedBy: null,
  });

  await db.doc(`weeks/${weekId}/sales/daily`).set({
    mon: 0,
    tue: 0,
    wed: 0,
    thu: 0,
    fri: 0,
    sat: 0,
    sun: 0,
  });

  for (const ingredient of ingredients) {
    await db.doc(`weeks/${weekId}/inventory/${ingredient.id}`).set({
      begin: 0,
      received: 0,
      end: 0,
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
