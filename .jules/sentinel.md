## 2025-05-15 - Unprotected API exposing Player PII
**Vulnerability:** The `/api/fftt/players` endpoint was completely unprotected, allowing anyone to retrieve the full list of players including sensitive fields like `email` and `phone`.
**Learning:** Middleware in this Next.js App Router project is configured to exclude the `/api` route prefix. This means every API route must manually implement its own authentication and authorization checks.
**Prevention:** Always verify session cookies and roles in API routes that expose sensitive data. Implement defense-in-depth measures like origin validation and anti-caching headers for such endpoints.
