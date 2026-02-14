## 2025-05-14 - Privilege Escalation via Firestore Data Priority
**Vulnerability:** The `/api/session/verify` endpoint prioritized user roles and status from Firestore documents over Firebase Custom Claims. Additionally, Firestore security rules allowed users to modify their own `role` and `coachRequestStatus` fields.
**Learning:** In a hybrid auth system (Custom Claims + Firestore), if the Firestore document is used as the source of truth without strict write protections, users can escalate their privileges by modifying their own document.
**Prevention:** Always prioritize Custom Claims in session verification as they are signed by the server. Use Firestore security rules with `affectedKeys()` to block client-side updates to sensitive fields.
