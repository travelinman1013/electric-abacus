import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

import type { MenuItem, RecipeIngredient } from '@domain/costing';

import { getClientFirestore } from '@taco/firebase';

import { ensureId } from './ids';

export interface MenuItemInput {
  id?: string;
  name: string;
  isActive?: boolean;
}

export interface RecipeInput {
  id?: string;
  ingredientId: string;
  quantity: number;
  unitOfMeasure: string;
}

export interface MenuItemWithRecipes {
  item: MenuItem;
  recipes: RecipeIngredient[];
}

export const listMenuItems = async (): Promise<MenuItem[]> => {
  const firestore = getClientFirestore();
  const itemsRef = collection(firestore, 'menuItems');
  const snapshot = await getDocs(query(itemsRef, orderBy('name')));

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      name: data.name,
      isActive: data.isActive ?? true
    } satisfies MenuItem;
  });
};

export const getMenuItemWithRecipes = async (menuItemId: string): Promise<MenuItemWithRecipes | null> => {
  const firestore = getClientFirestore();
  const itemRef = doc(firestore, 'menuItems', menuItemId);
  const snapshot = await getDoc(itemRef);
  if (!snapshot.exists()) {
    return null;
  }

  const itemData = snapshot.data();
  const recipesRef = collection(firestore, 'menuItems', menuItemId, 'recipes');
  const recipeSnapshot = await getDocs(recipesRef);

  const recipes = recipeSnapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      ingredientId: data.ingredientId,
      quantity: data.quantity,
      unitOfMeasure: data.unitOfMeasure
    } satisfies RecipeIngredient;
  });

  return {
    item: {
      id: snapshot.id,
      name: itemData.name,
      isActive: itemData.isActive ?? true
    },
    recipes
  } satisfies MenuItemWithRecipes;
};

export const upsertMenuItem = async (input: MenuItemInput, recipes: RecipeInput[]): Promise<MenuItem> => {
  const firestore = getClientFirestore();
  const menuItemId = ensureId(input.id, input.name);
  const itemRef = doc(firestore, 'menuItems', menuItemId);
  const batch = writeBatch(firestore);

  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(itemRef);
    if (snapshot.exists()) {
      transaction.update(itemRef, {
        name: input.name,
        isActive: input.isActive ?? true,
        updatedAt: serverTimestamp()
      });
    } else {
      transaction.set(itemRef, {
        name: input.name,
        isActive: input.isActive ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  });

  const recipesRef = collection(firestore, 'menuItems', menuItemId, 'recipes');
  const existingRecipes = await getDocs(recipesRef);
  const existingIds = new Set(existingRecipes.docs.map((docSnapshot) => docSnapshot.id));

  const nextIds = new Set<string>();
  recipes.forEach((recipe) => {
    const recipeId = recipe.id ?? ensureId(undefined, `${recipe.ingredientId}-${recipe.unitOfMeasure}`);
    nextIds.add(recipeId);
    const recipeRef = doc(firestore, 'menuItems', menuItemId, 'recipes', recipeId);
    batch.set(recipeRef, {
      ingredientId: recipe.ingredientId,
      quantity: recipe.quantity,
      unitOfMeasure: recipe.unitOfMeasure,
      updatedAt: serverTimestamp()
    });
  });

  existingIds.forEach((recipeId) => {
    if (!nextIds.has(recipeId)) {
      const recipeRef = doc(firestore, 'menuItems', menuItemId, 'recipes', recipeId);
      batch.delete(recipeRef);
    }
  });

  await batch.commit();

  return {
    id: menuItemId,
    name: input.name,
    isActive: input.isActive ?? true
  } satisfies MenuItem;
};

export const deleteMenuItem = async (menuItemId: string) => {
  const firestore = getClientFirestore();
  const recipesRef = collection(firestore, 'menuItems', menuItemId, 'recipes');
  const recipeSnapshot = await getDocs(recipesRef);
  const batch = writeBatch(firestore);
  recipeSnapshot.docs.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
  const itemRef = doc(firestore, 'menuItems', menuItemId);
  batch.delete(itemRef);
  await batch.commit();
};
