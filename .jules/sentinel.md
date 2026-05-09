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

## 2025-05-20 - Insecure Direct Object Reference (IDOR) in Availabilities
**Vulnerability:** The `availabilities` collection used a single document per match day with a `players` map. The security rules allowed any authenticated user to write to these documents, enabling any player to modify or delete the availability status of any other player, or even change match metadata (e.g., the match date).
**Learning:** Shared documents containing data for multiple users require granular field-level and key-level validation. Relying on `isAuthenticated()` for write access is a major security gap in multi-tenant or shared-resource architectures.
**Prevention:** Use `request.resource.data.diff(resource.data).affectedKeys()` to protect metadata and `request.resource.data.players.diff(resource.data.players).affectedKeys().hasOnly([playerId])` to ensure users can only modify their own entries in a shared map.
