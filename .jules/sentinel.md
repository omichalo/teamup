## 2025-05-15 - Inconsistent CSRF protection and weak token validation
**Vulnerability:** Several state-changing API routes lacked CSRF protection, and the existing CSRF token validation was a simple string comparison without integrity checks or expiration.
**Learning:** Legacy endpoints often miss security decorators when they are added to the codebase incrementally. Standard Next.js middleware was configured to exclude `/api` routes, creating a "Middleware Fallacy" where developers might assume all routes are protected.
**Prevention:** Implement a standard `validateOrigin` or `validateCSRFToken` check in all non-GET API routes. Use HMAC-SHA256 for token integrity and enforce strict expiration.
