# CORS Error Fix - Detailed Prompt for Firebase Studio

## Problem Description

I'm getting a CORS error when trying to delete a user in my Firebase application:

```
Access to fetch at 'https://us-central1-neuroshield-1f560.cloudfunctions.net/deleteUser' 
from origin 'https://6000-firebase-neuroumer-1764489926051.cluster-htdgsbmflbdmov5xrjithceibm.cloudworkstations.dev' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.

Error deleting user: FirebaseError: internal
```

## Root Cause

The application has TWO ways to handle user operations:
1. **Cloud Functions** (deployed to Firebase) - located in `functions/src/index.ts`
2. **Next.js API Routes** (server-side) - located in `api/admin/users/*/route.ts`

The frontend is incorrectly calling the Cloud Function URL directly, which causes CORS issues. It should be calling the Next.js API route instead.

## Solution Required

### Option 1: Fix Frontend to Use Next.js API Routes (RECOMMENDED)

**Find and update the frontend code** that's calling the Cloud Function and change it to use the Next.js API route instead.

**Current (Wrong):**
```javascript
// Calling Cloud Function directly - causes CORS error
const response = await fetch('https://us-central1-neuroshield-1f560.cloudfunctions.net/deleteUser', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({ data: { uid: userId } })
});
```

**Should be (Correct):**
```javascript
// Call Next.js API route - no CORS issues
const response = await fetch('/api/admin/users/delete', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({ uid: userId })  // Note: no 'data' wrapper needed
});
```

**Key Differences:**
- URL: Use `/api/admin/users/delete` instead of the Cloud Function URL
- Body structure: Send `{ uid: userId }` directly, NOT wrapped in `{ data: { uid: userId } }`
- Same authorization header format

**Apply this fix to ALL admin operations:**
- Delete user: `/api/admin/users/delete`
- Add user: `/api/admin/users/add`
- Edit user: `/api/admin/users/edit`

### Option 2: Fix CORS in Cloud Functions (If you must use Cloud Functions)

If you need to keep using Cloud Functions directly, update `functions/src/index.ts`:

**Current CORS setup:**
```typescript
const corsHandler = cors({ origin: true, credentials: true });
```

**Enhanced CORS setup:**
```typescript
const corsHandler = cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:9002',
    'https://6000-firebase-neuroumer-1764489926051.cluster-htdgsbmflbdmov5xrjithceibm.cloudworkstations.dev',
    /\.cloudworkstations\.dev$/,  // Allow all cloudworkstations domains
    /\.firebaseapp\.com$/,         // Allow Firebase hosting
    /\.web\.app$/                  // Allow Firebase web app domains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
});
```

**Then redeploy functions:**
```bash
npm run build
firebase deploy --only functions
```

## Files to Check/Update

### Frontend Files (likely locations):
- `src/app/admin/*/page.tsx` - Admin dashboard pages
- `src/components/admin/*` - Admin components
- `src/hooks/useAdmin.ts` or similar - Admin hooks
- Any file with `cloudfunctions.net` in the fetch URL

### Backend Files (already correct):
- ✅ `api/admin/users/delete/route.ts` - Next.js API route (working)
- ✅ `api/admin/users/add/route.ts` - Next.js API route (working)
- ✅ `api/admin/users/edit/route.ts` - Next.js API route (working)
- ⚠️ `functions/src/index.ts` - Cloud Functions (has CORS but needs enhancement)

## Expected Request Format

### For Next.js API Routes (Recommended):
```typescript
// DELETE USER
POST /api/admin/users/delete
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer <firebase-id-token>'
}
Body: { "uid": "user-uid-here" }

// ADD USER
POST /api/admin/users/add
Body: { "email": "...", "password": "...", "displayName": "...", "role": "..." }

// EDIT USER
POST /api/admin/users/edit
Body: { "uid": "...", "displayName": "...", "role": "..." }
```

### For Cloud Functions (if you must use them):
```typescript
// All operations need data wrapped in 'data' field
POST https://us-central1-neuroshield-1f560.cloudfunctions.net/deleteUser
Body: { "data": { "uid": "user-uid-here" } }
```

## Search Instructions

**Find the problematic code by searching for:**
1. `cloudfunctions.net` - Find all Cloud Function calls
2. `deleteUser` - Find the delete user implementation
3. `addUser` - Find the add user implementation
4. `editUser` - Find the edit user implementation
5. `grantAdminRole` - Find the grant admin implementation

**Replace all Cloud Function URLs with Next.js API routes:**
- `cloudfunctions.net/deleteUser` → `/api/admin/users/delete`
- `cloudfunctions.net/addUser` → `/api/admin/users/add`
- `cloudfunctions.net/editUser` → `/api/admin/users/edit`

## Why This Happens

1. **CORS (Cross-Origin Resource Sharing)** is a browser security feature
2. Your frontend runs on one domain (cloudworkstations.dev)
3. Cloud Functions run on another domain (cloudfunctions.net)
4. Browser blocks the request unless the server explicitly allows it
5. Next.js API routes run on the SAME domain as your frontend = no CORS issues

## Verification Steps

After fixing:
1. Open browser DevTools → Network tab
2. Try deleting a user
3. Check the request URL - should be `/api/admin/users/delete` NOT `cloudfunctions.net`
4. Should see 200 OK response
5. No CORS errors in console

## Additional Notes

- The Next.js API routes (`api/admin/users/*/route.ts`) are already implemented and working
- They use Firebase Admin SDK directly (no CORS issues)
- They have the same authentication and authorization logic as Cloud Functions
- Cloud Functions are still deployed but not needed for this application
- Using Next.js API routes is faster and more efficient (no external HTTP call)

---

**Please search the codebase for all instances of Cloud Function calls and replace them with Next.js API route calls as described above.**
