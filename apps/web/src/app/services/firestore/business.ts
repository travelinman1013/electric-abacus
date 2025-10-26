import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import type { CustomTerminology } from '@domain/terminology';

import { getClientFirestore } from '@electric/firebase';

/**
 * Firestore data structure for business documents
 */
interface FirestoreBusinessData {
  name: string;
  createdAt: unknown;
  customTerminology?: Partial<Record<string, string>>;
}

/**
 * Business profile with custom terminology
 */
export interface BusinessProfile {
  id: string;
  name: string;
  createdAt: string;
  customTerminology?: Partial<CustomTerminology>;
}

/**
 * Fetch a business profile by ID
 */
export async function getBusinessProfile(businessId: string): Promise<BusinessProfile | null> {
  const db = getClientFirestore();
  const businessRef = doc(db, 'businesses', businessId);
  const businessSnap = await getDoc(businessRef);

  if (!businessSnap.exists()) {
    return null;
  }

  const data = businessSnap.data() as FirestoreBusinessData;

  return {
    id: businessSnap.id,
    name: data.name || 'Unnamed Business',
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    customTerminology: data.customTerminology as Partial<CustomTerminology> | undefined,
  };
}

/**
 * Update business custom terminology
 */
export async function updateBusinessTerminology(
  businessId: string,
  terminology: Partial<Record<string, string>>
): Promise<void> {
  const db = getClientFirestore();
  const businessRef = doc(db, 'businesses', businessId);

  await updateDoc(businessRef, {
    customTerminology: terminology,
  });
}

/**
 * Reset business terminology to defaults (remove customTerminology field)
 */
export async function resetBusinessTerminology(businessId: string): Promise<void> {
  const db = getClientFirestore();
  const businessRef = doc(db, 'businesses', businessId);

  await updateDoc(businessRef, {
    customTerminology: deleteField(),
  });
}
