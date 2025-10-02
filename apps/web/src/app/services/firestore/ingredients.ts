import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData
} from 'firebase/firestore';

import type { Ingredient, IngredientCategory, IngredientVersion, RecipeIngredient } from '@domain/costing';
import { getConversionFactor } from '@domain/costing';

import { getClientFirestore } from '@taco/firebase';

import { timestampToIsoString } from './utils';
import { ensureId } from './ids';
import type { Timestamp } from 'firebase/firestore';

interface FirestoreIngredientData {
  name: string;
  inventoryUnit?: string;
  unitOfMeasure?: string;
  recipeUnit?: string;
  conversionFactor?: number;
  unitsPerCase: number;
  casePrice: number;
  unitCost: number;
  isActive?: boolean;
  category?: IngredientCategory;
  currentVersionId?: string;
  isBatch?: boolean;
  recipeIngredients?: RecipeIngredient[];
  yield?: number;
  yieldUnit?: string;
}

interface FirestoreIngredientVersionData {
  casePrice: number;
  unitsPerCase: number;
  unitCost: number;
  effectiveFrom: Timestamp;
  effectiveTo: Timestamp | null;
}

export interface CreateIngredientInput {
  id?: string;
  name: string;
  inventoryUnit: string;
  recipeUnit?: string;
  conversionFactor?: number;
  unitsPerCase: number;
  casePrice: number;
  category?: IngredientCategory;
  isActive?: boolean;
  // Batch ingredient fields
  isBatch?: boolean;
  recipeIngredients?: Array<{
    id: string;
    ingredientId: string;
    quantity: number;
    unitOfMeasure: string;
  }>;
  yield?: number;
  yieldUnit?: string;
}

export interface UpdateIngredientInput extends CreateIngredientInput {
  id: string;
}

const toUnitCost = (casePrice: number, unitsPerCase: number) => {
  if (!unitsPerCase) {
    throw new Error('Units per case must be greater than zero');
  }
  return Number((casePrice / unitsPerCase).toFixed(4));
};

const calculateConversionFactor = (inventoryUnit: string, recipeUnit?: string): number | undefined => {
  if (!recipeUnit) {
    return undefined;
  }

  const factor = getConversionFactor(inventoryUnit, recipeUnit);
  return factor !== null ? factor : undefined;
};

export const listIngredients = async (): Promise<Ingredient[]> => {
  const firestore = getClientFirestore();
  const ingredientsRef = collection(firestore, 'ingredients');
  const snapshot = await getDocs(query(ingredientsRef, orderBy('name')));

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as FirestoreIngredientData;
    const ingredient: Ingredient = {
      id: docSnapshot.id,
      name: data.name,
      inventoryUnit: data.inventoryUnit ?? data.unitOfMeasure ?? 'unit',
      recipeUnit: data.recipeUnit,
      conversionFactor: data.conversionFactor,
      unitsPerCase: data.unitsPerCase,
      casePrice: data.casePrice,
      unitCost: data.unitCost,
      isActive: data.isActive ?? true,
      category: data.category ?? 'food',
      currentVersionId: data.currentVersionId ?? undefined,
      // Batch ingredient fields
      isBatch: data.isBatch ?? false,
      recipeIngredients: data.recipeIngredients,
      yield: data.yield,
      yieldUnit: data.yieldUnit
    };
    return ingredient;
  });
};

export const getIngredientVersions = async (ingredientId: string): Promise<IngredientVersion[]> => {
  const firestore = getClientFirestore();
  const versionsRef = collection(firestore, 'ingredients', ingredientId, 'versions');
  const snapshot = await getDocs(query(versionsRef, orderBy('effectiveFrom', 'desc')));

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as FirestoreIngredientVersionData;
    return {
      id: docSnapshot.id,
      ingredientId,
      casePrice: data.casePrice,
      unitsPerCase: data.unitsPerCase,
      unitCost: data.unitCost,
      effectiveFrom: timestampToIsoString(data.effectiveFrom) ?? new Date().toISOString(),
      effectiveTo: timestampToIsoString(data.effectiveTo)
    } satisfies IngredientVersion;
  });
};

