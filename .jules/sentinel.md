## 2025-05-15 - Secure CSRF Token Implementation
**Vulnerability:** The CSRF token implementation used base64 encoding of the secret (`uid:timestamp:secret`), which leaked the `CSRF_SECRET` to any client receiving a token.
**Learning:** Simple encoding is not encryption or signing. Secrets should never be part of a client-side token without cryptographic signing (e.g., HMAC).
**Prevention:** Use HMAC-SHA256 for signing tokens that include server-side secrets. Always include a TTL and use constant-time comparison (`timingSafeEqual`) for validation.
