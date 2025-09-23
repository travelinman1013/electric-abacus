import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch
} from 'firebase/firestore';

import type {
  ReportSummary,
  Week,
  WeekStatus,
  WeeklyCostSnapshotEntry,
  WeeklyInventoryEntry,
  WeeklySales
} from '@domain/costing';
import { computeReportSummary } from '@domain/costing';

import { getClientAuth, getClientFirestore } from '@taco/firebase';

import { timestampToIsoString, toNonNegativeNumber } from './utils';

const SALES_DOC_ID = 'daily';

const defaultSalesDoc: Omit<WeeklySales, 'id' | 'weekId'> = {
  mon: 0,
  tue: 0,
  wed: 0,
  thu: 0,
  fri: 0,
  sat: 0,
  sun: 0
};

export const listWeeks = async (): Promise<Week[]> => {
  const firestore = getClientFirestore();
  const weeksRef = collection(firestore, 'weeks');
  const snapshot = await getDocs(query(weeksRef, orderBy('createdAt', 'desc')));

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();

    return {
      id: docSnapshot.id,
      status: (data.status ?? 'draft') as WeekStatus,
      createdAt: timestampToIsoString(data.createdAt) ?? new Date().toISOString(),
      finalizedAt: timestampToIsoString(data.finalizedAt),
      finalizedBy: data.finalizedBy ?? null
    } satisfies Week;
  });
};

interface CreateWeekOptions {
  ingredientIds?: string[];
}

export const createWeek = async (weekId: string, options?: CreateWeekOptions) => {
  const firestore = getClientFirestore();
  const weekRef = doc(firestore, 'weeks', weekId);
  const salesRef = doc(firestore, 'weeks', weekId, 'sales', SALES_DOC_ID);
  const auth = getClientAuth();
  const currentUser = auth.currentUser;

  await runTransaction(firestore, async (transaction) => {
    const existing = await transaction.get(weekRef);
    if (existing.exists()) {
      throw new Error(`Week ${weekId} already exists`);
    }

    transaction.set(weekRef, {
      status: 'draft',
      createdAt: serverTimestamp(),
      finalizedAt: null,
      finalizedBy: null,
      createdBy: currentUser?.uid ?? null
    });

    transaction.set(salesRef, {
      ...defaultSalesDoc,
      updatedAt: serverTimestamp()
    });
  });

  if (options?.ingredientIds?.length) {
    const batch = writeBatch(firestore);
    options.ingredientIds.forEach((ingredientId) => {
      const inventoryRef = doc(firestore, 'weeks', weekId, 'inventory', ingredientId);
      batch.set(
        inventoryRef,
        {
          begin: 0,
          received: 0,
          end: 0,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });
    await batch.commit();
  }
};

export const getWeek = async (weekId: string): Promise<Week | null> => {
  const firestore = getClientFirestore();
  const weekRef = doc(firestore, 'weeks', weekId);
  const snapshot = await getDoc(weekRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return {
    id: snapshot.id,
    status: (data.status ?? 'draft') as WeekStatus,
    createdAt: timestampToIsoString(data.createdAt) ?? new Date().toISOString(),
    finalizedAt: timestampToIsoString(data.finalizedAt),
    finalizedBy: data.finalizedBy ?? null
  } satisfies Week;
};

export const getWeekSales = async (weekId: string): Promise<WeeklySales> => {
  const firestore = getClientFirestore();
  const salesRef = doc(firestore, 'weeks', weekId, 'sales', SALES_DOC_ID);
  const snapshot = await getDoc(salesRef);
  const data = snapshot.exists() ? snapshot.data() : undefined;

  return {
    id: SALES_DOC_ID,
    weekId,
    mon: toNonNegativeNumber(data?.mon),
    tue: toNonNegativeNumber(data?.tue),
    wed: toNonNegativeNumber(data?.wed),
    thu: toNonNegativeNumber(data?.thu),
    fri: toNonNegativeNumber(data?.fri),
    sat: toNonNegativeNumber(data?.sat),
    sun: toNonNegativeNumber(data?.sun)
  } satisfies WeeklySales;
};

export const saveWeekSales = async (weekId: string, input: Omit<WeeklySales, 'id' | 'weekId'>) => {
  const firestore = getClientFirestore();
  const salesRef = doc(firestore, 'weeks', weekId, 'sales', SALES_DOC_ID);
  await setDoc(
    salesRef,
    {
      ...input,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const getWeekInventory = async (weekId: string): Promise<WeeklyInventoryEntry[]> => {
  const firestore = getClientFirestore();
  const inventoryRef = collection(firestore, 'weeks', weekId, 'inventory');
  const snapshot = await getDocs(inventoryRef);

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      ingredientId: docSnapshot.id,
      begin: toNonNegativeNumber(data.begin),
      received: toNonNegativeNumber(data.received),
      end: toNonNegativeNumber(data.end)
    } satisfies WeeklyInventoryEntry;
  });
};

export const saveWeekInventory = async (weekId: string, entries: WeeklyInventoryEntry[]) => {
  const firestore = getClientFirestore();
  const batch = writeBatch(firestore);

  entries.forEach((entry) => {
    const inventoryRef = doc(firestore, 'weeks', weekId, 'inventory', entry.ingredientId);
    batch.set(
      inventoryRef,
      {
        begin: entry.begin,
        received: entry.received,
        end: entry.end,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  });

  await batch.commit();
};

export const getCostSnapshots = async (weekId: string): Promise<WeeklyCostSnapshotEntry[]> => {
  const firestore = getClientFirestore();
  const snapshotRef = collection(firestore, 'weeks', weekId, 'costSnapshot');
  const snapshot = await getDocs(snapshotRef);

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      ingredientId: docSnapshot.id,
      unitCost: toNonNegativeNumber(data.unitCost),
      sourceVersionId: data.sourceVersionId ?? 'unknown'
    } satisfies WeeklyCostSnapshotEntry;
  });
};

export const getWeekReport = async (weekId: string): Promise<ReportSummary | null> => {
  const firestore = getClientFirestore();
  const reportRef = doc(firestore, 'weeks', weekId, 'report', 'summary');
  const snapshot = await getDoc(reportRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as ReportSummary & { computedAt?: string | Timestamp };
  const computedAtValue =
    typeof data.computedAt === 'string'
      ? data.computedAt
      : timestampToIsoString(data.computedAt) ?? new Date().toISOString();

  return {
    ...data,
    computedAt: computedAtValue
  } satisfies ReportSummary;
};

export const getDraftWeeks = async (): Promise<Week[]> => {
  const firestore = getClientFirestore();
  const weeksRef = collection(firestore, 'weeks');
  const snapshot = await getDocs(query(weeksRef, where('status', '==', 'draft')));

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      status: 'draft',
      createdAt: timestampToIsoString(data.createdAt) ?? new Date().toISOString(),
      finalizedAt: null,
      finalizedBy: null
    } satisfies Week;
  });
};

