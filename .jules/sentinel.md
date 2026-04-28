
## 2025-05-15 - Firestore Rules Hardening and CSRF Protection
**Vulnerability:** Insecure Firestore rules for 'availabilities' collection (IDOR) and missing CSRF protection on coach request endpoint.
**Learning:** Middleware protection in Next.js might exclude /api routes, leading to a "Middleware Fallacy" where developers assume all routes are protected. Similarly, Firestore rules must explicitly mirror authentication requirements like email verification to ensure defense in depth.
**Prevention:** Always implement explicit ownership checks in Firestore rules (e.g., using a getPlayerId helper) and validate request origins in all state-changing API routes.
