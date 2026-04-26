# Sentinel Security Journal

## 2025-05-15 - [HIGH] Insecure Direct Object Reference (IDOR) and Privilege Escalation in Firestore Rules
**Vulnerability:** The `availabilities` collection allowed any authenticated user to write to any document. The `users` collection allowed users to modify their own `role` and `playerId`.
**Learning:** Default "isAuthenticated()" checks are insufficient for collections where documents are owned by specific users. Privilege escalation via "update" rules is a common gap when `affectedKeys()` is not used.
**Prevention:** Use `affectedKeys()` to block updates to sensitive fields. Implement cross-document ownership verification in Firestore rules (e.g., `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.playerId`).

## 2025-05-15 - [HIGH] Sensitive API Routes Missing Authentication and RBAC
**Vulnerability:** `/api/fftt/players` and `/api/teams/matches` were accessible without a session and exposed Player PII (email, phone) and internal team data.
**Learning:** Next.js middleware matchers often exclude `/api` routes, leading to a "secure by default" fallacy. Every API route must explicitly verify the session and check roles.
**Prevention:** Always use `adminAuth.verifySessionCookie` and `hasAnyRole` in API routes. Implement anti-caching headers (`Cache-Control: no-store`) for any response containing PII.
