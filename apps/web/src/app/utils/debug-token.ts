import { getClientAuth } from '@electric/firebase';

/**
 * Debug utility to inspect the current user's auth token and custom claims
 * Run this in the browser console to see what claims are actually present
 */
export async function debugAuthToken() {
  const auth = getClientAuth();
  const user = auth.currentUser;

  if (!user) {
    console.log('❌ No user logged in');
    return;
  }

  console.log('👤 Current user:', {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName
  });

  try {
    // Get token WITHOUT forcing refresh (shows cached token)
    console.log('\n📋 Checking CACHED token...');
    const cachedToken = await user.getIdTokenResult(false);
    console.log('Cached custom claims:', {
      businessId: cachedToken.claims.businessId || '❌ MISSING',
      role: cachedToken.claims.role || '❌ MISSING',
      allClaims: cachedToken.claims
    });

    // Get token WITH forced refresh (shows fresh token from server)
    console.log('\n🔄 Forcing token refresh from server...');
    const freshToken = await user.getIdTokenResult(true);
    console.log('Fresh custom claims:', {
      businessId: freshToken.claims.businessId || '❌ MISSING',
      role: freshToken.claims.role || '❌ MISSING',
      allClaims: freshToken.claims
    });

    // Compare
    const cachedHasClaims = cachedToken.claims.businessId && cachedToken.claims.role;
    const freshHasClaims = freshToken.claims.businessId && freshToken.claims.role;

    console.log('\n📊 Summary:');
    console.log('Cached token has claims:', cachedHasClaims ? '✅ YES' : '❌ NO');
    console.log('Fresh token has claims:', freshHasClaims ? '✅ YES' : '❌ NO');

    if (!cachedHasClaims && !freshHasClaims) {
      console.log('\n⚠️ PROBLEM: User has NO custom claims set in Firebase Auth');
      console.log('Solution: Run the backfill script or contact support');
    } else if (!cachedHasClaims && freshHasClaims) {
      console.log('\n⚠️ PROBLEM: Cached token is stale, but fresh token is good');
      console.log('Solution: Page will reload automatically');
      window.location.reload();
    } else {
      console.log('\n✅ Custom claims are present and valid');
    }
  } catch (error) {
    console.error('❌ Error getting token:', error);
  }
}

// Make it available globally for easy access in console
if (typeof window !== 'undefined') {
  (window as typeof window & { debugAuthToken: typeof debugAuthToken }).debugAuthToken = debugAuthToken;
  console.log('💡 Debug utility loaded! Run window.debugAuthToken() to check your auth token');
}
