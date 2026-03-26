## 2025-05-20 - Insecure CSRF token implementation exposing secrets
**Vulnerability:** The initial CSRF token implementation was a simple base64-encoded string concatenation of `uid:timestamp:secret`.
**Learning:** This approach allowed anyone with a valid CSRF token to decode it and retrieve the `CSRF_SECRET` directly from the token payload.
**Prevention:** Always use HMAC-SHA256 signing for tokens that incorporate secrets, and never include the secret itself in the payload. Use timing-safe comparison (`crypto.timingSafeEqual`) for validation to prevent timing attacks.
