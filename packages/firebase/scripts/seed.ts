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

type IngredientCategory = 'food' | 'paper' | 'other';

type IngredientInput = {
  id: string;
  name: string;
  inventoryUnit: string;
  recipeUnit?: string;
  conversionFactor?: number;
  unitsPerCase: number;
  casePrice: number;
  unitCost: number;
  category: IngredientCategory;
};

type MenuItemInput = {
  id: string;
  name: string;
  sellingPrice: number;
  recipes: Array<{ ingredientId: string; quantity: number; unitOfMeasure: string }>;
};

type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

type DailySalesData = {
  foodSales: number;
  drinkSales: number;
  lessSalesTax: number;
  lessPromo: number;
};

// Helper: Random number in range
const randomInRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

// Helper: Random integer in range
const randomInt = (min: number, max: number): number => {
  return Math.floor(randomInRange(min, max + 1));
};

// Helper: Generate realistic daily sales
const generateDailySales = (day: WeekDay, weekIndex: number): DailySalesData => {
  const isWeekend = day === 'sat' || day === 'sun';
  const baseFoodSales = isWeekend ? randomInRange(800, 1200) : randomInRange(400, 700);

  // Add some week-to-week variation
  const weekVariation = 1 + (Math.sin(weekIndex) * 0.1);
  const foodSales = baseFoodSales * weekVariation;

  // Drinks are 15-25% of food sales
  const drinkSales = foodSales * randomInRange(0.15, 0.25);

  // Sales tax is roughly 8.5% of gross
  const grossSales = foodSales + drinkSales;
  const lessSalesTax = grossSales * 0.085;

  // Promotions: 0-8%, more common on slow days
  const promoChance = isWeekend ? 0.2 : 0.4;
  const lessPromo = Math.random() < promoChance ? grossSales * randomInRange(0.02, 0.08) : 0;

  return {
    foodSales: Number(foodSales.toFixed(2)),
    drinkSales: Number(drinkSales.toFixed(2)),
    lessSalesTax: Number(lessSalesTax.toFixed(2)),
    lessPromo: Number(lessPromo.toFixed(2))
  };
};

// Helper: Generate realistic inventory data
const generateInventoryEntry = (
  ingredientId: string,
  previousEnd: number
): { begin: number; received: number; end: number } => {
  // Beginning inventory is previous week's ending + some variation
  const begin = previousEnd > 0 ? previousEnd : randomInt(5, 20);

  // High-volume ingredients need more frequent restocking
  const isHighVolume = ['seasoned-beef', 'refried-beans', 'taco-shell-55', 'flour-tortilla-10in'].includes(ingredientId);
  const receiveAmount = isHighVolume ? randomInt(30, 60) : randomInt(10, 30);

  // Usage: 20-40% of available inventory
  const available = begin + receiveAmount;
  const usageRate = randomInRange(0.2, 0.4);
  const usage = available * usageRate;
  const end = Math.max(0, available - usage);

  return {
    begin: Number(begin.toFixed(2)),
    received: Number(receiveAmount.toFixed(2)),
    end: Number(end.toFixed(2))
  };
};

