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
  WeeklySales,
  WeeklySalesDay,
  WeekDay
} from '@domain/costing';
import { WEEK_DAYS, computeReportSummary } from '@domain/costing';

import { getClientAuth, getClientFirestore } from '@electric/firebase';

import { timestampToIsoString, toNonNegativeNumber } from './utils';

const SALES_DOC_ID = 'daily';

/**
 * Calculate the next week ID in ISO 8601 format (YYYY-W##)
 * Handles year rollover (W52/W53 -> W01 of next year)
 * @param weekId Current week ID (e.g., "2025-W38")
 * @returns Next week ID (e.g., "2025-W39")
 */
export const calculateNextWeekId = (weekId: string): string => {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid week ID format: ${weekId}. Expected format: YYYY-W##`);
  }

  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);

  // Check if current year has 53 weeks (years starting on Thursday or leap years starting on Wednesday)
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getUTCDay();
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const has53Weeks = jan1Day === 4 || (isLeapYear && jan1Day === 3);

  const maxWeek = has53Weeks ? 53 : 52;

  if (week >= maxWeek) {
    // Roll over to next year
    return `${year + 1}-W01`;
  }

  // Normal increment
  const nextWeek = week + 1;
  return `${year}-W${String(nextWeek).padStart(2, '0')}`;
};

const makeEmptySalesDay = (): WeeklySalesDay => ({
  foodSales: 0,
  drinkSales: 0,
  lessSalesTax: 0,
  lessPromo: 0
});

const makeEmptySalesDays = (): Record<WeekDay, WeeklySalesDay> => {
  const result = {} as Record<WeekDay, WeeklySalesDay>;
  WEEK_DAYS.forEach((day) => {
    result[day] = makeEmptySalesDay();
  });
  return result;
};

const defaultSalesDoc = (): Omit<WeeklySales, 'id' | 'weekId'> => ({
  days: makeEmptySalesDays()
});

export const listWeeks = async (businessId: string): Promise<Week[]> => {
  const firestore = getClientFirestore();
  const weeksRef = collection(firestore, 'businesses', businessId, 'weeks');
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
  initialInventory?: WeeklyInventoryEntry[];
}

