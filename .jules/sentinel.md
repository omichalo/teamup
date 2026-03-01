# Sentinel Journal - SQY Ping TeamUp

## 2025-05-22 - [CRITICAL] CSRF Secret Exposure in Public Tokens
**Vulnerability:** The server-side `CSRF_SECRET` was being embedded directly into the Base64-encoded CSRF token sent to the client. Any user could decode their token and discover the global secret.
**Learning:** Using simple string concatenation for tokens without cryptographic signing is dangerous, even if Base64 encoded. Base64 is NOT encryption or hashing.
**Prevention:** Always use cryptographically secure signatures (like HMAC-SHA256) for tokens that involve server-side secrets. Never include the raw secret in any data sent to the client.
