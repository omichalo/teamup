/** @jest-environment node */
import { generateCSRFToken, validateCSRFToken } from "./csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers cookies
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utilities", () => {
  const SECRET = "test_csrf_secret_for_unit_tests";
  const UID = "user123";

  beforeEach(() => {
    process.env.CSRF_SECRET = SECRET;
    jest.clearAllMocks();
  });

  describe("generateCSRFToken", () => {
    it("should generate a base64 encoded token", async () => {
      const token = await generateCSRFToken(UID);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(() => Buffer.from(token, "base64")).not.toThrow();
    });

    it("should throw if CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      await expect(generateCSRFToken(UID)).rejects.toThrow("CSRF_SECRET environment variable is required");
    });
  });

  describe("validateCSRFToken", () => {
    it("should return true for a valid token", async () => {
      const token = await generateCSRFToken(UID);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, UID);
      expect(isValid).toBe(true);
    });

    it("should return false if token is missing", async () => {
      const isValid = await validateCSRFToken(null, UID);
      expect(isValid).toBe(false);
    });

    it("should return false if cookie is missing", async () => {
      const token = await generateCSRFToken(UID);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const isValid = await validateCSRFToken(token, UID);
      expect(isValid).toBe(false);
    });

    it("should return false if token doesn't match cookie", async () => {
      const token1 = await generateCSRFToken(UID);

      // Force a different timestamp for the second token
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 1000);
      const token2 = await generateCSRFToken(UID);
      Date.now = originalNow;

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token1 }),
      });

      const isValid = await validateCSRFToken(token2, UID);
      expect(isValid).toBe(false);
    });

    it("should return false if UID doesn't match", async () => {
      const token = await generateCSRFToken(UID);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, "otherUser");
      expect(isValid).toBe(false);
    });

    it("should return false if token is expired", async () => {
      // Mock Date.now() to be in the past when generating
      const originalNow = Date.now;
      const wayPast = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      Date.now = jest.fn(() => wayPast);

      const expiredToken = await generateCSRFToken(UID);

      // Restore Date.now() for validation
      Date.now = originalNow;

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: expiredToken }),
      });

      const isValid = await validateCSRFToken(expiredToken, UID);
      expect(isValid).toBe(false);
    });

    it("should return false if HMAC is invalid", async () => {
      const token = await generateCSRFToken(UID);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      parts[2] = "invalid_hmac";
      const tamperedToken = Buffer.from(parts.join(":")).toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: tamperedToken }),
      });

      const isValid = await validateCSRFToken(tamperedToken, UID);
      expect(isValid).toBe(false);
    });
  });
});
