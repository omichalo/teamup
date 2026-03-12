# Sentinel Security Journal

## 2025-05-15 - Privilege Escalation in Firestore Rules
**Vulnerability:** Firestore rules allowed users to update their own `role` and `coachRequestStatus` fields, enabling self-promotion to 'admin' or 'coach'.
**Learning:** Permissive `update` rules like `allow update: if request.auth.uid == userId` are insufficient when documents contain sensitive administrative fields.
**Prevention:** Use `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'coachRequestStatus'])` to explicitly block unauthorized field modifications.

## 2025-05-15 - Sensitive Data Exposure in Club Settings
**Vulnerability:** The `clubSettings` collection, containing Discord webhooks and FFTT credentials, was readable by any authenticated user.
**Learning:** Configuration collections often contain secrets that should only be accessible by backend processes or administrators.
**Prevention:** Always restrict `read` access to `isAdmin()` for collections storing system-wide configuration or credentials.
