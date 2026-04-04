## 2025-05-15 - [HIGH] Exposed Sensitive Player Data in /api/fftt/players
**Vulnerability:** The `/api/fftt/players` endpoint was publicly accessible and returned sensitive player information (email, phone, etc.) from Firestore without any authentication or authorization checks.
**Learning:** API routes in Next.js (App Router) that are excluded from global middleware (like `/api/*` in this project) must implement their own security checks. Relying on middleware alone can leave internal APIs exposed.
**Prevention:** Always implement session verification and RBAC in API routes. Use anti-caching headers for responses containing sensitive data. Add automated security tests to verify that these endpoints reject unauthenticated or unauthorized requests.
