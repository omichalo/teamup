# Sentinel Security Journal

## 2026-03-27 - [HIGH] Unauthenticated access to player data
**Vulnerability:** The `/api/fftt/players` endpoint was publicly accessible and did not require any authentication or authorization.
**Learning:** Next.js middleware exclusions (like `/api`) can leave sensitive endpoints exposed if they don't implement their own checks.
**Prevention:** Always implement authentication and authorization checks in API routes that handle sensitive data, especially when they are excluded from global middleware.
