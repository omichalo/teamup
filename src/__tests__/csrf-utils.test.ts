import { generateCSRFToken, validateCSRFToken } from "../lib/auth/csrf-utils";
import { cookies } from "next/headers";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.CSRF_SECRET = "test_csrf_secret_for_unit_tests";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("generateCSRFToken", () => {
    it("should generate a base64 encoded token", async () => {
      const uid = "test-uid";
      const token = await generateCSRFToken(uid);
      expect(typeof token).toBe("string");
      expect(() => Buffer.from(token, "base64").toString("utf-8")).not.toThrow();
    });

    it("should throw error if CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      await expect(generateCSRFToken("uid")).rejects.toThrow("CSRF_SECRET environment variable is required");
    });
  });

  describe("validateCSRFToken", () => {
    it("should return true for a valid token", async () => {
      const uid = "test-uid";
      const token = await generateCSRFToken(uid);

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, uid);
      expect(isValid).toBe(true);
    });

    it("should return false if token is null", async () => {
      const isValid = await validateCSRFToken(null, "uid");
      expect(isValid).toBe(false);
    });

    it("should return false if cookie is missing", async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const isValid = await validateCSRFToken("some-token", "uid");
      expect(isValid).toBe(false);
    });

    it("should return false if UID mismatch", async () => {
      const uid = "test-uid";
      const token = await generateCSRFToken(uid);

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, "different-uid");
      expect(isValid).toBe(false);
    });

    it("should return false if secret is different", async () => {
      const uid = "test-uid";
      const token = await generateCSRFToken(uid);

      process.env.CSRF_SECRET = "different-secret";

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, uid);
      expect(isValid).toBe(false);
    });
  });
});
