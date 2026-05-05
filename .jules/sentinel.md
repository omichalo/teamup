## 2025-05-15 - API Route Security Gaps
**Vulnerability:** Sensitive API routes (e.g., `/api/fftt/players`) were exposed without session verification or RBAC, potentially leaking Player PII.
**Learning:** Next.js middleware matchers often exclude `/api` routes, creating a "Middleware Fallacy" where developers assume global protection that doesn't exist for the API layer.
**Prevention:** Use a standardized `withAuth` helper for all API routes to enforce session verification, email verification, and RBAC consistently, and always include anti-caching headers for sensitive data.
