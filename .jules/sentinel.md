# Sentinel's Journal - Critical Security Learnings

## 2025-05-14 - Sensitive Data Exposure in Firestore
**Vulnerability:** The `clubSettings` collection, which contains sensitive credentials like FFTT passwords and Discord webhooks, was configured with `allow read: if isAuthenticated();`, allowing any logged-in user to access these secrets.
**Learning:** Even "settings" collections can contain highly sensitive data that must be restricted to admins. Defaulting to `allow read: if isAuthenticated()` is dangerous for configuration collections.
**Prevention:** Always restrict read access to the minimum necessary role (usually `admin`) for any collection containing service credentials or configuration secrets.

## 2025-05-14 - Privilege Escalation via Firestore Rules
**Vulnerability:** Users were allowed to `create` and `update` their own documents in the `/users` collection without field-level restrictions, enabling them to set their own `role` or `coachRequestStatus`.
**Learning:** Relying on `auth.uid == userId` is insufficient for collections that include administrative fields like roles. Users can bypass application logic and update these fields directly via the Firebase SDK.
**Prevention:** Use `request.resource.data.diff(resource.data).affectedKeys()` in Firestore rules to prevent users from modifying administrative or restricted fields in their own documents.
