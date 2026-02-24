# Sentinel Security Journal 🛡️

## 2025-02-24 - Unprotected API Routes Data Leak
**Vulnerability:** Several API routes (`/api/fftt/players`, `/api/teams/matches`) were publicly accessible without authentication, exposing sensitive player data and match details from Firestore. These routes bypassed the security policies defined in Firestore rules by using `firebase-admin` on the server without implementing their own authentication checks.

**Learning:** In Next.js App Router, middleware matchers might exclude `/api` routes by default, or developers might assume that server-side code is "safe" or that Firestore rules apply to `firebase-admin` (they don't). This leads to an inconsistent security posture where some routes are protected and others are wide open.

**Prevention:** Use a shared authentication utility (`verifyApiAuth`) for all API routes that access sensitive data. Always ensure that `initializeFirebaseAdmin()` is called before accessing any Firebase Admin services to prevent initialization errors. Document security requirements for every route in the OpenAPI specification to maintain visibility.
