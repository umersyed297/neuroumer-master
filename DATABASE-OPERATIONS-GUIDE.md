# 📊 Database Operations Guide - NeuroShield

## Database: Firebase Firestore

Your application uses **Firebase Firestore** as the database, with operations split between client-side and server-side.

---

## 🔧 Database Configuration

### Client-Side Setup
**File:** `src/lib/firebase.ts`

```typescript
import { getFirestore } from 'firebase/firestore';

const db = getFirestore(app);
export { db };
```

### Server-Side Setup
**File:** `src/lib/firebase-admin.ts`

```typescript
import * as admin from 'firebase-admin';

export const adminDb = admin.firestore();
```

---

## 📚 Collections Structure

### 1. `users` Collection
Stores user profiles and roles.

**Document Structure:**
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  profilePicUrl: string;
  role: 'admin' | 'user';
  createdAt: Timestamp;
  lastLogin: Timestamp;
}
```

### 2. `settings` Collection
Stores global application settings.

**Document:** `settings/global`
```typescript
{
  maintenanceMode: boolean;
  newRegistrationsEnabled: boolean;
}
```

---

## 🔍 Database Functions Used

### Client-Side Operations (Firebase SDK)

#### 1. **Read Operations**

**`getDoc()`** - Get a single document
```typescript
import { doc, getDoc } from 'firebase/firestore';

const userDocRef = doc(db, 'users', userId);
const userDoc = await getDoc(userDocRef);

if (userDoc.exists()) {
  const userData = userDoc.data();
}
```

**Used in:**
- `src/contexts/AuthContext.tsx` - Check user role during login

---

**`onSnapshot()`** - Real-time listener
```typescript
import { doc, onSnapshot } from 'firebase/firestore';

const settingsDocRef = doc(db, 'settings', 'global');
const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
  if (docSnap.exists()) {
    setSettings(docSnap.data());
  }
});
```

**Used in:**
- `src/contexts/AuthContext.tsx` - Listen to global settings changes

---

#### 2. **Write Operations**

**`setDoc()`** - Create or update document
```typescript
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const userDocRef = doc(db, 'users', userId);
await setDoc(userDocRef, {
  uid: userId,
  email: email,
  displayName: displayName,
  profilePicUrl: '/images/rr.png',
  role: 'user',
  createdAt: serverTimestamp(),
  lastLogin: serverTimestamp(),
});
```

**Used in:**
- `src/contexts/AuthContext.tsx` - Create user profile on signup
- `src/contexts/AuthContext.tsx` - Update last login time

---

**`setDoc()` with merge** - Update specific fields
```typescript
await setDoc(userDocRef, { 
  lastLogin: serverTimestamp(),
  email: currentUser.email,
  displayName: currentUser.displayName,
}, { merge: true });
```

**Used in:**
- `src/contexts/AuthContext.tsx` - Update user data without overwriting

---

### Server-Side Operations (Firebase Admin SDK)

#### 1. **Read Operations**

**`.get()`** - Get document (Admin SDK)
```typescript
const userDocRef = db.collection('users').doc(userId);
const userDoc = await userDocRef.get();

if (userDoc.exists()) {
  const role = userDoc.data()?.role;
}
```

**Used in:**
- `src/functions/src/index.ts` - Verify admin role
- `api/admin/users/*/route.ts` - Check permissions

---

#### 2. **Write Operations**

**`.set()`** - Create document
```typescript
await db.collection('users').doc(userId).set({
  uid: userId,
  email: email,
  displayName: displayName,
  role: role,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

**Used in:**
- `src/functions/src/index.ts` - Create user in `addUser` function

---

**`.update()`** - Update specific fields
```typescript
await db.collection('users').doc(userId).update({
  displayName: newDisplayName,
  role: newRole,
});
```

**Used in:**
- `src/functions/src/index.ts` - Update user in `editUser` function
- `src/functions/src/index.ts` - Grant admin role in `grantAdminRole`

---

**`.delete()`** - Delete document
```typescript
await db.collection('users').doc(userId).delete();
```

**Used in:**
- `src/functions/src/index.ts` - Delete user in `deleteUser` function

---

## 📍 Where Database Operations Happen

### 1. **AuthContext** (`src/contexts/AuthContext.tsx`)

**Operations:**
- ✅ **Read**: `getDoc()` - Check user role
- ✅ **Read**: `onSnapshot()` - Listen to global settings
- ✅ **Write**: `setDoc()` - Create user profile on signup
- ✅ **Write**: `setDoc()` with merge - Update last login

**Functions:**
```typescript
login()    // Reads user role from Firestore
signup()   // Creates user document
logout()   // No DB operation
```

---

### 2. **Cloud Functions** (`src/functions/src/index.ts`)

**Operations:**
- ✅ **Read**: `.get()` - Verify admin role
- ✅ **Write**: `.set()` - Create user
- ✅ **Write**: `.update()` - Update user
- ✅ **Write**: `.delete()` - Delete user

**Functions:**
```typescript
addUser()        // Creates user in Auth + Firestore
editUser()       // Updates user in Auth + Firestore
deleteUser()     // Deletes user from Auth + Firestore
grantAdminRole() // Updates user role to admin
verifyAdmin()    // Checks if user is admin
```

---

### 3. **API Routes** (`api/admin/users/*/route.ts`)

**Operations:**
- ✅ **Read**: `adminDb.collection().doc().get()` - Verify permissions
- ✅ **Write**: `adminDb.collection().doc().set()` - Create user
- ✅ **Write**: `adminDb.collection().doc().update()` - Update user
- ✅ **Write**: `adminDb.collection().doc().delete()` - Delete user

**Routes:**
```
POST /api/admin/users/add
POST /api/admin/users/edit
POST /api/admin/users/delete
```

---

## 🔐 Security Rules

Database access is controlled by:

1. **Firebase Authentication** - User must be logged in
2. **Role-based Access** - Admin role required for admin operations
3. **Firestore Security Rules** - Defined in `firestore.rules`

---

## 📊 Common Query Patterns

### Get User by ID
```typescript
const userDoc = await getDoc(doc(db, 'users', userId));
```

### Get User Role
```typescript
const userDoc = await getDoc(doc(db, 'users', userId));
const role = userDoc.data()?.role;
```

### Update User
```typescript
await setDoc(doc(db, 'users', userId), {
  lastLogin: serverTimestamp()
}, { merge: true });
```

### Listen to Settings
```typescript
onSnapshot(doc(db, 'settings', 'global'), (snap) => {
  setSettings(snap.data());
});
```

---

## 🚀 Summary

### Client-Side (Firebase SDK)
- **File**: `src/lib/firebase.ts`
- **Used in**: `src/contexts/AuthContext.tsx`
- **Functions**: `getDoc()`, `setDoc()`, `onSnapshot()`
- **Purpose**: User authentication, profile management, settings

### Server-Side (Admin SDK)
- **File**: `src/lib/firebase-admin.ts`
- **Used in**: `src/functions/src/index.ts`, API routes
- **Functions**: `.get()`, `.set()`, `.update()`, `.delete()`
- **Purpose**: Admin operations, user management

### Collections
1. **users** - User profiles and roles
2. **settings** - Global application settings

---

**No other database operations exist in the codebase.** All data fetching is done through these Firebase Firestore operations.
