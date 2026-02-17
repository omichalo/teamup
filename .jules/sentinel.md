## 2025-05-15 - Privilege Escalation via Firestore Data Mirroring
**Vulnerability:** The session verification API prioritized user role and status from Firestore documents over cryptographically signed Custom Claims. Simultaneously, Firestore security rules allowed users to update their own documents without field-level restrictions.
**Learning:** Mirroring authentication state (like roles) in Firestore is useful for queries but creates a risk if the database is used as the source of truth for authorization without strict Security Rules.
**Prevention:** Always prioritize Custom Claims in session verification. Use `request.resource.data.diff(resource.data).affectedKeys().hasAny([...])` in Firestore rules to protect sensitive fields from client-side modification.
