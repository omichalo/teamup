## 2025-05-22 - Insecure CSRF Token Generation and Timing Attack Risk
**Vulnerability:** The CSRF token was generated using simple base64 encoding of the user UID, a timestamp, and the secret, which leaked the secret to the client. Furthermore, validation was vulnerable to timing attacks and potential crashes due to unsafe use of `timingSafeEqual`.
**Learning:** `crypto.timingSafeEqual` in Node.js throws a `RangeError` if the compared buffers have different lengths, which can lead to Denial of Service (DoS) if not handled.
**Prevention:** Always sign sensitive tokens with HMAC-SHA256 and perform length checks before using `timingSafeEqual` for constant-time comparisons.
