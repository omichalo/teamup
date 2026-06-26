export function getAuthErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "";
  }

  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : "";
}

export function isFirebaseUserNotFoundError(error: unknown): boolean {
  const authCode = getAuthErrorCode(error);
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    authCode === "auth/user-not-found" ||
    authCode === "auth/email-not-found" ||
    errorMessage.includes("user-not-found") ||
    errorMessage.includes("USER_NOT_FOUND") ||
    errorMessage.includes("EMAIL_NOT_FOUND") ||
    errorMessage.includes("no user record")
  );
}
