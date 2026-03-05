## 2025-05-15 - Broken Access Control in Availabilities
**Vulnerability:** Any authenticated user could create, update, or delete any availability document in the `availabilities` collection, leading to potential data loss or tampering of other players' data.
**Learning:** Broad `allow write: if isAuthenticated();` rules are dangerous in collections that store multi-user data. Granular field-level validation using `request.resource.data.diff(resource.data).affectedKeys()` is necessary to enforce the principle of least privilege.
**Prevention:** Always use `affectedKeys()` and `diff()` to restrict updates to user-specific fields, and fetch user-related identifiers (like `playerId`) from a trusted source (e.g., the user's document) within the rule.
