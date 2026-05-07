## 2025-05-07 - Middleware Fallacy in Next.js API Routes
**Vulnerability:** API routes starting with `/api` were excluded from the global middleware's protection, leaving them open to CSRF and potentially other attacks if not manually secured.
**Learning:** Next.js middleware matchers often exclude `/api` to avoid affecting all API calls or because of different auth requirements, but this can lead to developers assuming all routes are protected when they aren't.
**Prevention:** Always implement manual session verification and CSRF protection (e.g., `validateOrigin`) in every API route that performs state-changing operations, especially when using session cookies.
