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
  where
} from 'firebase/firestore';

import type { Ingredient, IngredientVersion } from '@domain/costing';

import { getClientFirestore } from '@taco/firebase';

import { timestampToIsoString } from './utils';
import { ensureId } from './ids';

export interface CreateIngredientInput {
  id?: string;
  name: string;
  unitOfMeasure: string;
  unitsPerCase: number;
  casePrice: number;
  isActive?: boolean;
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

export const listIngredients = async (): Promise<Ingredient[]> => {
  const firestore = getClientFirestore();
  const ingredientsRef = collection(firestore, 'ingredients');
  const snapshot = await getDocs(query(ingredientsRef, orderBy('name')));

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    const ingredient: Ingredient = {
      id: docSnapshot.id,
      name: data.name,
      unitOfMeasure: data.unitOfMeasure,
      unitsPerCase: data.unitsPerCase,
      casePrice: data.casePrice,
      unitCost: data.unitCost,
      isActive: data.isActive ?? true,
      currentVersionId: data.currentVersionId ?? undefined
    };
    return ingredient;
  });
};

export const getIngredientVersions = async (ingredientId: string): Promise<IngredientVersion[]> => {
  const firestore = getClientFirestore();
  const versionsRef = collection(firestore, 'ingredients', ingredientId, 'versions');
  const snapshot = await getDocs(query(versionsRef, orderBy('effectiveFrom', 'desc')));

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
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

  const unitCost = toUnitCost(input.casePrice, input.unitsPerCase);
  const versionId = `${Date.now()}`;

  await runTransaction(firestore, async (transaction) => {
    const existing = await transaction.get(ingredientRef);
    if (existing.exists()) {
      throw new Error('Ingredient already exists');
    }

    transaction.set(ingredientRef, {
      name: input.name,
      unitOfMeasure: input.unitOfMeasure,
      unitsPerCase: input.unitsPerCase,
      casePrice: input.casePrice,
      unitCost,
      isActive: input.isActive ?? true,
      currentVersionId: versionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

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
    unitOfMeasure: input.unitOfMeasure,
    unitsPerCase: input.unitsPerCase,
    casePrice: input.casePrice,
    unitCost,
    isActive: input.isActive ?? true,
    currentVersionId: versionId
  } satisfies Ingredient;
};

export const updateIngredient = async (input: UpdateIngredientInput): Promise<void> => {
  const firestore = getClientFirestore();
  const ingredientRef = doc(firestore, 'ingredients', input.id);
  const versionsRef = collection(firestore, 'ingredients', input.id, 'versions');

  const unitCost = toUnitCost(input.casePrice, input.unitsPerCase);
  const newVersionId = `${Date.now()}`;

  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(ingredientRef);
    if (!snapshot.exists()) {
      throw new Error('Ingredient not found');
    }
    const data = snapshot.data();

    transaction.update(ingredientRef, {
      name: input.name,
      unitOfMeasure: input.unitOfMeasure,
      unitsPerCase: input.unitsPerCase,
      casePrice: input.casePrice,
      unitCost,
      isActive: input.isActive ?? true,
      currentVersionId: newVersionId,
      updatedAt: serverTimestamp()
    });

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
  const data = snapshot.data();
  return {
    id: ingredientId,
    name: data.name,
    unitOfMeasure: data.unitOfMeasure,
    unitsPerCase: data.unitsPerCase,
    casePrice: data.casePrice,
    unitCost: data.unitCost,
    isActive: data.isActive ?? true,
    currentVersionId: data.currentVersionId ?? undefined
  } satisfies Ingredient;
};
