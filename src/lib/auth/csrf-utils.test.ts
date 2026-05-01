/**
 * @jest-environment node
 */
import { generateCSRFToken, validateCSRFToken } from "./csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.CSRF_SECRET = "test-secret-key-for-unit-tests";
    (cookies as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("generateCSRFToken", () => {
    it("should generate a valid base64 token", async () => {
      const uid = "test-uid";
      const token = await generateCSRFToken(uid);
      expect(typeof token).toBe("string");
      expect(() => Buffer.from(token, "base64")).not.toThrow();

      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe(uid);
    });

    it("should throw if CSRF_SECRET is not set", async () => {
      delete process.env.CSRF_SECRET;
      await expect(generateCSRFToken("uid")).rejects.toThrow("CSRF_SECRET environment variable is required");
    });
  });

  describe("validateCSRFToken", () => {
    it("should return true for a valid token and matching cookie", async () => {
      const uid = "test-uid";
      const token = await generateCSRFToken(uid);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, uid);
      expect(isValid).toBe(true);
    });

    it("should return false if token is null", async () => {
      const isValid = await validateCSRFToken(null);
      expect(isValid).toBe(false);
    });

    it("should return false if cookie is missing", async () => {
      const uid = "test-uid";
      const token = await generateCSRFToken(uid);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const isValid = await validateCSRFToken(token, uid);
      expect(isValid).toBe(false);
    });

    it("should return false if UID does not match", async () => {
      const uid = "test-uid";
      const token = await generateCSRFToken(uid);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, "different-uid");
      expect(isValid).toBe(false);
    });

    it("should return false if signature is invalid", async () => {
      const uid = "test-uid";
      const token = await generateCSRFToken(uid);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      parts[2] = "invalid-signature";
      const invalidToken = Buffer.from(parts.join(":")).toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: invalidToken }),
      });

      const isValid = await validateCSRFToken(invalidToken, uid);
      expect(isValid).toBe(false);
    });

    it("should return false if token is expired", async () => {
      const uid = "test-uid";
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const secret = process.env.CSRF_SECRET!;
      const data = `${uid}:${oldTimestamp}`;
      const signature = require("crypto")
        .createHmac("sha256", secret)
        .update(data)
        .digest("base64");
      const expiredToken = Buffer.from(`${data}:${signature}`).toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: expiredToken }),
      });

      const isValid = await validateCSRFToken(expiredToken, uid);
      expect(isValid).toBe(false);
    });

    it("should return false if CSRF_SECRET is missing during validation", async () => {
      const uid = "test-uid";
      const token = await generateCSRFToken(uid);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      delete process.env.CSRF_SECRET;
      const isValid = await validateCSRFToken(token, uid);
      expect(isValid).toBe(false);
    });
  });
});
