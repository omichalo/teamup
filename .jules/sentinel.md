## 2025-05-14 - Privilege Escalation via Firestore Role Manipulation
**Vulnerability:** Users could upgrade their own role to 'admin' by directly updating their Firestore document because security rules only checked authorship, not field-level changes.
**Learning:** Even if security rules use Custom Claims for authorization, the application code might fallback to Firestore data for UI or other decisions, creating a privilege escalation path.
**Prevention:** Always prioritize secure Custom Claims in the backend for role resolution, and use Firestore rules to prevent clients from modifying sensitive fields like 'role'.
