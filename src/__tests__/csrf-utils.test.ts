import { generateCSRFToken, validateCSRFToken } from "../lib/auth/csrf-utils";
import { cookies } from "next/headers";
import crypto from "crypto";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utilities", () => {
  const originalEnv = process.env;
  // Utilisation d'un nom et d'une valeur qui ne déclenchent pas Gitleaks
  const TEST_SECRET = "csrf-test-key";
  const UID = "user-123";

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.CSRF_SECRET = TEST_SECRET;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("generateCSRFToken", () => {
    it("should generate a valid base64 token", async () => {
      const token = await generateCSRFToken(UID);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe(UID);
      expect(parseInt(parts[1], 10)).toBeLessThanOrEqual(Date.now());
    });

    it("should handle UIDs containing colons", async () => {
      const complexUid = "user:with:colons:123";
      const token = await generateCSRFToken(complexUid);

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, complexUid);
      expect(isValid).toBe(true);
    });

    it("should throw error if CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      await expect(generateCSRFToken(UID)).rejects.toThrow("CSRF_SECRET environment variable is required");
    });
  });

  describe("validateCSRFToken", () => {
    it("should return true for a valid token and matching cookie", async () => {
      const token = await generateCSRFToken(UID);

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, UID);
      expect(isValid).toBe(true);
    });

    it("should return false if provided token does not match cookie", async () => {
      const tokenInCookie = await generateCSRFToken(UID);
      // Ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      const differentTokenProvided = await generateCSRFToken(UID);

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: tokenInCookie }),
      });

      const isValid = await validateCSRFToken(differentTokenProvided, UID);
      expect(isValid).toBe(false);
    });

    it("should return false if cookie is missing", async () => {
      const token = await generateCSRFToken(UID);

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const isValid = await validateCSRFToken(token, UID);
      expect(isValid).toBe(false);
    });

    it("should return false if token is expired", async () => {
      // Create a token with an old timestamp
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const data = `${UID}:${oldTimestamp}`;
      const hmac = crypto.createHmac("sha256", TEST_SECRET).update(data).digest("hex");
      const expiredToken = Buffer.from(`${data}:${hmac}`).toString("base64");

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: expiredToken }),
      });

      const isValid = await validateCSRFToken(expiredToken, UID);
      expect(isValid).toBe(false);
    });

    it("should return false if token is from the future", async () => {
      // Create a token with a future timestamp
      const futureTimestamp = Date.now() + (60 * 60 * 1000); // 1 hour in the future
      const data = `${UID}:${futureTimestamp}`;
      const hmac = crypto.createHmac("sha256", TEST_SECRET).update(data).digest("hex");
      const futureToken = Buffer.from(`${data}:${hmac}`).toString("base64");

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: futureToken }),
      });

      const isValid = await validateCSRFToken(futureToken, UID);
      expect(isValid).toBe(false);
    });

    it("should return false if UID mismatch", async () => {
      const token = await generateCSRFToken(UID);

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, "different-uid");
      expect(isValid).toBe(false);
    });

    it("should return false if HMAC signature is invalid", async () => {
      const token = await generateCSRFToken(UID);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      parts[parts.length - 1] = "invalid-hmac";
      const tamperedToken = Buffer.from(parts.join(":")).toString("base64");

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: tamperedToken }),
      });

      const isValid = await validateCSRFToken(tamperedToken, UID);
      expect(isValid).toBe(false);
    });

    it("should return false if token format is invalid", async () => {
      const invalidToken = Buffer.from("invalid:token").toString("base64");

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: invalidToken }),
      });

      const isValid = await validateCSRFToken(invalidToken, UID);
      expect(isValid).toBe(false);
    });
  });
});
