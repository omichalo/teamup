import {
  authEmailRateLimitKey,
  checkAuthEmailRateLimit,
  AUTH_EMAIL_RATE_LIMIT_MAX,
} from "./auth-email-rate-limit";
import { resetRateLimit } from "./rate-limit";

describe("auth-email-rate-limit", () => {
  const email = "User@Example.com";

  beforeEach(() => {
    resetRateLimit(authEmailRateLimitKey("password-reset", email));
    resetRateLimit(authEmailRateLimitKey("verification", email));
  });

  it("uses separate keys per scope", () => {
    expect(authEmailRateLimitKey("password-reset", email)).toBe(
      "auth:password-reset:user@example.com"
    );
    expect(authEmailRateLimitKey("verification", email)).toBe(
      "auth:verification:user@example.com"
    );
  });

  it("does not share quota between password-reset and verification", () => {
    for (let i = 0; i < AUTH_EMAIL_RATE_LIMIT_MAX; i++) {
      const result = checkAuthEmailRateLimit("password-reset", email);
      expect(result.allowed).toBe(true);
    }
    expect(checkAuthEmailRateLimit("password-reset", email).allowed).toBe(false);
    expect(checkAuthEmailRateLimit("verification", email).allowed).toBe(true);
  });
});
