## 2025-05-14 - CSRF Token Security Enhancement
**Vulnerability:** Weak CSRF token generation and validation. Tokens were created by simple base64 concatenation of UID, timestamp, and secret, which could potentially leak the secret or be easily forged if the format was known. Additionally, string comparison was used for validation, making it susceptible to timing attacks.

**Learning:** Base64 encoding is not encryption or signing. Insecure concatenation of secrets into tokens can expose them. Timing attacks can be used to brute-force or guess valid tokens if comparison is not constant-time.

**Prevention:** Always use a proper HMAC-SHA256 signature for CSRF tokens to ensure integrity and prevent leakage of the underlying secret. Use `crypto.timingSafeEqual` for comparing sensitive tokens. Combine token-based protection with origin validation (`Origin`/`Referer` headers) for defense in depth.
