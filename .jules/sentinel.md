## 2025-05-15 - Timing safe CSRF token validation
**Vulnerability:** The CSRF token validation was using simple string comparison (`===`), which is susceptible to timing side-channel attacks. An attacker could potentially use this to reconstruct a valid CSRF token.
**Learning:** String comparison in many runtimes short-circuits as soon as a mismatch is found, leading to variable execution time.
**Prevention:** Use `crypto.timingSafeEqual` for comparing security-sensitive tokens. Ensure buffers have the same length before calling it, or perform a dummy comparison to maintain consistent timing even if lengths differ.
