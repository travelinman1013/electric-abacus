# Firebase Expert Skill

## Overview
This skill transforms Claude into a Firebase expert, providing comprehensive guidance on building, deploying, and scaling applications using Google's Firebase platform. Firebase is a Backend-as-a-Service (BaaS) that offers real-time databases, authentication, hosting, cloud functions, storage, and analytics.

## Core Capabilities

### 1. Firebase Authentication
**Purpose**: Secure user authentication with multiple providers

**Key Features**:
- Email/Password authentication
- OAuth providers (Google, Facebook, Twitter, GitHub, Apple)
- Phone number authentication
- Anonymous authentication
- Custom authentication systems
- Multi-factor authentication (MFA)

**Best Practices**:
- Always implement security rules alongside authentication
- Use email verification for email/password signups
- Implement proper error handling for auth failures
- Store additional user data in Firestore/Realtime Database, not in auth profiles
- Use `onAuthStateChanged` listener to track authentication state
- Implement session management for web applications
- Use Firebase Admin SDK for server-side user management

**Common Patterns**:
```javascript
// Email/Password Authentication
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();

// Sign up
createUserWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    const user = userCredential.user;
  })
  .catch((error) => {
    console.error(error.code, error.message);
  });

// Sign in
signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    const user = userCredential.user;
  });

// Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
  } else {
    // User is signed out
  }
});
```

**Security Considerations**:
- Never store sensitive credentials in client-side code
- Use environment variables for API keys
- Implement rate limiting for authentication attempts
- Use blocking functions to validate users before account creation/sign-in

---

### 2. Cloud Firestore
**Purpose**: Flexible, scalable NoSQL document database

**Key Features**:
- Real-time synchronization across clients
- Offline support with automatic sync
- Rich querying capabilities (where, orderBy, limit)
- Subcollections for hierarchical data
- Transactions and batch writes
- Security rules for access control
- Automatic indexing

**Best Practices**:
- Structure data for how you'll query it, not how it's stored
- Avoid deeply nested data - use subcollections instead
- Denormalize data when necessary for performance
- Use collection group queries for querying across subcollections
- Implement pagination with `limit()` and `startAfter()`
- Batch writes for multiple operations (max 500 operations per batch)
- Use transactions for operations that must be atomic
- Optimize reads by fetching only needed fields with `select()`

**Data Modeling Guidelines**:
- Collections contain documents
- Documents contain fields (key-value pairs) and subcollections
- Maximum document size: 1MB
- Document IDs should be meaningful when possible
- Use timestamps (`serverTimestamp()`) for created/updated fields

**Common Patterns**:
```javascript
import { getFirestore, collection, doc, setDoc, getDoc, query, where, onSnapshot } from 'firebase/firestore';

const db = getFirestore();

// Add document with auto-generated ID
const docRef = await addDoc(collection(db, 'users'), {
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: serverTimestamp()
});

// Set document with custom ID
await setDoc(doc(db, 'users', userId), {
  name: 'John Doe',
  age: 30
});

// Get single document
const docSnap = await getDoc(doc(db, 'users', userId));
if (docSnap.exists()) {
  console.log(docSnap.data());
}

// Query documents
const q = query(
  collection(db, 'users'),
  where('age', '>', 18),
  orderBy('age'),
  limit(10)
);

// Real-time listener
const unsubscribe = onSnapshot(q, (querySnapshot) => {
  querySnapshot.forEach((doc) => {
    console.log(doc.id, doc.data());
  });
});

// Batch write
const batch = writeBatch(db);
batch.set(doc(db, 'users', 'user1'), { name: 'Alice' });
batch.update(doc(db, 'users', 'user2'), { age: 31 });
batch.delete(doc(db, 'users', 'user3'));
await batch.commit();
```

**Security Rules Example**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Public read, authenticated write
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.authorId;
    }
  }
}
```

---

### 3. Firebase Realtime Database
**Purpose**: Original Firebase database - JSON tree structure with real-time sync

**When to Use**:
- Simple data structures with frequent updates
- Need extremely low latency (<100ms)
- Mobile-first applications with limited queries
- Real-time presence systems
- Simple messaging/chat applications

**When to Use Firestore Instead**:
- Complex queries required
- Need better querying and indexing
- Structured data with relationships
- Need automatic scaling
- Modern applications (Firestore is the recommended default)

**Key Differences from Firestore**:
- Data is stored as JSON tree (vs documents/collections)
- Less powerful querying
- Charged by bandwidth and storage
- Single region deployment
- Simpler security rules syntax

**Common Patterns**:
```javascript
import { getDatabase, ref, set, onValue, push } from 'firebase/database';

