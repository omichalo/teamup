# Sentinel 🛡️ - Security Journal

## 2025-05-15 - Firestore Privilege Escalation and IDOR on Maps
**Vulnerability:** Permissive Firestore rules allowed any authenticated user to change their own role in the `/users` collection and modify any player's availability in the `/availabilities` collection (IDOR). Additionally, sensitive club credentials in `/clubSettings` were readable by all users.
**Learning:** In applications using a mix of Custom Claims and Firestore documents for user state, rules must explicitly block modification of sensitive fields using `request.resource.data.diff(resource.data).affectedKeys()`. For documents containing maps (like `/availabilities`), the rule must verify that only the key corresponding to the user's UID is being modified.
**Prevention:** Always use `hasOnly` or `hasAny` on `affectedKeys()` to restrict which fields a user can update. Ensure that Custom Claims are prioritized as the source of truth in session verification APIs.
