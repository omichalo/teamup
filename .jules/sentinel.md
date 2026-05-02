## 2025-05-15 - Hardening CSRF Protection and Securing Legacy API Routes
**Vulnerability:** Multiple state-changing API routes (`/api/coach/request`, `/api/brulage/validate`, `/api/teams/[teamId]/location`, `/api/teams/[teamId]/discord-channel`) were lacking CSRF protection (Origin/Referer validation). Additionally, the existing CSRF token utility was using a weak Base64-only token without cryptographic signatures.
**Learning:** Legacy endpoints often bypass global middleware (like the `api` exclusion in `middleware.ts`), leading to inconsistent security coverage if protection is not manually implemented in each route.
**Prevention:**
1. Always implement `validateOrigin` for state-changing API routes in Next.js when global middleware is bypassed.
2. Use cryptographically secure HMAC-SHA256 signatures for CSRF tokens to prevent tampering.
3. Use `crypto.timingSafeEqual` for sensitive comparisons to prevent timing attacks.