export const createIngredient = async (input: CreateIngredientInput): Promise<Ingredient> => {
  const firestore = getClientFirestore();
  const ingredientId = ensureId(input.id, input.name);
  const ingredientRef = doc(firestore, 'ingredients', ingredientId);

  // For batch ingredients, unit cost will be calculated dynamically, but we still need to store case price and units per case
  const unitCost = input.isBatch ? 0 : toUnitCost(input.casePrice, input.unitsPerCase);
  const conversionFactor = calculateConversionFactor(input.inventoryUnit, input.recipeUnit);
  const versionId = `${Date.now()}`;

  await runTransaction(firestore, async (transaction) => {
    const existing = await transaction.get(ingredientRef);
    if (existing.exists()) {
      throw new Error('Ingredient already exists');
    }

    const ingredientData: DocumentData = {
      name: input.name,
      inventoryUnit: input.inventoryUnit,
      recipeUnit: input.recipeUnit,
      conversionFactor,
      unitsPerCase: input.unitsPerCase,
      casePrice: input.casePrice,
      unitCost,
      isActive: input.isActive ?? true,
      category: input.category ?? 'food',
      currentVersionId: versionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Add batch-specific fields if this is a batch ingredient
    if (input.isBatch) {
      ingredientData.isBatch = true;
      ingredientData.recipeIngredients = input.recipeIngredients || [];
      ingredientData.yield = input.yield;
      ingredientData.yieldUnit = input.yieldUnit;
    }

    transaction.set(ingredientRef, ingredientData);

    const versionRef = doc(firestore, 'ingredients', ingredientId, 'versions', versionId);
    transaction.set(versionRef, {
      casePrice: input.casePrice,
      unitsPerCase: input.unitsPerCase,
      unitCost,
      effectiveFrom: serverTimestamp(),
      effectiveTo: null
    });
  });

  return {
    id: ingredientId,
    name: input.name,
    inventoryUnit: input.inventoryUnit,
    recipeUnit: input.recipeUnit,
    conversionFactor,
    unitsPerCase: input.unitsPerCase,
    casePrice: input.casePrice,
    unitCost,
    isActive: input.isActive ?? true,
    category: input.category ?? 'food',
    currentVersionId: versionId,
    // Batch ingredient fields
    isBatch: input.isBatch ?? false,
    recipeIngredients: input.recipeIngredients,
    yield: input.yield,
    yieldUnit: input.yieldUnit
  } satisfies Ingredient;
};

export const updateIngredient = async (input: UpdateIngredientInput): Promise<void> => {
  const firestore = getClientFirestore();
  const ingredientRef = doc(firestore, 'ingredients', input.id);
  const versionsRef = collection(firestore, 'ingredients', input.id, 'versions');

  // For batch ingredients, unit cost will be calculated dynamically
  const unitCost = input.isBatch ? 0 : toUnitCost(input.casePrice, input.unitsPerCase);
  const conversionFactor = calculateConversionFactor(input.inventoryUnit, input.recipeUnit);
  const newVersionId = `${Date.now()}`;

  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(ingredientRef);
    if (!snapshot.exists()) {
      throw new Error('Ingredient not found');
    }
    const data = snapshot.data() as FirestoreIngredientData;

    const updateData: DocumentData = {
      name: input.name,
      inventoryUnit: input.inventoryUnit,
      recipeUnit: input.recipeUnit,
      conversionFactor,
      unitsPerCase: input.unitsPerCase,
      casePrice: input.casePrice,
      unitCost,
      isActive: input.isActive ?? true,
      category: input.category ?? 'food',
      currentVersionId: newVersionId,
      updatedAt: serverTimestamp()
    };

    // Add batch-specific fields if this is a batch ingredient
    if (input.isBatch) {
      updateData.isBatch = true;
      updateData.recipeIngredients = input.recipeIngredients || [];
      updateData.yield = input.yield;
      updateData.yieldUnit = input.yieldUnit;
    } else {
      // Clear batch fields if converting from batch to regular ingredient
      updateData.isBatch = false;
      updateData.recipeIngredients = null;
      updateData.yield = null;
      updateData.yieldUnit = null;
    }

    transaction.update(ingredientRef, updateData);

    const previousVersionId: string | undefined = data.currentVersionId;
    if (previousVersionId) {
      const previousVersionRef = doc(versionsRef, previousVersionId);
      transaction.update(previousVersionRef, {
        effectiveTo: serverTimestamp()
      });
    }

    const versionRef = doc(versionsRef, newVersionId);
    transaction.set(versionRef, {
      casePrice: input.casePrice,
      unitsPerCase: input.unitsPerCase,
      unitCost,
      effectiveFrom: serverTimestamp(),
      effectiveTo: null
    });
  });
};

export const setIngredientActiveState = async (ingredientId: string, isActive: boolean) => {
  const firestore = getClientFirestore();
  const ingredientRef = doc(firestore, 'ingredients', ingredientId);
  await updateDoc(ingredientRef, {
    isActive,
    updatedAt: serverTimestamp()
  });
};

export const getActiveIngredientIds = async (): Promise<string[]> => {
  const firestore = getClientFirestore();
  const ingredientsRef = collection(firestore, 'ingredients');
  const snapshot = await getDocs(query(ingredientsRef, where('isActive', '==', true), limit(200)));
  return snapshot.docs.map((docSnapshot) => docSnapshot.id);
};

export const getIngredient = async (ingredientId: string): Promise<Ingredient | null> => {
  const firestore = getClientFirestore();
  const ingredientRef = doc(firestore, 'ingredients', ingredientId);
  const snapshot = await getDoc(ingredientRef);
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.data() as FirestoreIngredientData;
  return {
    id: ingredientId,
    name: data.name,
    inventoryUnit: data.inventoryUnit ?? data.unitOfMeasure ?? 'unit',
    recipeUnit: data.recipeUnit,
    conversionFactor: data.conversionFactor,
    unitsPerCase: data.unitsPerCase,
    casePrice: data.casePrice,
    unitCost: data.unitCost,
    isActive: data.isActive ?? true,
    category: data.category ?? 'food',
    currentVersionId: data.currentVersionId ?? undefined,
    // Batch ingredient fields
    isBatch: data.isBatch ?? false,
    recipeIngredients: data.recipeIngredients,
    yield: data.yield,
    yieldUnit: data.yieldUnit
  } satisfies Ingredient;
};

export const deleteIngredient = async (ingredientId: string) => {
  const firestore = getClientFirestore();
  const versionsRef = collection(firestore, 'ingredients', ingredientId, 'versions');
  const versionSnapshot = await getDocs(versionsRef);
  const batch = writeBatch(firestore);
  versionSnapshot.docs.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
  const ingredientRef = doc(firestore, 'ingredients', ingredientId);
  batch.delete(ingredientRef);
  await batch.commit();
};
