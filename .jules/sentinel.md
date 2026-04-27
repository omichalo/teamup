# Sentinel Security Journal

## 2025-05-15 - [CRITICAL] Unsecured Sensitive API Endpoints
**Vulnerability:** API routes exposing PII (Player email, phone) and internal match data were publicly accessible without authentication or authorization checks.
**Learning:** Next.js middleware matchers that exclude `/api` routes can lead to a "secure by default" fallacy. Developers might assume global protection applies to all routes, while API routes require manual security implementation.
**Prevention:** Every API route must explicitly implement session verification (e.g., `adminAuth.verifySessionCookie`) and RBAC where appropriate. Sensitive data responses should include anti-caching headers (`Cache-Control: no-store`).

## 2025-05-15 - [HIGH] Missing CSRF Protection on State-Changing API
**Vulnerability:** The `/api/coach/request` endpoint (POST) lacked origin validation, making it susceptible to Cross-Site Request Forgery (CSRF) attacks.
**Learning:** Authentication (cookies) alone does not protect against CSRF. State-changing operations must verify the request source.
**Prevention:** Use `validateOrigin(req)` from `@/lib/auth/csrf-utils` at the beginning of all state-changing API handlers (POST, PUT, PATCH, DELETE).
