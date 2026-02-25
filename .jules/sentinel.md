## 2025-05-15 - [Privilege Escalation via Firestore and Session Verify]
**Vulnerability:** Users could escalate their own privileges by modifying their 'role' field in their Firestore user document, which was then trusted by the session verification API.
**Learning:** Firestore rules that allow a user to update their own document without field-level restrictions are dangerous when those documents contain authorization data. Furthermore, the application layer should always prioritize cryptographically signed claims (JWT/Custom Claims) over mutable database fields for security-critical information.
**Prevention:** Use `affectedKeys().hasAny([...])` in Firestore rules to protect sensitive fields. Always prioritize decoded token claims in session verification logic.
