# Sentinel Security Journal

## 2025-05-15 - Insecure CSRF Token Generation
**Vulnerability:** The `generateCSRFToken` function was leaking the `CSRF_SECRET` by directly base64-encoding it into the token sent to the client.
**Learning:** Simple concatenation or base64 encoding of secrets is not a secure way to generate tokens. Clients can decode these tokens and obtain the server-side secret.
**Prevention:** Always use standard cryptographic signatures (like HMAC-SHA256) to sign tokens. This ensures the secret stays on the server while still allowing for verifiable tokens.

## 2025-05-15 - Missing CSRF Protection on State-Changing API
**Vulnerability:** The `/api/coach/request` endpoint (POST) lacked any CSRF protection, allowing for potential Cross-Site Request Forgery attacks.
**Learning:** While middleware can protect against unauthorized access, state-changing API routes must explicitly implement CSRF protection (Origin validation and/or CSRF tokens) as Next.js middleware matchers often exclude `/api` routes.
**Prevention:** Implement a standard security pattern for all state-changing API routes that includes both `validateOrigin` and `validateCSRFToken` checks.
