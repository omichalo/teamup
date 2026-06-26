import { checkRateLimit } from "@/lib/auth/rate-limit";

export const AUTH_EMAIL_RATE_LIMIT_MAX = 3;
export const AUTH_EMAIL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export type AuthEmailRateLimitScope = "password-reset" | "verification";

export function authEmailRateLimitKey(
  scope: AuthEmailRateLimitScope,
  email: string
): string {
  return `auth:${scope}:${email.trim().toLowerCase()}`;
}

export function checkAuthEmailRateLimit(
  scope: AuthEmailRateLimitScope,
  email: string
): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(
    authEmailRateLimitKey(scope, email),
    AUTH_EMAIL_RATE_LIMIT_MAX,
    AUTH_EMAIL_RATE_LIMIT_WINDOW_MS
  );
}

export function authEmailRateLimitExceededMessage(resetAt: number): string {
  const minutes = Math.ceil((resetAt - Date.now()) / 1000 / 60);
  return `Veuillez patienter avant de renvoyer un email. Prochaine tentative possible dans ${minutes} minutes.`;
}
