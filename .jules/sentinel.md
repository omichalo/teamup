## 2026-04-16 - [CRITICAL] Missing authentication on PII-exposing API route
**Vulnerability:** The `/api/fftt/players` endpoint was publicly accessible and returned sensitive player data including email addresses and phone numbers.
**Learning:** API routes in Next.js (App Router) are not automatically protected by middleware if they are explicitly excluded in the matcher (as in this project). Each API route must implement its own authentication and authorization checks.
**Prevention:** Always implement session verification (`adminAuth.verifySessionCookie`) and role-based access control (`hasAnyRole`) in API routes that expose sensitive data. Add anti-caching headers to prevent PII leakage via caches.
