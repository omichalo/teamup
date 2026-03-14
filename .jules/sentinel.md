## 2025-05-14 - [CRITICAL] CSRF Secret Exposure and Timing Attacks
**Vulnerability:** The CSRF token implementation previously included the server-side `CSRF_SECRET` directly in the base64-encoded token string. Additionally, token comparison was performed using standard string equality, making it susceptible to timing attacks.
**Learning:** Hardcoding or including secrets directly in client-side tokens (even if encoded) is a critical security flaw. Timing attacks can be used to brute-force or leak information about secure tokens.
**Prevention:** Use HMAC for token signatures to keep the secret on the server. Always use `crypto.timingSafeEqual` (with mandatory length checks) for comparing sensitive tokens or hashes.
