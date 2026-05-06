## 2025-05-06 - [CRITICAL] Sensitive PII Leakage via Unprotected API Routes
**Vulnerability:** API routes under `/api/*` were excluded from the global Next.js middleware, leaving endpoints like `/api/fftt/players` (which returns player emails and phones) completely open to unauthenticated access.
**Learning:** Next.js middleware matchers that exclude `/api` require every single API route to manually implement session verification and RBAC. Developers often assume the middleware protects the entire app.
**Prevention:** Implement a mandatory security checklist for all new API routes. Consider a higher-order function `withAuth` to wrap API handlers and enforce session/role checks by default.
