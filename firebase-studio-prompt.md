# Complete Admin User Management System - Firebase Studio Prompt

## Project Overview
I need a complete admin user management system for my Next.js application with Firebase Admin SDK. The system should handle creating, updating, and deleting users with proper authentication, authorization, and error handling.

---

## 1. Firebase Admin SDK Configuration

**File: `src/lib/firebase-admin.ts`**

Create a Firebase Admin SDK initialization module that:
- Initializes Firebase Admin SDK only once (singleton pattern)
- Reads service account credentials from environment variable `FIREBASE_SERVICE_ACCOUNT`
- Properly handles the private key by replacing `\\n` with actual newlines
- Exports `adminAuth` and `adminDb` for use throughout the application
- Includes comprehensive error handling with clear messages

**Requirements:**
- Check if Firebase Admin is already initialized before initializing again
- Parse JSON service account from environment variable
- Extract `project_id`, `client_email`, and `private_key` from the service account
- Replace `\\n` in private key with actual newlines using `.replace(/\\n/g, '\n')`
- Log success message when initialized
- Throw descriptive errors if credentials are missing or invalid

---

## 2. Environment Variables

**File: `.env`**

Add the following environment variable with your Firebase service account JSON:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"YOUR_PROJECT_ID","private_key_id":"YOUR_KEY_ID","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@YOUR_PROJECT.iam.gserviceaccount.com","client_id":"YOUR_CLIENT_ID","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"YOUR_CERT_URL","universe_domain":"googleapis.com"}
```

**How to get this:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Convert to single-line string (keep `\n` in the private key)
5. Add to `.env` file

---

## 3. API Routes for User Management

### 3.1 Add User Route

**File: `src/app/api/admin/users/add/route.ts`**

Create a POST endpoint that:
- Verifies the caller has a valid Bearer token
- Checks if the caller has admin role in Firestore
- Validates required fields: `email`, `password`, `displayName`, `role`
- Creates user in Firebase Auth with `adminAuth.createUser()`
- Sets custom user claims with `adminAuth.setCustomUserClaims()`
- Creates user document in Firestore with fields:
  - `uid`, `email`, `displayName`, `role`
  - `createdAt` (server timestamp)
  - `profilePicUrl` (default: '/images/rr.png')
- Returns success message with new user data
- Handles all errors with proper error codes and messages

### 3.2 Edit User Route

**File: `src/app/api/admin/users/edit/route.ts`**

Create a POST endpoint that:
- Verifies the caller has a valid Bearer token
- Checks if the caller has admin role in Firestore
- Validates required fields: `uid`, `displayName`, `role`
- Updates user in Firebase Auth with `adminAuth.updateUser()`
- Updates custom user claims with `adminAuth.setCustomUserClaims()`
- Updates user document in Firestore
- Returns success message
- Handles all errors with proper error codes and messages

### 3.3 Delete User Route

**File: `src/app/api/admin/users/delete/route.ts`**

Create a POST endpoint that:
- Verifies the caller has a valid Bearer token
- Checks if the caller has admin role in Firestore
- Validates required field: `uid`
- Deletes user from Firebase Auth with `adminAuth.deleteUser()`
- Deletes user document from Firestore (with error handling for 'not-found')
- Returns success message
- Handles all errors with proper error codes and messages

**Important:** If Firestore deletion fails but Auth deletion succeeds, log a warning but don't fail the request.

---

## 4. Firebase Cloud Functions (Alternative Backend)

**File: `functions/src/index.ts`**

Create Firebase Cloud Functions as an alternative to API routes:

### 4.1 Helper Functions

**`getUidFromRequest`:**
- Extracts Bearer token from request headers
- Verifies the token using `admin.auth().verifyIdToken()`
- Returns the user's UID
- Throws 'unauthenticated' error if token is missing or invalid

**`verifyAdmin`:**
- Takes a UID as parameter
- Fetches user document from Firestore
- Checks if user has 'admin' role
- Throws 'permission-denied' error if not admin

### 4.2 Cloud Functions

**`addUser` (onRequest):**
- Uses CORS handler for cross-origin requests
- Only accepts POST requests
- Gets calling UID and verifies admin status
- Expects data in `req.body.data` with: `email`, `password`, `displayName`, `role`
- Creates user in Firebase Auth
- Sets custom claims
- Creates Firestore document
- Returns success response

**`editUser` (onRequest):**
- Uses CORS handler for cross-origin requests
- Only accepts POST requests
- Gets calling UID and verifies admin status
- Expects data in `req.body.data` with: `uid`, `displayName`, `role`
- Updates user in Firebase Auth
- Updates custom claims
- Updates Firestore document
- Returns success response

**`deleteUser` (onRequest):**
- Uses CORS handler for cross-origin requests
- Only accepts POST requests
- Gets calling UID and verifies admin status
- Expects data in `req.body.data` with: `uid`
- Deletes user from Firebase Auth
- Deletes Firestore document (with error handling)
- Returns success response

**`grantAdminRole` (onRequest):**
- Uses CORS handler for cross-origin requests
- Only accepts POST requests
- Gets calling UID and verifies admin status
- Expects data in `req.body.data` with: `email`
- Finds user by email
- Sets admin role in custom claims
- Updates Firestore document
- Returns success response

---

## 5. Frontend User Management Page

**File: `src/app/admin/users/page.tsx`**

Create an admin dashboard page that:

**Features:**
- Displays all users in a table with columns:
  - User (avatar, name, email)
  - Status (admin/user badge)
  - Report count
  - Joined date
  - Last login
  - Actions (edit/delete dropdown)
- Search functionality to filter users by name or email
- Refresh button to reload user data
- Add User button to create new users
- Edit and Delete actions for each user (disabled for current admin)

**Data Fetching:**
- Fetches users from Firestore `users` collection
- Fetches scan reports to count reports per user
- Converts Firestore timestamps to JavaScript dates
- Sorts users by creation date (newest first)

**User Actions:**
- Opens edit dialog for creating/editing users
- Opens delete confirmation dialog
- Calls appropriate API endpoints with Bearer token
- Shows toast notifications for success/error
- Refreshes user list after operations

**TypeScript Interface:**
```typescript
export interface NeuroUser {
  id: string;
  displayName: string;
  email: string;
  createdAt: Date | null;
  lastLogin?: Date | null;
  profilePicUrl?: string;
  role: 'admin' | 'user';
  reportCount: number;
}
```

---

## 6. User Edit Dialog Component

**File: `src/components/admin/UserEditDialog.tsx`**

Create a dialog component for adding/editing users:

**Features:**
- Form with fields: `displayName`, `email`, `role`, `password` (only for new users)
- Uses Zod for validation:
  - Display name: min 2 characters
  - Email: valid email format
  - Role: enum ['user', 'admin']
  - Password: min 8 characters (new users only)
- Email field is disabled when editing existing users
- Shows loading state while saving
- Resets form when dialog closes

**Props:**
- `user`: NeuroUser | null (null for new user)
- `isOpen`: boolean
- `onOpenChange`: (isOpen: boolean) => void
- `onSave`: (user: NeuroUser, values: any) => Promise<void>

---

## 7. Delete User Dialog Component

**File: `src/components/admin/DeleteUserDialog.tsx`**

Create a confirmation dialog for deleting users:

**Features:**
- Shows user's name and email in confirmation message
- Warning that action cannot be undone
- Shows loading state while deleting
- Cancel and confirm buttons

**Props:**
- `user`: NeuroUser | null
- `isOpen`: boolean
- `onOpenChange`: (isOpen: boolean) => void
- `onConfirm`: (user: NeuroUser) => Promise<void>

---

## 8. Error Handling Requirements

**All endpoints and functions must handle:**

1. **Authentication Errors:**
   - Missing or invalid Bearer token → 401 Unauthorized
   - Expired token → 401 Unauthorized

2. **Authorization Errors:**
   - Non-admin user trying to access admin endpoints → 403 Forbidden
   - User document not found → 403 Forbidden

3. **Validation Errors:**
   - Missing required fields → 400 Bad Request
   - Invalid email format → 400 Bad Request
   - Password too short → 400 Bad Request

4. **Firebase Errors:**
   - Email already exists → Return Firebase error code
   - User not found → Return Firebase error code
   - Permission denied → Return Firebase error code

5. **Network Errors:**
   - Firestore connection issues → 500 Internal Server Error
   - Auth service unavailable → 500 Internal Server Error

**Error Response Format:**
```json
{
  "error": {
    "code": "error-code",
    "message": "Human-readable error message"
  }
}
```

**Success Response Format:**
```json
{
  "data": {
    "message": "Success message",
    "newUser": { /* user object for add operation */ }
  }
}
```

---

## 9. Security Requirements

1. **Authentication:**
   - All admin endpoints must verify Bearer token
   - Token must be obtained from Firebase Auth

2. **Authorization:**
   - All admin operations must verify user has 'admin' role
   - Check role in Firestore user document
   - Verify custom claims match Firestore role

3. **CORS:**
   - Cloud Functions must use CORS handler
   - Allow credentials for authenticated requests

4. **Input Validation:**
   - Validate all input fields before processing
   - Sanitize email addresses
   - Enforce password requirements

5. **Firestore Rules:**
   - Admins can read/write all user documents
   - Users can only read/write their own document
   - Users cannot change their own role

---

## 10. Common Errors to Fix

**Error 1: "Failed to initialize Firebase Admin"**
- Cause: Missing or invalid `FIREBASE_SERVICE_ACCOUNT` in `.env`
- Fix: Add complete service account JSON to environment variable
- Fix: Ensure private key has `\n` for newlines

**Error 2: "Permission denied. Admin role required."**
- Cause: User document doesn't have 'admin' role
- Fix: Manually set role in Firestore or use `grantAdminRole` function
- Fix: Ensure custom claims are set correctly

**Error 3: "Unauthorized" (401)**
- Cause: Missing or invalid Bearer token
- Fix: Ensure frontend sends token in Authorization header
- Fix: Get fresh token using `user.getIdToken()`

**Error 4: "Email already exists"**
- Cause: Trying to create user with existing email
- Fix: Check if email exists before creating
- Fix: Show user-friendly error message

**Error 5: "User not found"**
- Cause: Trying to update/delete non-existent user
- Fix: Verify user exists before operation
- Fix: Handle gracefully in delete operation

**Error 6: Private key format error**
- Cause: Newlines not properly formatted in private key
- Fix: Use `.replace(/\\n/g, '\n')` when parsing private key
- Fix: Ensure JSON string has `\n` not actual newlines

---

## 11. Testing Checklist

After implementation, test:

- [ ] Firebase Admin SDK initializes successfully
- [ ] Admin can view list of all users
- [ ] Admin can create new user with email/password
- [ ] Admin can edit user's display name and role
- [ ] Admin can delete user (removes from Auth and Firestore)
- [ ] Non-admin users cannot access admin endpoints
- [ ] Email validation works correctly
- [ ] Password validation enforces minimum length
- [ ] Search functionality filters users correctly
- [ ] Toast notifications show for success/error
- [ ] Loading states display during operations
- [ ] Current admin cannot delete themselves
- [ ] Error messages are clear and helpful
- [ ] Firestore timestamps convert to dates correctly
- [ ] Report counts display accurately

---

## 12. Dependencies Required

**package.json:**
```json
{
  "dependencies": {
    "firebase": "^10.x.x",
    "firebase-admin": "^12.x.x",
    "next": "^14.x.x",
    "react": "^18.x.x",
    "react-hook-form": "^7.x.x",
    "zod": "^3.x.x",
    "@hookform/resolvers": "^3.x.x"
  }
}
```

**functions/package.json:**
```json
{
  "dependencies": {
    "firebase-admin": "^12.x.x",
    "firebase-functions": "^5.x.x",
    "cors": "^2.x.x"
  }
}
```

---

## Summary

This system provides complete admin user management with:
- Secure authentication and authorization
- Create, read, update, delete operations for users
- Both API routes (Next.js) and Cloud Functions (Firebase) implementations
- Comprehensive error handling
- User-friendly frontend interface
- Role-based access control
- Custom claims for Firebase Auth

Please implement all files with proper error handling, TypeScript types, and security measures as described above.
