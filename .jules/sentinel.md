## 2026-04-21 - [HIGH] Missing Authentication and PII Exposure on API Routes
**Vulnerability:** The `/api/fftt/players` and `/api/teams/matches` endpoints were accessible without any authentication or authorization, exposing player PII (email, phone) and internal team data.
**Learning:** Next.js API routes are NOT automatically covered by the `middleware.ts` matcher if excluded by regex, requiring manual authentication checks in each route handler.
**Prevention:** Always implement `adminAuth.verifySessionCookie` and role checks (`hasAnyRole`) in all API routes that handle sensitive data.

## 2026-04-21 - [HIGH] Insecure CSRF Token Generation and Timing Attacks
**Vulnerability:** CSRF tokens were generated using simple Base64 concatenation of UID and secret, and validated using standard string comparison (`===`), making them vulnerable to forgery and timing attacks.
**Learning:** Simple concatenation doesn't provide cryptographic integrity. Standard comparison is susceptible to timing attacks that can leak the secret/token.
**Prevention:** Use HMAC-SHA256 for token signing and `crypto.timingSafeEqual` for constant-time comparisons. Bind tokens strictly to the user's UID and include a TTL.

## 2026-04-21 - [MEDIUM] PII Leakage via Browser/Proxy Cache
**Vulnerability:** Sensitive API responses containing Player PII lacked anti-caching headers, potentially allowing sensitive data to be stored in browser history or shared proxies.
**Learning:** Default response headers may allow caching of sensitive JSON data.
**Prevention:** Explicitly set `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` on all endpoints returning PII or private data.
