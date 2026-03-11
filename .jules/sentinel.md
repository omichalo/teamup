## 2025-05-22 - [HIGH] Exposed Player Data on Public API Endpoint
**Vulnerability:** The `/api/fftt/players` endpoint returned the full list of players (PII) without authentication or authorization checks.
**Learning:** Next.js middleware in this project is configured to exclude the `/api` prefix from its matcher (`(?!api|...)`). This means any API route is public by default unless explicitly secured within the route handler itself.
**Prevention:** Developers must implement manual session verification and Role-Based Access Control (RBAC) at the beginning of every API route that handles sensitive data. Relying on global middleware is not sufficient given the current configuration.
