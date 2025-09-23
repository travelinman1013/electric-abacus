import { readFile } from 'node:fs/promises';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'taco-casa-demo';

beforeAll(async () => {
  const rules = await readFile('firestore.rules', 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules
    }
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/owner-1'), { displayName: 'Owner', role: 'owner' });
    await setDoc(doc(db, 'users/team-1'), { displayName: 'Team', role: 'teamMember' });
    await setDoc(doc(db, 'weeks/2025-W01'), {
      status: 'draft',
      createdAt: '2025-01-01T00:00:00.000Z'
    });
    await setDoc(doc(db, 'weeks/2025-W02'), {
      status: 'finalized',
      createdAt: '2025-01-08T00:00:00.000Z'
    });
  });
});

describe('Firestore security rules', () => {
  it('allows team members to edit sales in draft weeks only', async () => {
    const teamDb = testEnv.authenticatedContext('team-1').firestore();
    const draftRef = doc(teamDb, 'weeks/2025-W01/sales/daily');
    const finalizedRef = doc(teamDb, 'weeks/2025-W02/sales/daily');

    await assertSucceeds(
      setDoc(draftRef, { mon: 100, tue: 110, wed: 120, thu: 130, fri: 140, sat: 150, sun: 160 })
    );

    await assertFails(
      setDoc(finalizedRef, {
        mon: 90,
        tue: 90,
        wed: 90,
        thu: 90,
        fri: 90,
        sat: 90,
        sun: 90
      })
    );
  });

  it('prevents team members from reading cost snapshot data', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'weeks/2025-W01/costSnapshot/cheese'), {
        unitCost: 1.25,
        sourceVersionId: 'v1'
      });
    });

    const teamDb = testEnv.authenticatedContext('team-1').firestore();
    const snapshotRef = doc(teamDb, 'weeks/2025-W01/costSnapshot/cheese');

    await assertFails(getDoc(snapshotRef));
  });

  it('allows owners to manage cost snapshots while draft and blocks after finalization', async () => {
    const ownerDb = testEnv.authenticatedContext('owner-1').firestore();
    const draftSnapshot = doc(ownerDb, 'weeks/2025-W01/costSnapshot/beef');
    const finalSnapshot = doc(ownerDb, 'weeks/2025-W02/costSnapshot/beef');

    await assertSucceeds(
      setDoc(draftSnapshot, { unitCost: 2.5, sourceVersionId: 'v5' })
    );

    await assertFails(
      setDoc(finalSnapshot, { unitCost: 2.5, sourceVersionId: 'v7' })
    );
  });

  it('allows owners to create ingredients while blocking team members', async () => {
    const ownerDb = testEnv.authenticatedContext('owner-1').firestore();
    await assertSucceeds(
      setDoc(doc(ownerDb, 'ingredients/cheese'), {
        name: 'Cheese',
        casePrice: 30,
        unitsPerCase: 10,
        unitOfMeasure: 'lb',
        unitCost: 3,
        isActive: true
      })
    );

    const teamDb = testEnv.authenticatedContext('team-1').firestore();
    await assertFails(
      setDoc(doc(teamDb, 'ingredients/beef'), {
        name: 'Beef',
        casePrice: 40,
        unitsPerCase: 5,
        unitOfMeasure: 'lb',
        unitCost: 8,
        isActive: true
      })
    );
  });

  it('blocks any writes to draft week inventory once finalized', async () => {
    const ownerDb = testEnv.authenticatedContext('owner-1').firestore();
    const finalizedInventory = doc(ownerDb, 'weeks/2025-W02/inventory/cheese');

    await assertFails(
      setDoc(finalizedInventory, { begin: 10, received: 5, end: 3 })
    );
  });
});