const db = getDatabase();

// Write data
set(ref(db, 'users/' + userId), {
  username: 'john_doe',
  email: 'john@example.com'
});

// Read data once
const snapshot = await get(ref(db, 'users/' + userId));
console.log(snapshot.val());

// Real-time listener
const userRef = ref(db, 'users/' + userId);
onValue(userRef, (snapshot) => {
  const data = snapshot.val();
  console.log(data);
});

// Push (auto-generate key)
const newPostRef = push(ref(db, 'posts'));
set(newPostRef, {
  title: 'Post Title',
  timestamp: Date.now()
});
```

---

### 4. Cloud Functions for Firebase
**Purpose**: Serverless backend code triggered by events

**Trigger Types**:
1. **HTTPS Triggers**: Callable functions and direct HTTP requests
2. **Firestore Triggers**: onCreate, onUpdate, onDelete, onWrite
3. **Realtime Database Triggers**: onCreate, onUpdate, onDelete, onWrite
4. **Authentication Triggers**: onCreate, onDelete, blocking functions
5. **Storage Triggers**: onFinalize, onDelete, onArchive, onMetadataUpdate
6. **Pub/Sub Triggers**: Scheduled functions, topic messages
7. **Analytics Triggers**: conversion events

**Best Practices**:
- Keep functions focused and single-purpose
- Use async/await for cleaner asynchronous code
- Return promises for background functions
- Set appropriate timeout values (default: 60s, max: 540s)
- Use environment variables for configuration
- Implement proper error handling
- Use Cloud Functions 2nd gen for better performance (when available)
- Minimize cold starts by keeping functions warm or using min instances
- Offload heavy work to Cloud Functions to avoid client-side complexity

**Common Patterns**:
```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// HTTPS Callable Function
exports.addMessage = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const text = data.text;
  await admin.firestore().collection('messages').add({
    text: text,
    userId: context.auth.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return { success: true };
});

// Firestore Trigger
exports.onUserCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userData = snap.data();
    console.log('New user:', context.params.userId);
    
    // Initialize user profile
    await snap.ref.update({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      profileComplete: false
    });
  });

// Auth Trigger
exports.sendWelcomeEmail = functions.auth.user().onCreate((user) => {
  const email = user.email;
  const displayName = user.displayName;
  
  // Send welcome email logic here
  console.log(`Welcome email sent to ${email}`);
});

// Scheduled Function (Cloud Pub/Sub)
exports.scheduledFunction = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    console.log('Running scheduled cleanup');
    // Cleanup logic
  });

// Storage Trigger
exports.generateThumbnail = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    const contentType = object.contentType;
    
    if (!contentType.startsWith('image/')) {
      return;
    }
    
    // Generate thumbnail logic
  });
```

**Security in Cloud Functions**:
- Cloud Functions bypass Firestore/Realtime DB security rules (uses Admin SDK)
- Implement your own authorization logic within functions
- Validate input data thoroughly
- Use `context.auth` to get authenticated user info in callable functions

---

### 5. Firebase Storage
**Purpose**: Store and serve user-generated content (images, videos, files)

**Key Features**:
- Robust upload/download handling
- Automatic retries on network failures
- Security rules for access control
- Integration with Cloud Functions for processing
- CDN-backed for fast delivery
- Resume interrupted uploads

**Best Practices**:
- Use appropriate folder structure: `users/{userId}/images/{imageId}`
- Generate unique filenames to avoid collisions
- Validate file types and sizes on client and server
- Use Cloud Functions to process uploads (thumbnails, validation)
- Implement proper security rules
- Use signed URLs for temporary access
- Compress images before upload when possible

**Common Patterns**:
```javascript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();

// Upload file
const file = event.target.files[0];
const storageRef = ref(storage, `users/${userId}/profile.jpg`);

const snapshot = await uploadBytes(storageRef, file);
console.log('Uploaded file');

// Get download URL
const downloadURL = await getDownloadURL(snapshot.ref);

