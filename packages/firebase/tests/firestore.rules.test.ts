import { readFile } from 'node:fs/promises';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'taco-casa-demo';
const BUSINESS_ID = 'business-1';

beforeAll(async () => {
  const rules = await readFile('../../firestore.rules', 'utf8');
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
    // Create users
    await setDoc(doc(db, 'users/owner-1'), {
      displayName: 'Owner',
      role: 'owner',
      businesses: { [BUSINESS_ID]: { businessId: BUSINESS_ID, role: 'owner', joinedAt: new Date() } }
    });
    await setDoc(doc(db, 'users/team-1'), {
      displayName: 'Team',
      role: 'teamMember',
      businesses: { [BUSINESS_ID]: { businessId: BUSINESS_ID, role: 'teamMember', joinedAt: new Date() } }
    });
    // Create business
    await setDoc(doc(db, `businesses/${BUSINESS_ID}`), { name: 'Test Business', createdAt: new Date() });
    // Create weeks in business context
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/weeks/2025-W01`), {
      status: 'draft',
      createdAt: '2025-01-01T00:00:00.000Z'
    });
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/weeks/2025-W02`), {
      status: 'finalized',
      createdAt: '2025-01-08T00:00:00.000Z'
    });
  });
});

describe('Firestore security rules', () => {
  describe('Batch ingredient validation', () => {
    it('allows creating a valid batch ingredient', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();

      await assertSucceeds(
        setDoc(doc(ownerDb, `businesses/${BUSINESS_ID}/ingredients/seasoned-beef`), {
          name: 'Seasoned Beef',
          inventoryUnit: 'lb',
          unitsPerCase: 10,
          casePrice: 0,
          unitCost: 0,
          isActive: true,
          category: 'food',
          isBatch: true,
          yield: 8,
          yieldUnit: 'lb',
          recipeIngredients: [
            { ingredientId: 'beef', quantity: 10, unitOfMeasure: 'lb' },
            { ingredientId: 'seasoning', quantity: 2, unitOfMeasure: 'oz' }
          ]
        })
      );
    });

    it('rejects batch ingredient with missing yield', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();

      await assertFails(
        setDoc(doc(ownerDb, `businesses/${BUSINESS_ID}/ingredients/seasoned-beef`), {
          name: 'Seasoned Beef',
          inventoryUnit: 'lb',
          unitsPerCase: 10,
          casePrice: 0,
          unitCost: 0,
          isActive: true,
          category: 'food',
          isBatch: true,
          yieldUnit: 'lb',
          recipeIngredients: [
            { ingredientId: 'beef', quantity: 10, unitOfMeasure: 'lb' }
          ]
        })
      );
    });

    it('rejects batch ingredient with zero yield', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();

      await assertFails(
        setDoc(doc(ownerDb, `businesses/${BUSINESS_ID}/ingredients/seasoned-beef`), {
          name: 'Seasoned Beef',
          inventoryUnit: 'lb',
          unitsPerCase: 10,
          casePrice: 0,
          unitCost: 0,
          isActive: true,
          category: 'food',
          isBatch: true,
          yield: 0,
          yieldUnit: 'lb',
          recipeIngredients: [
            { ingredientId: 'beef', quantity: 10, unitOfMeasure: 'lb' }
          ]
        })
      );
    });

    it('rejects batch ingredient with missing yieldUnit', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();

      await assertFails(
        setDoc(doc(ownerDb, `businesses/${BUSINESS_ID}/ingredients/seasoned-beef`), {
          name: 'Seasoned Beef',
          inventoryUnit: 'lb',
          unitsPerCase: 10,
          casePrice: 0,
          unitCost: 0,
          isActive: true,
          category: 'food',
          isBatch: true,
          yield: 8,
          recipeIngredients: [
            { ingredientId: 'beef', quantity: 10, unitOfMeasure: 'lb' }
          ]
        })
      );
    });

    it('rejects batch ingredient with empty recipeIngredients', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();

      await assertFails(
        setDoc(doc(ownerDb, `businesses/${BUSINESS_ID}/ingredients/seasoned-beef`), {
          name: 'Seasoned Beef',
          inventoryUnit: 'lb',
          unitsPerCase: 10,
          casePrice: 0,
          unitCost: 0,
          isActive: true,
          category: 'food',
          isBatch: true,
          yield: 8,
          yieldUnit: 'lb',
          recipeIngredients: []
        })
      );
    });

    it('rejects batch ingredient with invalid recipe ingredient (missing ingredientId)', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();

      await assertFails(
        setDoc(doc(ownerDb, `businesses/${BUSINESS_ID}/ingredients/seasoned-beef`), {
          name: 'Seasoned Beef',
          inventoryUnit: 'lb',
          unitsPerCase: 10,
          casePrice: 0,
          unitCost: 0,
          isActive: true,
          category: 'food',
          isBatch: true,
          yield: 8,
          yieldUnit: 'lb',
          recipeIngredients: [
            { quantity: 10, unitOfMeasure: 'lb' }
          ]
        })
      );
    });

    it('rejects batch ingredient with invalid recipe ingredient (zero quantity)', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();

      await assertFails(
        setDoc(doc(ownerDb, `businesses/${BUSINESS_ID}/ingredients/seasoned-beef`), {
          name: 'Seasoned Beef',
          inventoryUnit: 'lb',
          unitsPerCase: 10,
          casePrice: 0,
          unitCost: 0,
          isActive: true,
          category: 'food',
          isBatch: true,
          yield: 8,
          yieldUnit: 'lb',
          recipeIngredients: [
            { ingredientId: 'beef', quantity: 0, unitOfMeasure: 'lb' }
          ]
        })
      );
    });

    it('allows creating a regular (non-batch) ingredient', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();

      await assertSucceeds(
        setDoc(doc(ownerDb, `businesses/${BUSINESS_ID}/ingredients/cheese`), {
          name: 'Cheese',
          inventoryUnit: 'lb',
          casePrice: 30,
          unitsPerCase: 10,
          unitCost: 3,
          isActive: true,
          category: 'food'
        })
      );
    });
  });

  it('allows team members to edit sales in draft weeks only', async () => {
    const teamDb = testEnv.authenticatedContext('team-1', { businessId: BUSINESS_ID, role: 'teamMember' }).firestore();
    const draftRef = doc(teamDb, `businesses/${BUSINESS_ID}/weeks/2025-W01/sales/daily`);
    const finalizedRef = doc(teamDb, `businesses/${BUSINESS_ID}/weeks/2025-W02/sales/daily`);

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
      await setDoc(doc(db, `businesses/${BUSINESS_ID}/weeks/2025-W01/costSnapshot/cheese`), {
        unitCost: 1.25,
        sourceVersionId: 'v1'
      });
    });

    const teamDb = testEnv.authenticatedContext('team-1', { businessId: BUSINESS_ID, role: 'teamMember' }).firestore();
    const snapshotRef = doc(teamDb, `businesses/${BUSINESS_ID}/weeks/2025-W01/costSnapshot/cheese`);

    await assertFails(getDoc(snapshotRef));
  });

  it('allows owners to manage cost snapshots while draft and blocks after finalization', async () => {
    const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();
    const draftSnapshot = doc(ownerDb, `businesses/${BUSINESS_ID}/weeks/2025-W01/costSnapshot/beef`);
    const finalSnapshot = doc(ownerDb, `businesses/${BUSINESS_ID}/weeks/2025-W02/costSnapshot/beef`);

    await assertSucceeds(
      setDoc(draftSnapshot, { unitCost: 2.5, sourceVersionId: 'v5' })
    );

    await assertFails(
      setDoc(finalSnapshot, { unitCost: 2.5, sourceVersionId: 'v7' })
    );
  });

  it('allows owners to create ingredients while blocking team members', async () => {
    const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();
    await assertSucceeds(
      setDoc(doc(ownerDb, `businesses/${BUSINESS_ID}/ingredients/cheese`), {
        name: 'Cheese',
        casePrice: 30,
        unitsPerCase: 10,
        inventoryUnit: 'lb',
        unitCost: 3,
        isActive: true,
        category: 'food'
      })
    );

    const teamDb = testEnv.authenticatedContext('team-1', { businessId: BUSINESS_ID, role: 'teamMember' }).firestore();
    await assertFails(
      setDoc(doc(teamDb, `businesses/${BUSINESS_ID}/ingredients/beef`), {
        name: 'Beef',
        casePrice: 40,
        unitsPerCase: 5,
        inventoryUnit: 'lb',
        unitCost: 8,
        isActive: true,
        category: 'food'
      })
    );
  });

  it('blocks any writes to draft week inventory once finalized', async () => {
    const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();
    const finalizedInventory = doc(ownerDb, `businesses/${BUSINESS_ID}/weeks/2025-W02/inventory/cheese`);

    await assertFails(
      setDoc(finalizedInventory, { begin: 10, received: 5, end: 3 })
    );
  });

  describe('Finalize behavior restrictions', () => {
    it('blocks cost snapshot creation in finalized weeks', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();
      const finalizedSnapshot = doc(ownerDb, `businesses/${BUSINESS_ID}/weeks/2025-W02/costSnapshot/beef`);

      await assertFails(
        setDoc(finalizedSnapshot, {
          unitCost: 8.50,
          sourceVersionId: 'v1',
          capturedAt: new Date()
        })
      );
    });

    it('blocks cost snapshot updates in finalized weeks', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `businesses/${BUSINESS_ID}/weeks/2025-W02/costSnapshot/beef`), {
          unitCost: 8.00,
          sourceVersionId: 'v1',
          capturedAt: new Date()
        });
      });

      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();
      const finalizedSnapshot = doc(ownerDb, `businesses/${BUSINESS_ID}/weeks/2025-W02/costSnapshot/beef`);

      await assertFails(
        updateDoc(finalizedSnapshot, { unitCost: 8.50 })
      );
    });

    it('allows cost snapshot creation in draft weeks', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();
      const draftSnapshot = doc(ownerDb, `businesses/${BUSINESS_ID}/weeks/2025-W01/costSnapshot/beef`);

      await assertSucceeds(
        setDoc(draftSnapshot, {
          unitCost: 8.50,
          sourceVersionId: 'v1',
          capturedAt: new Date()
        })
      );
    });

    it('blocks report creation in finalized weeks', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();
      const finalizedReport = doc(ownerDb, `businesses/${BUSINESS_ID}/weeks/2025-W02/report/summary`);

      await assertFails(
        setDoc(finalizedReport, {
          totals: { totalUsageUnits: 100, totalCostOfSales: 500 },
          breakdown: [],
          generatedAt: new Date()
        })
      );
    });

    it('blocks report updates in finalized weeks', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `businesses/${BUSINESS_ID}/weeks/2025-W02/report/summary`), {
          totals: { totalUsageUnits: 90, totalCostOfSales: 450 },
          breakdown: [],
          generatedAt: new Date()
        });
      });

      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();
      const finalizedReport = doc(ownerDb, `businesses/${BUSINESS_ID}/weeks/2025-W02/report/summary`);

      await assertFails(
        updateDoc(finalizedReport, {
          totals: { totalUsageUnits: 100, totalCostOfSales: 500 }
        })
      );
    });

    it('allows report creation in draft weeks', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();
      const draftReport = doc(ownerDb, `businesses/${BUSINESS_ID}/weeks/2025-W01/report/summary`);

      await assertSucceeds(
        setDoc(draftReport, {
          totals: { totalUsageUnits: 100, totalCostOfSales: 500 },
          breakdown: [],
          generatedAt: new Date()
        })
      );
    });

    it('blocks sales updates in finalized weeks', async () => {
      const teamDb = testEnv.authenticatedContext('team-1', { businessId: BUSINESS_ID, role: 'teamMember' }).firestore();
      const finalizedSales = doc(teamDb, `businesses/${BUSINESS_ID}/weeks/2025-W02/sales/daily`);

      await assertFails(
        setDoc(finalizedSales, {
          mon: 100,
          tue: 110,
          wed: 120,
          thu: 130,
          fri: 140,
          sat: 150,
          sun: 160
        })
      );
    });

    it('blocks inventory updates in finalized weeks', async () => {
      const teamDb = testEnv.authenticatedContext('team-1', { businessId: BUSINESS_ID, role: 'teamMember' }).firestore();
      const finalizedInventory = doc(teamDb, `businesses/${BUSINESS_ID}/weeks/2025-W02/inventory/cheese`);

      await assertFails(
        setDoc(finalizedInventory, { begin: 10, received: 5, end: 3 })
      );
    });

    it('blocks updating week status from finalized back to draft', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();
      const finalizedWeek = doc(ownerDb, `businesses/${BUSINESS_ID}/weeks/2025-W02`);

      await assertFails(
        updateDoc(finalizedWeek, { status: 'draft' })
      );
    });

    it('allows updating week status from draft to finalized', async () => {
      const ownerDb = testEnv.authenticatedContext('owner-1', { businessId: BUSINESS_ID, role: 'owner' }).firestore();
      const draftWeek = doc(ownerDb, `businesses/${BUSINESS_ID}/weeks/2025-W01`);

      await assertSucceeds(
        updateDoc(draftWeek, {
          status: 'finalized',
          finalizedAt: new Date(),
          finalizedBy: 'owner-1'
        })
      );
    });
  });
});
