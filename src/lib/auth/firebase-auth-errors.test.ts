import {
  getAuthErrorCode,
  isFirebaseUserNotFoundError,
} from "./firebase-auth-errors";

describe("firebase-auth-errors", () => {
  describe("getAuthErrorCode", () => {
    it("returns empty string for non-objects", () => {
      expect(getAuthErrorCode(null)).toBe("");
      expect(getAuthErrorCode("x")).toBe("");
    });

    it("extracts auth error code", () => {
      expect(getAuthErrorCode({ code: "auth/user-not-found" })).toBe(
        "auth/user-not-found"
      );
    });
  });

  describe("isFirebaseUserNotFoundError", () => {
    it("detects auth/user-not-found code", () => {
      expect(
        isFirebaseUserNotFoundError({ code: "auth/user-not-found" })
      ).toBe(true);
    });

    it("detects auth/email-not-found code", () => {
      expect(
        isFirebaseUserNotFoundError({ code: "auth/email-not-found" })
      ).toBe(true);
    });

    it("detects EMAIL_NOT_FOUND in message", () => {
      expect(
        isFirebaseUserNotFoundError(new Error("Raw response: EMAIL_NOT_FOUND"))
      ).toBe(true);
    });

    it("returns false for unrelated errors", () => {
      expect(
        isFirebaseUserNotFoundError({
          code: "auth/internal-error",
          message: "INTERNAL ASSERT FAILED: Unable to create the email action link",
        })
      ).toBe(false);
    });
  });
});