export const createWeek = async (businessId: string, weekId: string, options?: CreateWeekOptions) => {
  const firestore = getClientFirestore();
  const weekRef = doc(firestore, 'businesses', businessId, 'weeks', weekId);
  const salesRef = doc(firestore, 'businesses', businessId, 'weeks', weekId, 'sales', SALES_DOC_ID);
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
      ...defaultSalesDoc(),
      updatedAt: serverTimestamp()
    });
  });

  // Create inventory entries with initial values if provided
  const batch = writeBatch(firestore);

  if (options?.initialInventory?.length) {
    // Use provided initial inventory (with begin values from previous week's end)
    options.initialInventory.forEach((entry) => {
      const inventoryRef = doc(firestore, 'businesses', businessId, 'weeks', weekId, 'inventory', entry.ingredientId);
      batch.set(
        inventoryRef,
        {
          begin: entry.begin,
          received: 0,
          end: 0,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });
  } else if (options?.ingredientIds?.length) {
    // Fallback: create empty inventory entries
    options.ingredientIds.forEach((ingredientId) => {
      const inventoryRef = doc(firestore, 'businesses', businessId, 'weeks', weekId, 'inventory', ingredientId);
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
  }

  if (options?.initialInventory?.length || options?.ingredientIds?.length) {
    await batch.commit();
  }
};

export const getWeek = async (businessId: string, weekId: string): Promise<Week | null> => {
  const firestore = getClientFirestore();
  const weekRef = doc(firestore, 'businesses', businessId, 'weeks', weekId);
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

const parseSalesDay = (raw: unknown): WeeklySalesDay => {
  const day = makeEmptySalesDay();

  if (typeof raw === 'number') {
    day.foodSales = toNonNegativeNumber(raw);
    return day;
  }

  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    day.foodSales = toNonNegativeNumber(
      record.foodSales ?? record.dailyGross ?? record.grossSales ?? record.netSales ?? 0
    );
    day.drinkSales = toNonNegativeNumber(record.drinkSales ?? record.beverageSales ?? 0);
    day.lessSalesTax = toNonNegativeNumber(
      record.lessSalesTax ?? record.salesTax ?? record.tax ?? 0
    );
    day.lessPromo = toNonNegativeNumber(record.lessPromo ?? record.promo ?? record.promotions ?? 0);
    return day;
  }

  return day;
};

const normalizeSalesDays = (
  input: Partial<Record<string, WeeklySalesDay>> | null | undefined
): Record<WeekDay, WeeklySalesDay> => {
  const normalized = {} as Record<WeekDay, WeeklySalesDay>;
  WEEK_DAYS.forEach((dayKey) => {
    normalized[dayKey] = parseSalesDay(input?.[dayKey]);
  });
  return normalized;
};

export const getWeekSales = async (businessId: string, weekId: string): Promise<WeeklySales> => {
  const firestore = getClientFirestore();
  const salesRef = doc(firestore, 'businesses', businessId, 'weeks', weekId, 'sales', SALES_DOC_ID);
  const snapshot = await getDoc(salesRef);
  const data = snapshot.exists() ? snapshot.data() : undefined;

  return {
    id: SALES_DOC_ID,
    weekId,
    days: normalizeSalesDays((data?.days as Partial<Record<string, WeeklySalesDay>>) ?? data ?? {})
  } satisfies WeeklySales;
};

export const saveWeekSales = async (businessId: string, weekId: string, input: Omit<WeeklySales, 'id' | 'weekId'>) => {
  const firestore = getClientFirestore();
  const salesRef = doc(firestore, 'businesses', businessId, 'weeks', weekId, 'sales', SALES_DOC_ID);
  await setDoc(
    salesRef,
    {
      days: normalizeSalesDays(input.days),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const getWeekInventory = async (businessId: string, weekId: string): Promise<WeeklyInventoryEntry[]> => {
  const firestore = getClientFirestore();
  const inventoryRef = collection(firestore, 'businesses', businessId, 'weeks', weekId, 'inventory');
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

export const saveWeekInventory = async (businessId: string, weekId: string, entries: WeeklyInventoryEntry[]) => {
  const firestore = getClientFirestore();
  const batch = writeBatch(firestore);

  entries.forEach((entry) => {
    const inventoryRef = doc(firestore, 'businesses', businessId, 'weeks', weekId, 'inventory', entry.ingredientId);
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

export const getCostSnapshots = async (businessId: string, weekId: string): Promise<WeeklyCostSnapshotEntry[]> => {
  const firestore = getClientFirestore();
  const snapshotRef = collection(firestore, 'businesses', businessId, 'weeks', weekId, 'costSnapshot');
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

export const getWeekReport = async (businessId: string, weekId: string): Promise<ReportSummary | null> => {
  const firestore = getClientFirestore();
  const reportRef = doc(firestore, 'businesses', businessId, 'weeks', weekId, 'report', 'summary');
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

export const getDraftWeeks = async (businessId: string): Promise<Week[]> => {
  const firestore = getClientFirestore();
  const weeksRef = collection(firestore, 'businesses', businessId, 'weeks');
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

export const finalizeWeek = async (businessId: string, weekId: string): Promise<ReportSummary> => {
  const firestore = getClientFirestore();
  const auth = getClientAuth();
  const currentUser = auth.currentUser;

  // Fetch inventory entries before the transaction to avoid Firestore transaction query limitations
  const inventoryEntries = await getWeekInventory(businessId, weekId);

  if (inventoryEntries.length === 0) {
    throw new Error('Cannot finalize a week without inventory entries.');
  }

  const summary = await runTransaction(firestore, async (transaction) => {
    const weekRef = doc(firestore, 'businesses', businessId, 'weeks', weekId);
    const weekSnapshot = await transaction.get(weekRef);
    if (!weekSnapshot.exists()) {
      throw new Error(`Week ${weekId} does not exist.`);
    }

    const weekData = weekSnapshot.data();
    const status = (weekData.status ?? 'draft') as WeekStatus;
    if (status === 'finalized') {
      throw new Error(`Week ${weekId} is already finalized.`);
    }

    const costSnapshots = await Promise.all(
      inventoryEntries.map(async (entry) => {
        const ingredientRef = doc(firestore, 'businesses', businessId, 'ingredients', entry.ingredientId);
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

    // Write cost snapshots (no need to clean up old ones - they'll be overwritten or ignored)
    costSnapshots.forEach((snapshot) => {
      const snapshotRef = doc(firestore, 'businesses', businessId, 'weeks', weekId, 'costSnapshot', snapshot.ingredientId);
      transaction.set(snapshotRef, {
        unitCost: snapshot.unitCost,
        sourceVersionId: snapshot.sourceVersionId,
        capturedAt: serverTimestamp()
      });
    });

    const reportRef = doc(firestore, 'businesses', businessId, 'weeks', weekId, 'report', 'summary');
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

  // After successful finalization, automatically create next week with carry-forward inventory
  try {
    const nextWeekId = calculateNextWeekId(weekId);

    // Check if next week already exists to avoid duplicates
    const nextWeekExists = await getWeek(businessId, nextWeekId);
    if (!nextWeekExists) {
      // Prepare initial inventory: begin = current week's end
      const initialInventory = inventoryEntries.map((entry) => ({
        ingredientId: entry.ingredientId,
        begin: entry.end, // Carry forward ending inventory
        received: 0,
        end: 0
      }));

      // Create the next week with carried-forward inventory
      await createWeek(businessId, nextWeekId, { initialInventory });
    }
  } catch (error) {
    // Log the error but don't fail the finalization if next week creation fails
    console.error(`Failed to auto-create next week after finalizing ${weekId}:`, error);
    // The finalization itself succeeded, so we still return the summary
  }

  return summary;
};
