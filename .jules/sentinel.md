# SENTINEL'S JOURNAL - SQY PING TEAMUP SECURITY

## 2025-05-14 - API Middleware Bypass (PII Leak)
**Vulnerability:** Several API routes under `/api/*` were completely unprotected, exposing Player PII (emails, phone numbers) and club data to unauthenticated requests.
**Learning:** Developers assumed the global `middleware.ts` protected all routes, but the matcher explicitly excluded the `/api` prefix, leaving all API endpoints open by default unless manually secured.
**Prevention:** Consolidated API security into a `withAuth` higher-order function that enforces session verification, email verification, and RBAC. All new API routes must use this helper or implement equivalent manual checks.

## 2025-05-14 - Firebase Admin Initialization Lifecycle
**Vulnerability:** Calling `adminAuth.verifySessionCookie` before `initializeFirebaseAdmin()` causes runtime errors in serverless environments as the Firebase app is not yet initialized.
**Learning:** Next.js Route Handlers require explicit and early initialization of the Firebase Admin SDK before any service (Auth, Firestore) is accessed.
**Prevention:** The `withAuth` utility ensures `initializeFirebaseAdmin()` is awaited before attempting session verification.
