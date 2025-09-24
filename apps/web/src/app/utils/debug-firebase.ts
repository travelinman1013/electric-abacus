import { getClientAuth, getClientFirestore } from '@taco/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const debugFirebaseConnection = async () => {
  console.log('🔍 Starting Firebase connection debug...');

  try {
    // Test 1: Get Firebase instances
    console.log('🔍 Test 1: Getting Firebase instances...');
    const auth = getClientAuth();
    const firestore = getClientFirestore();
    console.log('✅ Firebase instances obtained:', { auth: !!auth, firestore: !!firestore });

    // Test 2: Test authentication with known user
    console.log('🔍 Test 2: Testing authentication...');
    const testEmail = 'regan.owner@tacocasa.test';
    const testPassword = 'OwnerPass123!';

    console.log('🔐 Attempting sign in with:', testEmail);
    const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Authentication successful:', {
      uid: userCredential.user.uid,
      email: userCredential.user.email
    });

    // Test 3: Test Firestore access
    console.log('🔍 Test 3: Testing Firestore access...');
    const userDoc = doc(firestore, `users/${userCredential.user.uid}`);
    const userSnapshot = await getDoc(userDoc);

    if (userSnapshot.exists()) {
      console.log('✅ Firestore access successful:', userSnapshot.data());
    } else {
      console.log('⚠️ User document not found in Firestore');
    }

    console.log('🎉 All Firebase tests passed!');
    return { success: true, user: userCredential.user };

  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    console.error('Error details:', {
      code: (error as any)?.code,
      message: (error as any)?.message,
      stack: (error as any)?.stack
    });
    return { success: false, error };
  }
};