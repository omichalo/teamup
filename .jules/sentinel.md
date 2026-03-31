## 2025-05-15 - [HIGH] Unsecured Players API Endpoint
**Vulnerability:** The `/api/fftt/players` endpoint was publicly accessible and returned sensitive player data (names, points, potentially emails/phones) from Firestore without any authentication or authorization checks.
**Learning:** API routes in Next.js App Router are not automatically protected by middleware if they are explicitly excluded (as seen in `middleware.ts`). Each sensitive API route must implement its own session and role verification.
**Prevention:** Always verify session cookies and user roles using `adminAuth.verifySessionCookie` and `hasAnyRole` at the beginning of sensitive API routes. Implement anti-caching headers for responses containing PII.
