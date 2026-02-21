# Sentinel Security Journal

## 2026-02-21 - CSRF Secret Leakage in Token Generation
**Vulnerability:** The CSRF token generation was insecurely concatenating the `CSRF_SECRET` into a base64-encoded string (`uid:timestamp:secret`). This exposed the server-side secret to anyone who could see a CSRF token.
**Learning:** Simple concatenation and base64 encoding are not sufficient for creating secure tokens. They only provide encoding, not confidentiality or integrity.
**Prevention:** Use standard cryptographic signatures (like HMAC-SHA256) to sign tokens. This ensures that the secret is never exposed and that tokens cannot be forged. Always use `timingSafeEqual` for comparing signatures to prevent timing attacks.