// Upload with metadata
const metadata = {
  contentType: 'image/jpeg',
  customMetadata: {
    'uploadedBy': userId
  }
};
await uploadBytes(storageRef, file, metadata);

// Monitor upload progress
const uploadTask = uploadBytesResumable(storageRef, file);
uploadTask.on('state_changed',
  (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    console.log('Upload is ' + progress + '% done');
  },
  (error) => {
    console.error(error);
  },
  () => {
    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
      console.log('File available at', downloadURL);
    });
  }
);
```

**Security Rules Example**:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only access their own files
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Validate image uploads
    match /images/{imageId} {
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

### 6. Firebase Hosting
**Purpose**: Deploy and serve web apps with global CDN

**Key Features**:
- Free SSL certificates
- Custom domain support
- Single-page app (SPA) support
- Automatic HTTP/2 and CDN distribution
- Version history and rollbacks
- Preview channels for testing

**Best Practices**:
- Use `firebase.json` for rewrite rules and headers
- Configure redirects for SEO
- Set up custom domains early
- Use preview channels for feature testing
- Implement security headers
- Configure caching appropriately
- Use rewrites for Cloud Functions integration

**Deployment Workflow**:
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize hosting
firebase init hosting

# Build your app first
npm run build

# Deploy
firebase deploy --only hosting

# Create preview channel
firebase hosting:channel:deploy preview-feature-x
```

**firebase.json Configuration**:
```json
{
  "hosting": {
    "public": "build",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ],
    "redirects": [
      {
        "source": "/old-page",
        "destination": "/new-page",
        "type": 301
      }
    ]
  }
}
```

---

### 7. Firebase Admin SDK (Server-Side)
**Purpose**: Administrative access to Firebase services from trusted environments

**Key Features**:
- Bypasses security rules
- User management
- Custom token generation
- Database administration
- Send push notifications (FCM)

**Best Practices**:
- Only use in trusted server environments
- Never expose service account keys in client code
- Implement your own authorization logic
- Use for batch operations and admin tasks
- Initialize once and reuse instance

**Common Patterns**:
```javascript
// Node.js server
const admin = require('firebase-admin');

// Initialize with service account (local development)
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize in Cloud Functions (automatic)
admin.initializeApp();

// User management
const user = await admin.auth().createUser({
  email: 'user@example.com',
  password: 'password123',
  displayName: 'John Doe'
});

// Custom token for custom auth
const customToken = await admin.auth().createCustomToken(userId);

// Firestore admin operations
const db = admin.firestore();
await db.collection('users').doc(userId).set({
  role: 'admin'
});

// Batch operations
const batch = db.batch();
// ... add operations
await batch.commit();
```

---

## Integration Patterns

### Authentication + Firestore
```javascript
// Create user profile after authentication
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

async function signUpUser(email, password, displayName) {
  const auth = getAuth();
  const db = getFirestore();
  
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      displayName: displayName,
      email: email,
      createdAt: serverTimestamp(),
      photoURL: null,
      bio: ''
    });
    
    return user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}
```

### Cloud Functions + Storage
```javascript
// Generate thumbnail when image uploaded
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs');

exports.generateThumbnail = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    const contentType = object.contentType;
    const bucket = admin.storage().bucket(object.bucket);
    
    if (!contentType.startsWith('image/')) {
      return null;
    }
    
    if (filePath.includes('thumb_')) {
      return null;
    }
    
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const thumbFileName = `thumb_${fileName}`;
    const thumbFilePath = path.join(os.tmpdir(), thumbFileName);
    const thumbStoragePath = path.join(path.dirname(filePath), thumbFileName);
    
    await bucket.file(filePath).download({ destination: tempFilePath });
    await sharp(tempFilePath).resize(200, 200).toFile(thumbFilePath);
    await bucket.upload(thumbFilePath, { destination: thumbStoragePath });
    
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(thumbFilePath);
    
    return null;
  });
```

---

## Project Setup

### Firebase SDK v9+ (Modular) - Recommended
```javascript
// Install
npm install firebase

// Initialize Firebase (src/firebase.js)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

### Environment Variables (.env)
```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## Performance Optimization

### 1. Reduce Reads/Writes
- Use real-time listeners only when necessary
- Implement pagination to limit documents fetched
- Cache data locally when appropriate
- Use `get()` instead of `onSnapshot()` for one-time reads