export const finalizeWeek = async (weekId: string): Promise<ReportSummary> => {
  const firestore = getClientFirestore();
  const auth = getClientAuth();
  const currentUser = auth.currentUser;

  const summary = await runTransaction(firestore, async (transaction) => {
    const weekRef = doc(firestore, 'weeks', weekId);
    const weekSnapshot = await transaction.get(weekRef);
    if (!weekSnapshot.exists()) {
      throw new Error(`Week ${weekId} does not exist.`);
    }

    const weekData = weekSnapshot.data();
    const status = (weekData.status ?? 'draft') as WeekStatus;
    if (status === 'finalized') {
      throw new Error(`Week ${weekId} is already finalized.`);
    }

    const inventoryRef = collection(firestore, 'weeks', weekId, 'inventory');
    const inventorySnapshot = await transaction.get(inventoryRef);

    if (inventorySnapshot.empty) {
      throw new Error('Cannot finalize a week without inventory entries.');
    }

    const inventoryEntries = inventorySnapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        ingredientId: docSnapshot.id,
        begin: toNonNegativeNumber(data.begin),
        received: toNonNegativeNumber(data.received),
        end: toNonNegativeNumber(data.end)
      } satisfies WeeklyInventoryEntry;
    });

    const costSnapshots = await Promise.all(
      inventoryEntries.map(async (entry) => {
        const ingredientRef = doc(firestore, 'ingredients', entry.ingredientId);
        const ingredientSnapshot = await transaction.get(ingredientRef);

        if (!ingredientSnapshot.exists()) {
          throw new Error(`Ingredient ${entry.ingredientId} was not found while finalizing.`);
        }

        const ingredientData = ingredientSnapshot.data();

        return {
          ingredientId: entry.ingredientId,
          unitCost: toNonNegativeNumber(ingredientData.unitCost),
          sourceVersionId: ingredientData.currentVersionId ?? 'unspecified'
        } satisfies WeeklyCostSnapshotEntry;
      })
    );

    const summaryResult = computeReportSummary({
      inventory: inventoryEntries,
      costSnapshots
    });

    const snapshotCollectionRef = collection(firestore, 'weeks', weekId, 'costSnapshot');
    const existingSnapshots = await transaction.get(snapshotCollectionRef);
    const validSnapshotIds = new Set(costSnapshots.map((snapshot) => snapshot.ingredientId));
    existingSnapshots.docs.forEach((docSnapshot) => {
      if (!validSnapshotIds.has(docSnapshot.id)) {
        transaction.delete(docSnapshot.ref);
      }
    });

    costSnapshots.forEach((snapshot) => {
      const snapshotRef = doc(firestore, 'weeks', weekId, 'costSnapshot', snapshot.ingredientId);
      transaction.set(snapshotRef, {
        unitCost: snapshot.unitCost,
        sourceVersionId: snapshot.sourceVersionId,
        capturedAt: serverTimestamp()
      });
    });

    const reportRef = doc(firestore, 'weeks', weekId, 'report', 'summary');
    transaction.set(reportRef, {
      ...summaryResult,
      generatedAt: serverTimestamp()
    });

    transaction.update(weekRef, {
      status: 'finalized',
      finalizedAt: serverTimestamp(),
      finalizedBy: currentUser?.uid ?? null
    });

    return summaryResult;
  });

  return summary;
};
