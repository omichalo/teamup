## 2025-05-14 - Prevent Privilege Escalation via Firestore Rules
**Vulnerability:** Authenticated users could escalate their privileges by setting or updating the `role` field in their Firestore `users` document.
**Learning:** Although administrative logic often checks Firebase Custom Claims, the application's session verification API may trust the Firestore document's `role` field if it exists, leading to a bypass if the document is user-editable.
**Prevention:** Use `request.resource.data.diff(resource.data).affectedKeys()` in Firestore rules to block unauthorized modifications to sensitive fields like `role` and `coachRequestStatus`. Enforce a default role and status on document creation.
