## 2025-05-15 - CSRF Protection Enhancement
**Vulnerability:** Weak CSRF protection using simple base64-encoded user information and insecure string comparison susceptible to timing attacks.
**Learning:** Initial CSRF implementation was a placeholder that lacked cryptographic integrity and did not bind the token to the user's session correctly. Additionally, some state-changing endpoints were missing CSRF validation entirely.
**Prevention:** Use HMAC-SHA256 for signing tokens, implement timing-safe comparisons (timingSafeEqual), enforce a TTL, and ensure all POST/PUT/DELETE API routes validate both the Origin/Referer and the CSRF token from a header (Double Submit Cookie pattern).
