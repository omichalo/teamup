## 2025-05-15 - [CRITICAL] Missing Authentication and Authorization in Player API
**Vulnerability:** The `/api/fftt/players` endpoint was entirely public, exposing PII of all club players from Firestore without any session verification or role checks.
**Learning:** Middleware configurations (`middleware.ts`) that exclude `/api` routes can leave endpoints vulnerable if developers assume global protection. Each API route must explicitly handle its own security if not covered by a unified middleware/guard.
**Prevention:** Implement a standard authentication and authorization check in all sensitive API routes. Use consistent patterns like `adminAuth.verifySessionCookie` and `hasAnyRole` to enforce access control.
