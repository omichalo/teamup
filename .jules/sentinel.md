## 2025-05-15 - Unprotected API routes exposing PII
**Vulnerability:** API routes under `/api` were excluded from the global Next.js middleware, and some routes (like `/api/fftt/players`) were implemented without internal authentication/authorization checks, exposing PII (emails, phone numbers).
**Learning:** Next.js middleware `matcher` was configured to exclude all `/api` routes, shifting the responsibility of security to individual route handlers. Missing these checks leads to complete bypass of the application's security model.
**Prevention:** Every API route must explicitly verify the session cookie and user roles. A reusable security pattern or a specific API middleware should be used to ensure no route is left unprotected by default.