// Helper: Calculate week end date from week ID
const getWeekTimestamp = (weekId: string): Timestamp => {
  const [year, week] = weekId.split('-W').map(Number);
  const jan1 = new Date(year, 0, 1);
  const days = (week - 1) * 7;
  const targetDate = new Date(jan1.getTime() + days * 24 * 60 * 60 * 1000);
  return Timestamp.fromDate(targetDate);
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

  console.log('🌱 Starting seed process...');

  // ===== USERS =====
  console.log('👥 Creating users...');
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
  console.log(`✅ Created ${users.length} users`);

  // ===== INGREDIENTS =====
  console.log('🥫 Creating ingredients...');
  const ingredients: IngredientInput[] = [
    // Food items
    {
      id: 'seasoned-beef',
      name: 'Seasoned Beef',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 20,
      casePrice: 120,
      unitCost: Number((120 / 20).toFixed(4)),
      category: 'food',
    },
    {
      id: 'refried-beans',
      name: 'Refried Beans',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 30,
      casePrice: 52,
      unitCost: Number((52 / 30).toFixed(4)),
      category: 'food',
    },
    {
      id: 'taco-shell-55',
      name: '5.5" Taco Shell',
      inventoryUnit: 'each',
      unitsPerCase: 200,
      casePrice: 42,
      unitCost: Number((42 / 200).toFixed(4)),
      category: 'food',
    },
    {
      id: 'tostada-shell',
      name: 'Tostada Shell',
      inventoryUnit: 'each',
      unitsPerCase: 150,
      casePrice: 45,
      unitCost: Number((45 / 150).toFixed(4)),
      category: 'food',
    },
    {
      id: 'flour-tortilla-10in',
      name: '10" Flour Tortilla',
      inventoryUnit: 'each',
      unitsPerCase: 144,
      casePrice: 36,
      unitCost: Number((36 / 144).toFixed(4)),
      category: 'food',
    },
    {
      id: 'burger-bun',
      name: '4" Sandwich Bun',
      inventoryUnit: 'each',
      unitsPerCase: 96,
      casePrice: 18,
      unitCost: Number((18 / 96).toFixed(4)),
      category: 'food',
    },
    {
      id: 'cheddar-cheese',
      name: 'Shredded Cheddar Cheese',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 10,
      casePrice: 58,
      unitCost: Number((58 / 10).toFixed(4)),
      category: 'food',
    },
    {
      id: 'shredded-lettuce',
      name: 'Shredded Lettuce',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 20,
      casePrice: 24,
      unitCost: Number((24 / 20).toFixed(4)),
      category: 'food',
    },
    {
      id: 'taco-sauce',
      name: 'Red Taco Sauce',
      inventoryUnit: 'oz',
      unitsPerCase: 512,
      casePrice: 38,
      unitCost: Number((38 / 512).toFixed(4)),
      category: 'food',
    },
    {
      id: 'sour-cream',
      name: 'Sour Cream',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 24,
      casePrice: 36,
      unitCost: Number((36 / 24).toFixed(4)),
      category: 'food',
    },
    {
      id: 'diced-tomatoes',
      name: 'Diced Tomatoes',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 25,
      casePrice: 32,
      unitCost: Number((32 / 25).toFixed(4)),
      category: 'food',
    },
    {
      id: 'chili-base',
      name: 'Seasoned Chili',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 30,
      casePrice: 55,
      unitCost: Number((55 / 30).toFixed(4)),
      category: 'food',
    },
    {
      id: 'diced-onions',
      name: 'Diced Onions',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 20,
      casePrice: 18,
      unitCost: Number((18 / 20).toFixed(4)),
      category: 'food',
    },
    {
      id: 'corn-chips',
      name: 'Corn Chips',
      inventoryUnit: 'each',
      unitsPerCase: 500,
      casePrice: 12,
      unitCost: Number((12 / 500).toFixed(4)),
      category: 'food',
    },
    {
      id: 'grilled-chicken',
      name: 'Grilled Chicken Breast',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 15,
      casePrice: 85,
      unitCost: Number((85 / 15).toFixed(4)),
      category: 'food',
    },
    {
      id: 'black-beans',
      name: 'Black Beans',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 25,
      casePrice: 48,
      unitCost: Number((48 / 25).toFixed(4)),
      category: 'food',
    },
    {
      id: 'salsa',
      name: 'Salsa',
      inventoryUnit: 'oz',
      unitsPerCase: 256,
      casePrice: 22,
      unitCost: Number((22 / 256).toFixed(4)),
      category: 'food',
    },
    {
      id: 'guacamole',
      name: 'Guacamole',
      inventoryUnit: 'oz',
      unitsPerCase: 128,
      casePrice: 42,
      unitCost: Number((42 / 128).toFixed(4)),
      category: 'food',
    },
    {
      id: 'rice',
      name: 'Spanish Rice',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 20,
      casePrice: 28,
      unitCost: Number((28 / 20).toFixed(4)),
      category: 'food',
    },
    {
      id: 'jalapenos',
      name: 'Sliced Jalapeños',
      inventoryUnit: 'oz',
      unitsPerCase: 256,
      casePrice: 18,
      unitCost: Number((18 / 256).toFixed(4)),
      category: 'food',
    },
    // Paper goods
    {
      id: 'to-go-container-small',
      name: 'Small To-Go Container',
      inventoryUnit: 'each',
      unitsPerCase: 250,
      casePrice: 28,
      unitCost: Number((28 / 250).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'to-go-container-large',
      name: 'Large To-Go Container',
      inventoryUnit: 'each',
      unitsPerCase: 200,
      casePrice: 35,
      unitCost: Number((35 / 200).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'drink-cup-16oz',
      name: '16oz Drink Cup',
      inventoryUnit: 'each',
      unitsPerCase: 500,
      casePrice: 22,
      unitCost: Number((22 / 500).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'drink-cup-32oz',
      name: '32oz Drink Cup',
      inventoryUnit: 'each',
      unitsPerCase: 400,
      casePrice: 28,
      unitCost: Number((28 / 400).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'cup-lid',
      name: 'Cup Lid',
      inventoryUnit: 'each',
      unitsPerCase: 1000,
      casePrice: 18,
      unitCost: Number((18 / 1000).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'paper-bag',
      name: 'Paper Bag',
      inventoryUnit: 'each',
      unitsPerCase: 500,
      casePrice: 15,
      unitCost: Number((15 / 500).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'napkin',
      name: 'Napkin',
      inventoryUnit: 'each',
      unitsPerCase: 5000,
      casePrice: 12,
      unitCost: Number((12 / 5000).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'straw',
      name: 'Straw',
      inventoryUnit: 'each',
      unitsPerCase: 2000,
      casePrice: 8,
      unitCost: Number((8 / 2000).toFixed(4)),
      category: 'paper',
    },
    // Other supplies
    {
      id: 'fryer-oil',
      name: 'Fryer Oil',
      inventoryUnit: 'gal',
      unitsPerCase: 4,
      casePrice: 38,
      unitCost: Number((38 / 4).toFixed(4)),
      category: 'other',
    },
    {
      id: 'cleaning-solution',
      name: 'Multi-Surface Cleaner',
      inventoryUnit: 'each',
      unitsPerCase: 6,
      casePrice: 24,
      unitCost: Number((24 / 6).toFixed(4)),
      category: 'other',
    },
    {
      id: 'gloves',
      name: 'Disposable Gloves',
      inventoryUnit: 'each',
      unitsPerCase: 1000,
      casePrice: 18,
      unitCost: Number((18 / 1000).toFixed(4)),
      category: 'other',
    },
  ];

  for (const ingredient of ingredients) {
    const docData: {
      name: string;
      inventoryUnit: string;
      unitsPerCase: number;
      casePrice: number;
      unitCost: number;
      isActive: boolean;
      category: string;
      createdAt: Timestamp;
      recipeUnit?: string;
      conversionFactor?: number;
      currentVersionId?: string;
    } = {
      name: ingredient.name,
      inventoryUnit: ingredient.inventoryUnit,
      unitsPerCase: ingredient.unitsPerCase,
      casePrice: ingredient.casePrice,
      unitCost: ingredient.unitCost,
      isActive: true,
      category: ingredient.category,
      createdAt: Timestamp.now(),
    };

    if (ingredient.recipeUnit) {
      docData.recipeUnit = ingredient.recipeUnit;
    }
    if (ingredient.conversionFactor) {
      docData.conversionFactor = ingredient.conversionFactor;
    }

    await db.doc(`ingredients/${ingredient.id}`).set(docData);

    const versionId = `2025-v1`;
    await db.doc(`ingredients/${ingredient.id}/versions/${versionId}`).set({
      casePrice: ingredient.casePrice,
      unitsPerCase: ingredient.unitsPerCase,
      unitCost: ingredient.unitCost,
      effectiveFrom: Timestamp.now(),
      effectiveTo: null,
    });

    docData.currentVersionId = versionId;
    await db.doc(`ingredients/${ingredient.id}`).update({ currentVersionId: versionId });
  }
  console.log(`✅ Created ${ingredients.length} ingredients`);

  // ===== MENU ITEMS =====
  console.log('🌮 Creating menu items...');
  const menuItems: MenuItemInput[] = [
    {
      id: 'soft-taco',
      name: 'Soft Taco',
      sellingPrice: 2.29,
      recipes: [
        { ingredientId: 'taco-shell-55', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'seasoned-beef', quantity: 1.5, unitOfMeasure: 'oz' },
        { ingredientId: 'shredded-lettuce', quantity: 0.75, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'taco-burger',
      name: 'Taco Burger',
      sellingPrice: 3.49,
      recipes: [
        { ingredientId: 'burger-bun', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'seasoned-beef', quantity: 1.5, unitOfMeasure: 'oz' },
        { ingredientId: 'shredded-lettuce', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'diced-tomatoes', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'bean-tostada',
      name: 'Bean Tostada',
      sellingPrice: 3.29,
      recipes: [
        { ingredientId: 'tostada-shell', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: 2.5, unitOfMeasure: 'oz' },
        { ingredientId: 'shredded-lettuce', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'diced-tomatoes', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'beef-tostada',
      name: 'Beef Tostada',
      sellingPrice: 3.79,
      recipes: [
        { ingredientId: 'tostada-shell', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: 2.5, unitOfMeasure: 'oz' },
        { ingredientId: 'seasoned-beef', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'shredded-lettuce', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'diced-tomatoes', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'refried-beans-side',
      name: 'Refried Beans',
      sellingPrice: 2.19,
      recipes: [
        { ingredientId: 'refried-beans', quantity: 4, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'taco-sauce', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'tostada-grande',
      name: 'Tostada Grande',
      sellingPrice: 4.49,
      recipes: [
        { ingredientId: 'tostada-shell', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'seasoned-beef', quantity: 1.5, unitOfMeasure: 'oz' },
        { ingredientId: 'shredded-lettuce', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'sour-cream', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'diced-tomatoes', quantity: 1, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'bean-burrito',
      name: 'Bean Burrito',
      sellingPrice: 2.69,
      recipes: [
        { ingredientId: 'flour-tortilla-10in', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: 2.5, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'combo-burrito',
      name: 'Combo Burrito',
      sellingPrice: 3.69,
      recipes: [
        { ingredientId: 'flour-tortilla-10in', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: 2.5, unitOfMeasure: 'oz' },
        { ingredientId: 'seasoned-beef', quantity: 1.5, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'taco-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'chili-burrito',
      name: 'Chili Burrito',
      sellingPrice: 3.99,
      recipes: [
        { ingredientId: 'flour-tortilla-10in', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'refried-beans', quantity: 4, unitOfMeasure: 'oz' },
        { ingredientId: 'chili-base', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'diced-onions', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'corn-chips', quantity: 2, unitOfMeasure: 'each' },
      ],
    },
    {
      id: 'chicken-burrito',
      name: 'Chicken Burrito',
      sellingPrice: 4.29,
      recipes: [
        { ingredientId: 'flour-tortilla-10in', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'grilled-chicken', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'rice', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'black-beans', quantity: 1.5, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'salsa', quantity: 1, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'supreme-burrito',
      name: 'Supreme Burrito',
      sellingPrice: 5.49,
      recipes: [
        { ingredientId: 'flour-tortilla-10in', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'seasoned-beef', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'refried-beans', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'rice', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'sour-cream', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'guacamole', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'shredded-lettuce', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'diced-tomatoes', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'nachos-supreme',
      name: 'Nachos Supreme',
      sellingPrice: 5.99,
      recipes: [
        { ingredientId: 'corn-chips', quantity: 20, unitOfMeasure: 'each' },
        { ingredientId: 'seasoned-beef', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'refried-beans', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'sour-cream', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'guacamole', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'salsa', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'jalapenos', quantity: 0.25, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'rice-bowl',
      name: 'Rice Bowl',
      sellingPrice: 4.79,
      recipes: [
        { ingredientId: 'rice', quantity: 6, unitOfMeasure: 'oz' },
        { ingredientId: 'black-beans', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'grilled-chicken', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'salsa', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'sour-cream', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'chips-and-salsa',
      name: 'Chips & Salsa',
      sellingPrice: 1.99,
      recipes: [
        { ingredientId: 'corn-chips', quantity: 15, unitOfMeasure: 'each' },
        { ingredientId: 'salsa', quantity: 2, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'chips-and-guacamole',
      name: 'Chips & Guacamole',
      sellingPrice: 2.99,
      recipes: [
        { ingredientId: 'corn-chips', quantity: 15, unitOfMeasure: 'each' },
        { ingredientId: 'guacamole', quantity: 2, unitOfMeasure: 'oz' },
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
  console.log(`✅ Created ${menuItems.length} menu items`);

  // ===== WEEKS =====
  console.log('📅 Creating historical weeks...');

  const weekDays: WeekDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const weekIds = ['2025-W33', '2025-W34', '2025-W35', '2025-W36', '2025-W37', '2025-W38'];

  // Track inventory end values across weeks
  const inventoryEndValues: Record<string, number> = {};

  for (let weekIndex = 0; weekIndex < weekIds.length; weekIndex++) {
    const weekId = weekIds[weekIndex];
    const weekTimestamp = getWeekTimestamp(weekId);

    console.log(`  Creating week ${weekId}...`);

    // Create week document
    await db.doc(`weeks/${weekId}`).set({
      status: 'finalized',
      createdAt: weekTimestamp,
      finalizedAt: weekTimestamp,
      finalizedBy: userIds.owner,
    });

    // Generate sales data
    const salesDays: Record<WeekDay, DailySalesData> = {} as Record<WeekDay, DailySalesData>;
    for (const day of weekDays) {
      salesDays[day] = generateDailySales(day, weekIndex);
    }

    await db.doc(`weeks/${weekId}/sales/daily`).set({
      days: salesDays,
      updatedAt: weekTimestamp,
    });

    // Generate inventory data
    for (const ingredient of ingredients) {
      const previousEnd = inventoryEndValues[ingredient.id] || 0;
      const entry = generateInventoryEntry(ingredient.id, previousEnd);

      await db.doc(`weeks/${weekId}/inventory/${ingredient.id}`).set({
        ...entry,
        updatedAt: weekTimestamp,
      });

      // Track for next week
      inventoryEndValues[ingredient.id] = entry.end;

      // Create cost snapshot
      await db.doc(`weeks/${weekId}/costSnapshot/${ingredient.id}`).set({
        unitCost: ingredient.unitCost,
        sourceVersionId: '2025-v1',
        capturedAt: weekTimestamp,
      });
    }

    // Generate report (simplified version - in production this would use computeReportSummary)
    const breakdown = ingredients.map(ing => {
      const usage = randomInRange(10, 50);
      const costOfSales = usage * ing.unitCost;

      return {
        ingredientId: ing.id,
        usage: Number(usage.toFixed(2)),
        unitCost: ing.unitCost,
        costOfSales: Number(costOfSales.toFixed(2)),
        sourceVersionId: '2025-v1',
      };
    });

    const totalCostOfSales = breakdown.reduce((sum, item) => sum + item.costOfSales, 0);
    const totalUsageUnits = breakdown.reduce((sum, item) => sum + item.usage, 0);

    await db.doc(`weeks/${weekId}/report/summary`).set({
      computedAt: weekTimestamp.toDate().toISOString(),
      totals: {
        totalUsageUnits: Number(totalUsageUnits.toFixed(2)),
        totalCostOfSales: Number(totalCostOfSales.toFixed(2)),
      },
      percentages: {
        ingredientCostShare: breakdown.reduce((acc, item) => {
          acc[item.ingredientId] = totalCostOfSales > 0
            ? Number((item.costOfSales / totalCostOfSales).toFixed(4))
            : 0;
          return acc;
        }, {} as Record<string, number>),
      },
      breakdown,
      generatedAt: weekTimestamp,
    });
  }
  console.log(`✅ Created ${weekIds.length} finalized weeks`);

  // ===== CURRENT DRAFT WEEK =====
  console.log('📝 Creating current draft week...');
  const draftWeekId = '2025-W39';
  await db.doc(`weeks/${draftWeekId}`).set({
    status: 'draft',
    createdAt: Timestamp.now(),
    finalizedAt: null,
    finalizedBy: null,
  });

  // Initialize with zeros
  const emptySalesDays: Record<WeekDay, DailySalesData> = {} as Record<WeekDay, DailySalesData>;
  for (const day of weekDays) {
    emptySalesDays[day] = { foodSales: 0, drinkSales: 0, lessSalesTax: 0, lessPromo: 0 };
  }

  await db.doc(`weeks/${draftWeekId}/sales/daily`).set({
    days: emptySalesDays,
    updatedAt: Timestamp.now(),
  });

  // Set beginning inventory from previous week's ending
  for (const ingredient of ingredients) {
    const previousEnd = inventoryEndValues[ingredient.id] || 0;
    await db.doc(`weeks/${draftWeekId}/inventory/${ingredient.id}`).set({
      begin: previousEnd,
      received: 0,
      end: 0,
      updatedAt: Timestamp.now(),
    });
  }
  console.log(`✅ Created draft week ${draftWeekId}`);

  console.log('\n🎉 Seed data created successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - ${users.length} users`);
  console.log(`  - ${ingredients.length} ingredients`);
  console.log(`  - ${menuItems.length} menu items`);
  console.log(`  - ${weekIds.length} finalized weeks`);
  console.log(`  - 1 draft week`);
  console.log('\n🔑 Login Credentials:');
  console.log(`  Owner: ${users.find((user) => user.role === 'owner')?.email} / OwnerPass123!`);
  console.log(`  Team Member: ${users.find((user) => user.role === 'teamMember')?.email} / TeamPass123!`);
};

main().catch((error) => {
  console.error('❌ Failed to seed Firebase project');
  console.error(error);
  process.exitCode = 1;
});
