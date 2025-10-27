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

type RestaurantData = {
  ingredients: IngredientInput[];
  menuItems: MenuItemInput[];
};

type BusinessConfig = {
  id: string;
  name: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerDisplayName: string;
  staffEmail: string;
  staffPassword: string;
  staffDisplayName: string;
  dataGenerator: () => RestaurantData;
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

// ===== DATA GENERATORS =====

// Little Tokyo - Sushi Restaurant
const generateLittleTokyoData = (): RestaurantData => {
  const ingredients: IngredientInput[] = [
    // Fish & Seafood
    {
      id: 'salmon',
      name: 'Fresh Salmon (Sake)',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 10,
      casePrice: 180,
      unitCost: Number((180 / 10).toFixed(4)),
      category: 'food',
    },
    {
      id: 'tuna',
      name: 'Ahi Tuna (Maguro)',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 8,
      casePrice: 240,
      unitCost: Number((240 / 8).toFixed(4)),
      category: 'food',
    },
    {
      id: 'yellowtail',
      name: 'Yellowtail (Hamachi)',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 8,
      casePrice: 220,
      unitCost: Number((220 / 8).toFixed(4)),
      category: 'food',
    },
    {
      id: 'eel',
      name: 'Freshwater Eel (Unagi)',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 6,
      casePrice: 168,
      unitCost: Number((168 / 6).toFixed(4)),
      category: 'food',
    },
    {
      id: 'shrimp',
      name: 'Cooked Shrimp (Ebi)',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 12,
      casePrice: 144,
      unitCost: Number((144 / 12).toFixed(4)),
      category: 'food',
    },
    {
      id: 'crab',
      name: 'Imitation Crab (Kani)',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 20,
      casePrice: 80,
      unitCost: Number((80 / 20).toFixed(4)),
      category: 'food',
    },
    {
      id: 'octopus',
      name: 'Cooked Octopus (Tako)',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 8,
      casePrice: 112,
      unitCost: Number((112 / 8).toFixed(4)),
      category: 'food',
    },
    // Rice & Wraps
    {
      id: 'sushi-rice',
      name: 'Sushi Rice',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 50,
      casePrice: 75,
      unitCost: Number((75 / 50).toFixed(4)),
      category: 'food',
    },
    {
      id: 'nori',
      name: 'Nori Seaweed Sheets',
      inventoryUnit: 'each',
      unitsPerCase: 500,
      casePrice: 45,
      unitCost: Number((45 / 500).toFixed(4)),
      category: 'food',
    },
    {
      id: 'soy-paper',
      name: 'Soy Paper Sheets',
      inventoryUnit: 'each',
      unitsPerCase: 200,
      casePrice: 32,
      unitCost: Number((32 / 200).toFixed(4)),
      category: 'food',
    },
    {
      id: 'tempura-batter',
      name: 'Tempura Batter Mix',
      inventoryUnit: 'lb',
      unitsPerCase: 20,
      casePrice: 48,
      unitCost: Number((48 / 20).toFixed(4)),
      category: 'food',
    },
    // Vegetables
    {
      id: 'cucumber',
      name: 'Japanese Cucumber',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 15,
      casePrice: 22,
      unitCost: Number((22 / 15).toFixed(4)),
      category: 'food',
    },
    {
      id: 'avocado',
      name: 'Avocado',
      inventoryUnit: 'each',
      unitsPerCase: 48,
      casePrice: 38,
      unitCost: Number((38 / 48).toFixed(4)),
      category: 'food',
    },
    {
      id: 'scallions',
      name: 'Scallions (Green Onion)',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 10,
      casePrice: 15,
      unitCost: Number((15 / 10).toFixed(4)),
      category: 'food',
    },
    {
      id: 'carrots',
      name: 'Carrots',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 25,
      casePrice: 18,
      unitCost: Number((18 / 25).toFixed(4)),
      category: 'food',
    },
    {
      id: 'daikon',
      name: 'Daikon Radish',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 20,
      casePrice: 24,
      unitCost: Number((24 / 20).toFixed(4)),
      category: 'food',
    },
    {
      id: 'edamame',
      name: 'Frozen Edamame',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 20,
      casePrice: 32,
      unitCost: Number((32 / 20).toFixed(4)),
      category: 'food',
    },
    // Condiments & Sauces
    {
      id: 'soy-sauce',
      name: 'Soy Sauce',
      inventoryUnit: 'oz',
      unitsPerCase: 640,
      casePrice: 28,
      unitCost: Number((28 / 640).toFixed(4)),
      category: 'food',
    },
    {
      id: 'wasabi',
      name: 'Wasabi Paste',
      inventoryUnit: 'oz',
      unitsPerCase: 128,
      casePrice: 48,
      unitCost: Number((48 / 128).toFixed(4)),
      category: 'food',
    },
    {
      id: 'pickled-ginger',
      name: 'Pickled Ginger (Gari)',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 10,
      casePrice: 38,
      unitCost: Number((38 / 10).toFixed(4)),
      category: 'food',
    },
    {
      id: 'sesame-seeds',
      name: 'Sesame Seeds',
      inventoryUnit: 'oz',
      unitsPerCase: 128,
      casePrice: 18,
      unitCost: Number((18 / 128).toFixed(4)),
      category: 'food',
    },
    {
      id: 'spicy-mayo',
      name: 'Spicy Mayo Sauce',
      inventoryUnit: 'oz',
      unitsPerCase: 256,
      casePrice: 32,
      unitCost: Number((32 / 256).toFixed(4)),
      category: 'food',
    },
    {
      id: 'eel-sauce',
      name: 'Eel Sauce (Unagi Sauce)',
      inventoryUnit: 'oz',
      unitsPerCase: 256,
      casePrice: 42,
      unitCost: Number((42 / 256).toFixed(4)),
      category: 'food',
    },
    {
      id: 'ponzu',
      name: 'Ponzu Sauce',
      inventoryUnit: 'oz',
      unitsPerCase: 256,
      casePrice: 35,
      unitCost: Number((35 / 256).toFixed(4)),
      category: 'food',
    },
    {
      id: 'rice-vinegar',
      name: 'Rice Vinegar',
      inventoryUnit: 'oz',
      unitsPerCase: 512,
      casePrice: 24,
      unitCost: Number((24 / 512).toFixed(4)),
      category: 'food',
    },
    // Other
    {
      id: 'cream-cheese',
      name: 'Cream Cheese',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 12,
      casePrice: 36,
      unitCost: Number((36 / 12).toFixed(4)),
      category: 'food',
    },
    {
      id: 'masago',
      name: 'Masago (Capelin Roe)',
      inventoryUnit: 'oz',
      unitsPerCase: 64,
      casePrice: 54,
      unitCost: Number((54 / 64).toFixed(4)),
      category: 'food',
    },
    {
      id: 'tempura-flakes',
      name: 'Tempura Flakes (Crunch)',
      inventoryUnit: 'oz',
      unitsPerCase: 128,
      casePrice: 22,
      unitCost: Number((22 / 128).toFixed(4)),
      category: 'food',
    },
    // Paper goods
    {
      id: 'sushi-container',
      name: 'Sushi To-Go Container',
      inventoryUnit: 'each',
      unitsPerCase: 200,
      casePrice: 48,
      unitCost: Number((48 / 200).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'soy-sauce-packet',
      name: 'Soy Sauce Packet',
      inventoryUnit: 'each',
      unitsPerCase: 1000,
      casePrice: 18,
      unitCost: Number((18 / 1000).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'chopsticks',
      name: 'Chopsticks (Wrapped)',
      inventoryUnit: 'each',
      unitsPerCase: 1000,
      casePrice: 22,
      unitCost: Number((22 / 1000).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'wasabi-packet',
      name: 'Wasabi Packet',
      inventoryUnit: 'each',
      unitsPerCase: 500,
      casePrice: 24,
      unitCost: Number((24 / 500).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'ginger-packet',
      name: 'Pickled Ginger Packet',
      inventoryUnit: 'each',
      unitsPerCase: 500,
      casePrice: 20,
      unitCost: Number((20 / 500).toFixed(4)),
      category: 'paper',
    },
    // Other supplies
    {
      id: 'fryer-oil-sushi',
      name: 'Fryer Oil',
      inventoryUnit: 'gal',
      unitsPerCase: 4,
      casePrice: 38,
      unitCost: Number((38 / 4).toFixed(4)),
      category: 'other',
    },
  ];

  const menuItems: MenuItemInput[] = [
    {
      id: 'salmon-nigiri',
      name: 'Salmon Nigiri (2pc)',
      sellingPrice: 7.99,
      recipes: [
        { ingredientId: 'salmon', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'sushi-rice', quantity: 1.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'tuna-nigiri',
      name: 'Tuna Nigiri (2pc)',
      sellingPrice: 8.99,
      recipes: [
        { ingredientId: 'tuna', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'sushi-rice', quantity: 1.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'yellowtail-nigiri',
      name: 'Yellowtail Nigiri (2pc)',
      sellingPrice: 8.49,
      recipes: [
        { ingredientId: 'yellowtail', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'sushi-rice', quantity: 1.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'eel-nigiri',
      name: 'Eel Nigiri (2pc)',
      sellingPrice: 9.49,
      recipes: [
        { ingredientId: 'eel', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'sushi-rice', quantity: 1.5, unitOfMeasure: 'oz' },
        { ingredientId: 'eel-sauce', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'shrimp-nigiri',
      name: 'Shrimp Nigiri (2pc)',
      sellingPrice: 7.49,
      recipes: [
        { ingredientId: 'shrimp', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'sushi-rice', quantity: 1.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'sashimi-platter',
      name: 'Sashimi Platter (9pc)',
      sellingPrice: 22.99,
      recipes: [
        { ingredientId: 'salmon', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'tuna', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'yellowtail', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'wasabi', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'pickled-ginger', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'california-roll',
      name: 'California Roll',
      sellingPrice: 8.99,
      recipes: [
        { ingredientId: 'crab', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'avocado', quantity: 0.5, unitOfMeasure: 'each' },
        { ingredientId: 'cucumber', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'sushi-rice', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'nori', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'sesame-seeds', quantity: 0.1, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'spicy-tuna-roll',
      name: 'Spicy Tuna Roll',
      sellingPrice: 10.99,
      recipes: [
        { ingredientId: 'tuna', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'spicy-mayo', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'scallions', quantity: 0.25, unitOfMeasure: 'oz' },
        { ingredientId: 'sushi-rice', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'nori', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'tempura-flakes', quantity: 0.25, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'philadelphia-roll',
      name: 'Philadelphia Roll',
      sellingPrice: 9.99,
      recipes: [
        { ingredientId: 'salmon', quantity: 2.5, unitOfMeasure: 'oz' },
        { ingredientId: 'cream-cheese', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'cucumber', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'sushi-rice', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'nori', quantity: 1, unitOfMeasure: 'each' },
      ],
    },
    {
      id: 'dragon-roll',
      name: 'Dragon Roll',
      sellingPrice: 14.99,
      recipes: [
        { ingredientId: 'eel', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'avocado', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'cucumber', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'sushi-rice', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'nori', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'eel-sauce', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'sesame-seeds', quantity: 0.1, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'rainbow-roll',
      name: 'Rainbow Roll',
      sellingPrice: 15.99,
      recipes: [
        { ingredientId: 'crab', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'salmon', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'tuna', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'yellowtail', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'avocado', quantity: 0.5, unitOfMeasure: 'each' },
        { ingredientId: 'cucumber', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'sushi-rice', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'nori', quantity: 1, unitOfMeasure: 'each' },
      ],
    },
    {
      id: 'tempura-roll',
      name: 'Shrimp Tempura Roll',
      sellingPrice: 11.99,
      recipes: [
        { ingredientId: 'shrimp', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'tempura-batter', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'avocado', quantity: 0.5, unitOfMeasure: 'each' },
        { ingredientId: 'cucumber', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'sushi-rice', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'nori', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'eel-sauce', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'edamame-appetizer',
      name: 'Edamame',
      sellingPrice: 5.99,
      recipes: [
        { ingredientId: 'edamame', quantity: 6, unitOfMeasure: 'oz' },
        { ingredientId: 'sesame-seeds', quantity: 0.1, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'seaweed-salad',
      name: 'Seaweed Salad',
      sellingPrice: 6.49,
      recipes: [
        { ingredientId: 'nori', quantity: 2, unitOfMeasure: 'each' },
        { ingredientId: 'cucumber', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'sesame-seeds', quantity: 0.2, unitOfMeasure: 'oz' },
        { ingredientId: 'rice-vinegar', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
  ];

  return { ingredients, menuItems };
};

// Ruby Slipper - Breakfast Restaurant
const generateRubySlipperData = (): RestaurantData => {
  const ingredients: IngredientInput[] = [
    // Proteins
    {
      id: 'eggs',
      name: 'Fresh Eggs',
      inventoryUnit: 'each',
      unitsPerCase: 360,
      casePrice: 54,
      unitCost: Number((54 / 360).toFixed(4)),
      category: 'food',
    },
    {
      id: 'bacon',
      name: 'Thick-Cut Bacon',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 15,
      casePrice: 68,
      unitCost: Number((68 / 15).toFixed(4)),
      category: 'food',
    },
    {
      id: 'sausage-links',
      name: 'Breakfast Sausage Links',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 20,
      casePrice: 52,
      unitCost: Number((52 / 20).toFixed(4)),
      category: 'food',
    },
    {
      id: 'sausage-patties',
      name: 'Breakfast Sausage Patties',
      inventoryUnit: 'each',
      unitsPerCase: 120,
      casePrice: 44,
      unitCost: Number((44 / 120).toFixed(4)),
      category: 'food',
    },
    {
      id: 'ham',
      name: 'Deli Ham',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 12,
      casePrice: 48,
      unitCost: Number((48 / 12).toFixed(4)),
      category: 'food',
    },
    {
      id: 'smoked-salmon-breakfast',
      name: 'Smoked Salmon',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 6,
      casePrice: 84,
      unitCost: Number((84 / 6).toFixed(4)),
      category: 'food',
    },
    // Breads
    {
      id: 'white-bread',
      name: 'White Bread',
      inventoryUnit: 'each',
      unitsPerCase: 120,
      casePrice: 28,
      unitCost: Number((28 / 120).toFixed(4)),
      category: 'food',
    },
    {
      id: 'wheat-bread',
      name: 'Wheat Bread',
      inventoryUnit: 'each',
      unitsPerCase: 120,
      casePrice: 32,
      unitCost: Number((32 / 120).toFixed(4)),
      category: 'food',
    },
    {
      id: 'english-muffins',
      name: 'English Muffins',
      inventoryUnit: 'each',
      unitsPerCase: 72,
      casePrice: 26,
      unitCost: Number((26 / 72).toFixed(4)),
      category: 'food',
    },
    {
      id: 'bagels',
      name: 'Plain Bagels',
      inventoryUnit: 'each',
      unitsPerCase: 72,
      casePrice: 32,
      unitCost: Number((32 / 72).toFixed(4)),
      category: 'food',
    },
    {
      id: 'croissants',
      name: 'Butter Croissants',
      inventoryUnit: 'each',
      unitsPerCase: 48,
      casePrice: 42,
      unitCost: Number((42 / 48).toFixed(4)),
      category: 'food',
    },
    {
      id: 'biscuits',
      name: 'Buttermilk Biscuits',
      inventoryUnit: 'each',
      unitsPerCase: 100,
      casePrice: 35,
      unitCost: Number((35 / 100).toFixed(4)),
      category: 'food',
    },
    // Breakfast Bases
    {
      id: 'pancake-mix',
      name: 'Pancake & Waffle Mix',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 50,
      casePrice: 48,
      unitCost: Number((48 / 50).toFixed(4)),
      category: 'food',
    },
    {
      id: 'hash-browns',
      name: 'Shredded Hash Browns',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 30,
      casePrice: 42,
      unitCost: Number((42 / 30).toFixed(4)),
      category: 'food',
    },
    {
      id: 'grits',
      name: 'Stone-Ground Grits',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 25,
      casePrice: 32,
      unitCost: Number((32 / 25).toFixed(4)),
      category: 'food',
    },
    {
      id: 'oatmeal',
      name: 'Old-Fashioned Oats',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 24,
      casePrice: 28,
      unitCost: Number((28 / 24).toFixed(4)),
      category: 'food',
    },
    // Dairy
    {
      id: 'milk',
      name: 'Whole Milk',
      inventoryUnit: 'gal',
      recipeUnit: 'oz',
      conversionFactor: 128,
      unitsPerCase: 4,
      casePrice: 16,
      unitCost: Number((16 / 4).toFixed(4)),
      category: 'food',
    },
    {
      id: 'butter',
      name: 'Butter',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 36,
      casePrice: 96,
      unitCost: Number((96 / 36).toFixed(4)),
      category: 'food',
    },
    {
      id: 'cream-cheese-breakfast',
      name: 'Cream Cheese',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 12,
      casePrice: 36,
      unitCost: Number((36 / 12).toFixed(4)),
      category: 'food',
    },
    {
      id: 'cheddar-cheese-breakfast',
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
      id: 'swiss-cheese',
      name: 'Swiss Cheese Slices',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 8,
      casePrice: 52,
      unitCost: Number((52 / 8).toFixed(4)),
      category: 'food',
    },
    {
      id: 'sour-cream-breakfast',
      name: 'Sour Cream',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 12,
      casePrice: 36,
      unitCost: Number((36 / 12).toFixed(4)),
      category: 'food',
    },
    // Produce
    {
      id: 'tomatoes',
      name: 'Fresh Tomatoes',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 25,
      casePrice: 32,
      unitCost: Number((32 / 25).toFixed(4)),
      category: 'food',
    },
    {
      id: 'onions',
      name: 'Yellow Onions',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 25,
      casePrice: 18,
      unitCost: Number((18 / 25).toFixed(4)),
      category: 'food',
    },
    {
      id: 'bell-peppers',
      name: 'Bell Peppers',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 20,
      casePrice: 28,
      unitCost: Number((28 / 20).toFixed(4)),
      category: 'food',
    },
    {
      id: 'mushrooms',
      name: 'Button Mushrooms',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 15,
      casePrice: 36,
      unitCost: Number((36 / 15).toFixed(4)),
      category: 'food',
    },
    {
      id: 'spinach',
      name: 'Fresh Spinach',
      inventoryUnit: 'lb',
      recipeUnit: 'oz',
      conversionFactor: 16,
      unitsPerCase: 12,
      casePrice: 28,
      unitCost: Number((28 / 12).toFixed(4)),
      category: 'food',
    },
    {
      id: 'potatoes',
      name: 'Russet Potatoes',
      inventoryUnit: 'lb',
      unitsPerCase: 50,
      casePrice: 32,
      unitCost: Number((32 / 50).toFixed(4)),
      category: 'food',
    },
    // Condiments
    {
      id: 'maple-syrup',
      name: 'Pure Maple Syrup',
      inventoryUnit: 'oz',
      unitsPerCase: 256,
      casePrice: 96,
      unitCost: Number((96 / 256).toFixed(4)),
      category: 'food',
    },
    {
      id: 'honey',
      name: 'Honey',
      inventoryUnit: 'oz',
      unitsPerCase: 256,
      casePrice: 48,
      unitCost: Number((48 / 256).toFixed(4)),
      category: 'food',
    },
    {
      id: 'strawberry-jam',
      name: 'Strawberry Jam',
      inventoryUnit: 'oz',
      unitsPerCase: 192,
      casePrice: 38,
      unitCost: Number((38 / 192).toFixed(4)),
      category: 'food',
    },
    {
      id: 'ketchup',
      name: 'Ketchup',
      inventoryUnit: 'oz',
      unitsPerCase: 384,
      casePrice: 28,
      unitCost: Number((28 / 384).toFixed(4)),
      category: 'food',
    },
    {
      id: 'hot-sauce',
      name: 'Hot Sauce',
      inventoryUnit: 'oz',
      unitsPerCase: 256,
      casePrice: 32,
      unitCost: Number((32 / 256).toFixed(4)),
      category: 'food',
    },
    {
      id: 'hollandaise',
      name: 'Hollandaise Sauce Mix',
      inventoryUnit: 'oz',
      unitsPerCase: 128,
      casePrice: 42,
      unitCost: Number((42 / 128).toFixed(4)),
      category: 'food',
    },
    // Beverages
    {
      id: 'coffee-beans',
      name: 'Coffee Beans',
      inventoryUnit: 'lb',
      unitsPerCase: 12,
      casePrice: 72,
      unitCost: Number((72 / 12).toFixed(4)),
      category: 'food',
    },
    {
      id: 'orange-juice',
      name: 'Orange Juice',
      inventoryUnit: 'gal',
      unitsPerCase: 4,
      casePrice: 24,
      unitCost: Number((24 / 4).toFixed(4)),
      category: 'food',
    },
    {
      id: 'apple-juice',
      name: 'Apple Juice',
      inventoryUnit: 'gal',
      unitsPerCase: 4,
      casePrice: 20,
      unitCost: Number((20 / 4).toFixed(4)),
      category: 'food',
    },
    {
      id: 'tea-bags',
      name: 'Black Tea Bags',
      inventoryUnit: 'each',
      unitsPerCase: 500,
      casePrice: 18,
      unitCost: Number((18 / 500).toFixed(4)),
      category: 'food',
    },
    // Paper goods
    {
      id: 'plates',
      name: 'Disposable Plates',
      inventoryUnit: 'each',
      unitsPerCase: 500,
      casePrice: 38,
      unitCost: Number((38 / 500).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'coffee-cups-16oz',
      name: '16oz Coffee Cups',
      inventoryUnit: 'each',
      unitsPerCase: 500,
      casePrice: 32,
      unitCost: Number((32 / 500).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'coffee-lids',
      name: 'Coffee Cup Lids',
      inventoryUnit: 'each',
      unitsPerCase: 1000,
      casePrice: 22,
      unitCost: Number((22 / 1000).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'to-go-containers-breakfast',
      name: 'Breakfast To-Go Containers',
      inventoryUnit: 'each',
      unitsPerCase: 250,
      casePrice: 42,
      unitCost: Number((42 / 250).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'napkins-breakfast',
      name: 'Paper Napkins',
      inventoryUnit: 'each',
      unitsPerCase: 5000,
      casePrice: 15,
      unitCost: Number((15 / 5000).toFixed(4)),
      category: 'paper',
    },
    {
      id: 'cutlery-sets',
      name: 'Plastic Cutlery Sets',
      inventoryUnit: 'each',
      unitsPerCase: 1000,
      casePrice: 28,
      unitCost: Number((28 / 1000).toFixed(4)),
      category: 'paper',
    },
    // Other supplies
    {
      id: 'cooking-oil-breakfast',
      name: 'Vegetable Oil',
      inventoryUnit: 'gal',
      unitsPerCase: 4,
      casePrice: 32,
      unitCost: Number((32 / 4).toFixed(4)),
      category: 'other',
    },
  ];

  const menuItems: MenuItemInput[] = [
    {
      id: 'classic-breakfast',
      name: 'Classic Breakfast',
      sellingPrice: 10.99,
      recipes: [
        { ingredientId: 'eggs', quantity: 2, unitOfMeasure: 'each' },
        { ingredientId: 'bacon', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'hash-browns', quantity: 4, unitOfMeasure: 'oz' },
        { ingredientId: 'white-bread', quantity: 2, unitOfMeasure: 'each' },
        { ingredientId: 'butter', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'country-breakfast',
      name: 'Country Breakfast',
      sellingPrice: 12.99,
      recipes: [
        { ingredientId: 'eggs', quantity: 3, unitOfMeasure: 'each' },
        { ingredientId: 'sausage-links', quantity: 4, unitOfMeasure: 'oz' },
        { ingredientId: 'biscuits', quantity: 2, unitOfMeasure: 'each' },
        { ingredientId: 'grits', quantity: 6, unitOfMeasure: 'oz' },
        { ingredientId: 'butter', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'veggie-omelet',
      name: 'Veggie Omelet',
      sellingPrice: 11.49,
      recipes: [
        { ingredientId: 'eggs', quantity: 3, unitOfMeasure: 'each' },
        { ingredientId: 'bell-peppers', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'onions', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'mushrooms', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'spinach', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese-breakfast', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'wheat-bread', quantity: 2, unitOfMeasure: 'each' },
        { ingredientId: 'butter', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'meat-lovers-omelet',
      name: 'Meat Lovers Omelet',
      sellingPrice: 13.49,
      recipes: [
        { ingredientId: 'eggs', quantity: 3, unitOfMeasure: 'each' },
        { ingredientId: 'bacon', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'sausage-links', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'ham', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese-breakfast', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'white-bread', quantity: 2, unitOfMeasure: 'each' },
        { ingredientId: 'butter', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'buttermilk-pancakes',
      name: 'Buttermilk Pancakes (3)',
      sellingPrice: 8.99,
      recipes: [
        { ingredientId: 'pancake-mix', quantity: 6, unitOfMeasure: 'oz' },
        { ingredientId: 'eggs', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'milk', quantity: 4, unitOfMeasure: 'oz' },
        { ingredientId: 'butter', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'maple-syrup', quantity: 2, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'blueberry-pancakes',
      name: 'Blueberry Pancakes (3)',
      sellingPrice: 9.99,
      recipes: [
        { ingredientId: 'pancake-mix', quantity: 6, unitOfMeasure: 'oz' },
        { ingredientId: 'eggs', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'milk', quantity: 4, unitOfMeasure: 'oz' },
        { ingredientId: 'butter', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'maple-syrup', quantity: 2, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'french-toast',
      name: 'French Toast (3 slices)',
      sellingPrice: 9.49,
      recipes: [
        { ingredientId: 'white-bread', quantity: 3, unitOfMeasure: 'each' },
        { ingredientId: 'eggs', quantity: 2, unitOfMeasure: 'each' },
        { ingredientId: 'milk', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'butter', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'maple-syrup', quantity: 2, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'belgian-waffle',
      name: 'Belgian Waffle',
      sellingPrice: 10.49,
      recipes: [
        { ingredientId: 'pancake-mix', quantity: 8, unitOfMeasure: 'oz' },
        { ingredientId: 'eggs', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'milk', quantity: 6, unitOfMeasure: 'oz' },
        { ingredientId: 'butter', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'maple-syrup', quantity: 2, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'breakfast-sandwich',
      name: 'Breakfast Sandwich',
      sellingPrice: 7.99,
      recipes: [
        { ingredientId: 'eggs', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'bacon', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese-breakfast', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'english-muffins', quantity: 1, unitOfMeasure: 'each' },
        { ingredientId: 'butter', quantity: 0.25, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'breakfast-burrito',
      name: 'Breakfast Burrito',
      sellingPrice: 9.49,
      recipes: [
        { ingredientId: 'eggs', quantity: 2, unitOfMeasure: 'each' },
        { ingredientId: 'sausage-links', quantity: 3, unitOfMeasure: 'oz' },
        { ingredientId: 'cheddar-cheese-breakfast', quantity: 1, unitOfMeasure: 'oz' },
        { ingredientId: 'bell-peppers', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'onions', quantity: 0.5, unitOfMeasure: 'oz' },
        { ingredientId: 'hash-browns', quantity: 2, unitOfMeasure: 'oz' },
        { ingredientId: 'hot-sauce', quantity: 0.25, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'hash-browns-side',
      name: 'Hash Browns',
      sellingPrice: 3.99,
      recipes: [
        { ingredientId: 'hash-browns', quantity: 6, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'bacon-side',
      name: 'Bacon (4 strips)',
      sellingPrice: 4.49,
      recipes: [
        { ingredientId: 'bacon', quantity: 4, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'sausage-side',
      name: 'Sausage Links (4)',
      sellingPrice: 4.49,
      recipes: [
        { ingredientId: 'sausage-links', quantity: 4, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'coffee',
      name: 'Fresh Brewed Coffee',
      sellingPrice: 2.99,
      recipes: [
        { ingredientId: 'coffee-beans', quantity: 0.5, unitOfMeasure: 'oz' },
      ],
    },
    {
      id: 'orange-juice-glass',
      name: 'Orange Juice (12oz)',
      sellingPrice: 3.99,
      recipes: [
        { ingredientId: 'orange-juice', quantity: 12, unitOfMeasure: 'oz' },
      ],
    },
  ];

  return { ingredients, menuItems };
};

// Taco Casa - Mexican Restaurant
const generateTacoCasaData = (): RestaurantData => {
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

  return { ingredients, menuItems };
};

// ===== BUSINESS CONFIGURATION =====

const businessConfigs: BusinessConfig[] = [
  {
    id: 'little-tokyo',
    name: 'Little Tokyo',
    ownerEmail: 'owner@littletokyo.test',
    ownerPassword: 'OwnerPass123!',
    ownerDisplayName: 'Tokyo Owner',
    staffEmail: 'staff@littletokyo.test',
    staffPassword: 'StaffPass123!',
    staffDisplayName: 'Tokyo Staff',
    dataGenerator: generateLittleTokyoData,
  },
  {
    id: 'taco-casa',
    name: 'Taco Casa',
    ownerEmail: 'owner@tacocasa.test',
    ownerPassword: 'OwnerPass123!',
    ownerDisplayName: 'Casa Owner',
    staffEmail: 'staff@tacocasa.test',
    staffPassword: 'StaffPass123!',
    staffDisplayName: 'Casa Staff',
    dataGenerator: generateTacoCasaData,
  },
  {
    id: 'ruby-slipper',
    name: 'Ruby Slipper',
    ownerEmail: 'owner@rubyslipper.test',
    ownerPassword: 'OwnerPass123!',
    ownerDisplayName: 'Slipper Owner',
    staffEmail: 'staff@rubyslipper.test',
    staffPassword: 'StaffPass123!',
    staffDisplayName: 'Slipper Staff',
    dataGenerator: generateRubySlipperData,
  },
];

// ===== MAIN SEEDING FUNCTION =====

const main = async () => {
  const projectId = required('FIREBASE_PROJECT_ID');
  const clientEmail = required('FIREBASE_CLIENT_EMAIL');
  const privateKey = required('FIREBASE_PRIVATE_KEY');

  initFirebaseAdmin({ projectId, clientEmail, privateKey });

  const auth = getAdminAuth();
  const db = getAdminFirestore();

  console.log('🌱 Starting seed process for 3 restaurants...\n');

  const weekDays: WeekDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const weekIds = ['2025-W33', '2025-W34', '2025-W35', '2025-W36', '2025-W37', '2025-W38'];
  const draftWeekId = '2025-W39';

  // Loop through each business configuration
  for (const config of businessConfigs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏢 Setting up business: ${config.name}`);
    console.log(`${'='.repeat(60)}\n`);

    // ===== CREATE BUSINESS =====
    console.log(`  📋 Creating business document...`);
    await db.doc(`businesses/${config.id}`).set({
      name: config.name,
      createdAt: Timestamp.now(),
    });
    console.log(`  ✅ Business created: ${config.id}`);

    // ===== CREATE USERS =====
    console.log(`  👥 Creating users...`);
    const users: SeedUserInput[] = [
      {
        email: config.ownerEmail,
        displayName: config.ownerDisplayName,
        password: config.ownerPassword,
        role: 'owner',
      },
      {
        email: config.staffEmail,
        displayName: config.staffDisplayName,
        password: config.staffPassword,
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

      // Set custom claims with businessId and role
      await auth.setCustomUserClaims(uid, { businessId: config.id, role: user.role });

      await db.doc(`users/${uid}`).set({
        displayName: user.displayName,
        role: user.role,
        businesses: {
          [config.id]: {
            businessId: config.id,
            role: user.role,
            joinedAt: Timestamp.now(),
          },
        },
        createdAt: Timestamp.now(),
      });
    }
    console.log(`  ✅ Created ${users.length} users`);

    // ===== GET RESTAURANT DATA =====
    console.log(`  🍽️  Generating restaurant data...`);
    const { ingredients, menuItems } = config.dataGenerator();
    console.log(`  ✅ Generated ${ingredients.length} ingredients and ${menuItems.length} menu items`);

    // ===== CREATE INGREDIENTS =====
    console.log(`  🥫 Creating ingredients...`);
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

      await db.doc(`businesses/${config.id}/ingredients/${ingredient.id}`).set(docData);

      const versionId = `2025-v1`;
      await db.doc(`businesses/${config.id}/ingredients/${ingredient.id}/versions/${versionId}`).set({
        casePrice: ingredient.casePrice,
        unitsPerCase: ingredient.unitsPerCase,
        unitCost: ingredient.unitCost,
        effectiveFrom: Timestamp.now(),
        effectiveTo: null,
      });

      docData.currentVersionId = versionId;
      await db.doc(`businesses/${config.id}/ingredients/${ingredient.id}`).update({ currentVersionId: versionId });
    }
    console.log(`  ✅ Created ${ingredients.length} ingredients`);

    // ===== CREATE MENU ITEMS =====
    console.log(`  🌮 Creating menu items...`);
    for (const menuItem of menuItems) {
      await db.doc(`businesses/${config.id}/menuItems/${menuItem.id}`).set({
        name: menuItem.name,
        isActive: true,
        sellingPrice: menuItem.sellingPrice,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      for (const recipe of menuItem.recipes) {
        const recipeId = recipe.ingredientId;
        await db.doc(`businesses/${config.id}/menuItems/${menuItem.id}/recipes/${recipeId}`).set({
          ingredientId: recipe.ingredientId,
          quantity: recipe.quantity,
          unitOfMeasure: recipe.unitOfMeasure,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    }
    console.log(`  ✅ Created ${menuItems.length} menu items`);

    // ===== CREATE HISTORICAL WEEKS =====
    console.log(`  📅 Creating historical weeks...`);

    const inventoryEndValues: Record<string, number> = {};

    for (let weekIndex = 0; weekIndex < weekIds.length; weekIndex++) {
      const weekId = weekIds[weekIndex];
      const weekTimestamp = getWeekTimestamp(weekId);

      console.log(`    Creating week ${weekId}...`);

      // Create week document
      await db.doc(`businesses/${config.id}/weeks/${weekId}`).set({
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

      await db.doc(`businesses/${config.id}/weeks/${weekId}/sales/daily`).set({
        days: salesDays,
        updatedAt: weekTimestamp,
      });

      // Generate inventory data
      for (const ingredient of ingredients) {
        const previousEnd = inventoryEndValues[ingredient.id] || 0;
        const entry = generateInventoryEntry(ingredient.id, previousEnd);

        await db.doc(`businesses/${config.id}/weeks/${weekId}/inventory/${ingredient.id}`).set({
          ...entry,
          updatedAt: weekTimestamp,
        });

        // Track for next week
        inventoryEndValues[ingredient.id] = entry.end;

        // Create cost snapshot
        await db.doc(`businesses/${config.id}/weeks/${weekId}/costSnapshot/${ingredient.id}`).set({
          unitCost: ingredient.unitCost,
          sourceVersionId: '2025-v1',
          capturedAt: weekTimestamp,
        });
      }

      // Generate report
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

      await db.doc(`businesses/${config.id}/weeks/${weekId}/report/summary`).set({
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
    console.log(`  ✅ Created ${weekIds.length} finalized weeks`);

    // ===== CREATE CURRENT DRAFT WEEK =====
    console.log(`  📝 Creating current draft week...`);
    await db.doc(`businesses/${config.id}/weeks/${draftWeekId}`).set({
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

    await db.doc(`businesses/${config.id}/weeks/${draftWeekId}/sales/daily`).set({
      days: emptySalesDays,
      updatedAt: Timestamp.now(),
    });

    // Set beginning inventory from previous week's ending
    for (const ingredient of ingredients) {
      const previousEnd = inventoryEndValues[ingredient.id] || 0;
      await db.doc(`businesses/${config.id}/weeks/${draftWeekId}/inventory/${ingredient.id}`).set({
        begin: previousEnd,
        received: 0,
        end: 0,
        updatedAt: Timestamp.now(),
      });
    }
    console.log(`  ✅ Created draft week ${draftWeekId}`);

    console.log(`\n  ✨ ${config.name} setup complete!`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 All seed data created successfully!');
  console.log(`${'='.repeat(60)}\n`);

  console.log('📊 Summary:');
  for (const config of businessConfigs) {
    const { ingredients, menuItems } = config.dataGenerator();
    console.log(`\n  ${config.name}:`);
    console.log(`    - 2 users (owner + staff)`);
    console.log(`    - ${ingredients.length} ingredients`);
    console.log(`    - ${menuItems.length} menu items`);
    console.log(`    - ${weekIds.length} finalized weeks`);
    console.log(`    - 1 draft week`);
  }

  console.log('\n\n🔑 Login Credentials:');
  for (const config of businessConfigs) {
    console.log(`\n  ${config.name}:`);
    console.log(`    Owner: ${config.ownerEmail} / ${config.ownerPassword}`);
    console.log(`    Staff: ${config.staffEmail} / ${config.staffPassword}`);
  }
  console.log('');
};

main().catch((error) => {
  console.error('❌ Failed to seed Firebase project');
  console.error(error);
  process.exitCode = 1;
});
