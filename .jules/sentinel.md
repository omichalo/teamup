## 2025-05-15 - API Route Security Gaps
**Vulnerability:** Sensitive API routes (e.g., `/api/fftt/players`) were exposed without session verification or RBAC, potentially leaking Player PII.
**Learning:** Next.js middleware matchers often exclude `/api` routes, creating a "Middleware Fallacy" where developers assume global protection that doesn't exist for the API layer.
**Prevention:** Use a standardized `withAuth` helper for all API routes to enforce session verification, email verification, and RBAC consistently, and always include anti-caching headers for sensitive data.

## 2025-05-14 - Privilege Escalation via Unrestricted Firestore User Profile Updates
**Vulnerability:** The `users` collection allowed any authenticated user to create or update their own profile document without field-level restrictions. This permitted a malicious user to set their own `role` to `admin` or `coach` via the client-side SDK.
**Learning:** Relying on `request.auth.uid == userId` is insufficient for profile documents that contain authorization data (roles, permissions). Authorization fields must be explicitly protected from client-side modifications.
**Prevention:** Always use `affectedKeys().hasAny([...])` in Firestore rules to block client-side updates to sensitive fields like `role`, `permissions`, or `status`. Use `request.resource.data.get('role', 'player') == 'player'` on creation to enforce default low-privilege roles.

## 2025-05-07 - Middleware Fallacy in Next.js API Routes
**Vulnerability:** API routes starting with `/api` were excluded from the global middleware's protection, leaving them open to CSRF and potentially other attacks if not manually secured.
**Learning:** Next.js middleware matchers often exclude `/api` to avoid affecting all API calls or because of different auth requirements, but this can lead to developers assuming all routes are protected when they aren't.
**Prevention:** Always implement manual session verification and CSRF protection (e.g., `validateOrigin`) in every API route that performs state-changing operations, especially when using session cookies.

## 2025-05-20 - Email Enumeration and Loose Firestore Rules
**Vulnerability:** The `send-verification` API leaked user existence via 404 errors, and Firestore rules allowed any authenticated user to read/write sensitive data without email verification or strict ownership checks.
**Learning:** Authenticated != Authorized. Even for authenticated users, sensitive operations should require email verification (`isVerified`) and strict field-level validation (e.g., `affectedKeys()` and map key ownership checks).
**Prevention:** Always return generic success messages for auth flows to prevent enumeration. In Firestore rules, use a `isVerified()` helper and ensure players can only modify their own data within maps using cross-document lookups (e.g., `getPlayerId()`).
