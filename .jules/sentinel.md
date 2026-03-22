## 2025-05-15 - Enhanced CSRF protection with HMAC-SHA256
**Vulnerability:** Legacy CSRF token generation used simple base64 concatenation of UID and timestamp, which was vulnerable to token tampering if the secret was known or could be guessed.
**Learning:** For secure double-submit cookie patterns, tokens must be cryptographically signed using HMAC-SHA256 to ensure integrity. Comparison of signatures should always use `crypto.timingSafeEqual` to prevent timing attacks.
**Prevention:** Always use HMAC-SHA256 for CSRF tokens and ensure all state-changing API routes implement both origin validation and CSRF token verification.