### 2. Optimize Queries
- Create composite indexes for complex queries
- Use `limit()` to restrict result size
- Implement pagination with `startAfter()` and `limitToLast()`
- Denormalize data to reduce joins

### 3. Bundle Size Optimization
- Use Firebase SDK v9+ modular imports (tree-shaking)
- Import only what you need
```javascript
// Good - modular
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Bad - imports everything
import firebase from 'firebase/compat/app';
```

### 4. Cost Management
- Monitor usage in Firebase Console
- Set up billing alerts
- Use Spark (free) plan for development
- Optimize security rules to prevent abuse
- Implement rate limiting for public endpoints

---

## Security Best Practices

### 1. Security Rules
- **Never** use `allow read, write: if true;` in production
- Always validate user authentication
- Validate data structure and types
- Implement field-level validation
- Use custom claims for role-based access

### 2. API Keys
- Firebase API keys are safe to expose in client code
- They identify your Firebase project, not authenticate users
- Use App Check to prevent abuse
- Restrict API keys in Google Cloud Console for added security

### 3. Data Privacy
- Never store sensitive data in plain text
- Use Cloud Functions for sensitive operations
- Implement proper user data deletion (GDPR compliance)
- Audit security rules regularly

---

## Common Issues & Solutions

### Issue: "Missing or insufficient permissions"
**Solution**: Check Firestore/Realtime DB security rules. Ensure user is authenticated and rules allow the operation.

### Issue: Cloud Functions timing out
**Solution**: 
- Increase timeout in `firebase.json`
- Optimize code for performance
- Return promises properly
- Use Cloud Functions 2nd gen

### Issue: High Firestore costs
**Solution**:
- Reduce unnecessary reads (use `get()` vs `onSnapshot()`)
- Implement pagination
- Cache data client-side
- Review and optimize queries

### Issue: "Function returned undefined"
**Solution**: Cloud Functions must return a promise or value. Ensure all async operations return promises.

### Issue: Offline data not syncing
**Solution**:
- Enable persistence: `enableIndexedDbPersistence(db)`
- Check network connectivity
- Verify security rules allow sync

---

## Testing

### Local Emulator Suite
```bash
# Install emulators
firebase init emulators

# Start emulators
firebase emulators:start

# Available emulators:
# - Authentication
# - Firestore
# - Realtime Database
# - Cloud Functions
# - Cloud Storage
# - Hosting
# - Pub/Sub
```

### Connect to Emulators in Code
```javascript
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';
import { connectFunctionsEmulator } from 'firebase/functions';

if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

---

## Resources & Documentation

- **Official Docs**: https://firebase.google.com/docs
- **Firebase Console**: https://console.firebase.google.com
- **Firebase CLI Reference**: https://firebase.google.com/docs/cli
- **Firestore Pricing**: https://firebase.google.com/pricing
- **Sample Projects**: https://github.com/firebase/functions-samples
- **Community**: Firebase Slack, Stack Overflow

---

## When to Use Firebase

### ✅ Great For:
- Rapid prototyping and MVPs
- Real-time applications (chat, collaboration)
- Mobile apps with offline support
- Apps with social features
- Serverless architectures
- Small to medium-scale applications

### ❌ Not Ideal For:
- Complex relational data models
- Applications requiring complex transactions
- High-volume data analytics
- Applications with strict data residency requirements
- Systems requiring full database control

---

## Quick Reference Commands

```bash
# Firebase CLI
npm install -g firebase-tools
firebase login
firebase init
firebase deploy
firebase deploy --only functions
firebase deploy --only hosting
firebase emulators:start

# Cloud Functions
firebase functions:log
firebase functions:delete functionName

# Hosting
firebase hosting:channel:create preview
firebase hosting:channel:deploy preview
firebase hosting:channel:delete preview

# Firestore
firebase firestore:delete --all-collections
firebase firestore:indexes
```

---

## Version Notes

This skill is optimized for:
- Firebase SDK v9+ (modular)
- Cloud Functions 1st gen (2nd gen where noted)
- Firestore as the default database
- Modern JavaScript (ES6+) patterns

When answering questions, Claude should:
1. Recommend modern, modular SDK syntax
2. Suggest Firestore over Realtime Database for new projects
3. Provide security-conscious solutions
4. Include error handling
5. Explain the "why" behind best practices
6. Offer cost-optimization tips
7. Provide working, copy-paste ready code examples
