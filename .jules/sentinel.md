## 2026-03-02 - Secure CSRF Token Comparison
**Vulnerability:** Timing attacks on CSRF token validation.
**Learning:** Standard string comparison (`===`) in Node.js is not constant-time, allowing potential attackers to guess tokens by measuring the time taken for validation.
**Prevention:** Always use `crypto.timingSafeEqual` for comparing sensitive tokens or hashes to ensure constant-time validation.
