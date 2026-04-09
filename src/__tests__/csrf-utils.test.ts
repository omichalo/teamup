/**
 * @jest-environment node
 */
import { generateCSRFToken, validateCSRFToken } from "@/lib/auth/csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utilities Security Tests", () => {
  const mockSecret = "test-csrf-secret-1234567890123456";
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CSRF_SECRET: mockSecret };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("generateCSRFToken", () => {
    it("should generate a secure token that doesn't leak the secret in plaintext", async () => {
      const uid = "user123";
      const token = await generateCSRFToken(uid);

      expect(token).toBeDefined();
      const decoded = Buffer.from(token, "base64").toString("utf-8");

      // Token should contain uid and timestamp, but NOT the secret itself
      expect(decoded).toContain(uid);
      expect(decoded).not.toContain(mockSecret);

      // Token should have 3 parts (uid, timestamp, hmac)
      const parts = decoded.split(":");
      expect(parts.length).toBe(3);
    });

    it("should throw if CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      await expect(generateCSRFToken("uid")).rejects.toThrow("CSRF_SECRET environment variable is required");
    });
  });

  describe("validateCSRFToken", () => {
    const uid = "user123";

    it("should validate a correctly generated token", async () => {
      const token = await generateCSRFToken(uid);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, uid);
      expect(isValid).toBe(true);
    });

    it("should fail if token doesn't match cookie", async () => {
      const token = await generateCSRFToken(uid);
      const differentToken = await generateCSRFToken("otherUser");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: differentToken }),
      });

      const isValid = await validateCSRFToken(token, uid);
      expect(isValid).toBe(false);
    });

    it("should fail if token is tampered with", async () => {
      const token = await generateCSRFToken(uid);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");

      // Tamper with the UID in the payload
      parts[0] = "attacker";
      const tamperedToken = Buffer.from(parts.join(":")).toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: tamperedToken }),
      });

      const isValid = await validateCSRFToken(tamperedToken, uid);
      expect(isValid).toBe(false);
    });

    it("should fail if token has invalid signature", async () => {
      const token = await generateCSRFToken(uid);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");

      // Tamper with the HMAC signature
      parts[2] = "0000000000000000000000000000000000000000000000000000000000000000";
      const tamperedToken = Buffer.from(parts.join(":")).toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: tamperedToken }),
      });

      const isValid = await validateCSRFToken(tamperedToken, uid);
      expect(isValid).toBe(false);
    });

    it("should fail if token is malformed", async () => {
      const malformedToken = Buffer.from("invalid-token").toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: malformedToken }),
      });

      const isValid = await validateCSRFToken(malformedToken, uid);
      expect(isValid).toBe(false);
    });

    it("should fail if UID doesn't match provided UID", async () => {
      const token = await generateCSRFToken(uid);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, "wrong-user");
      expect(isValid).toBe(false);
    });
  });
});
