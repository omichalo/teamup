/** @jest-environment node */
import { generateCSRFToken, validateCSRFToken } from "../lib/auth/csrf-utils";
import { cookies, headers } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

describe("CSRF Utils", () => {
  const mockUid = "test-user-id";
  const mockSecret = "test-csrf-secret-for-unit-tests";

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.CSRF_SECRET = mockSecret;
  });

  describe("generateCSRFToken", () => {
    it("should generate a valid base64 encoded token", async () => {
      const token = await generateCSRFToken(mockUid);
      expect(typeof token).toBe("string");
      expect(() => Buffer.from(token, "base64")).not.toThrow();

      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe(mockUid);
      expect(parts[2]).toMatch(/^[0-9a-f]{64}$/); // HMAC-SHA256 hex
    });

    it("should throw error if CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      await expect(generateCSRFToken(mockUid)).rejects.toThrow("CSRF_SECRET environment variable is required");
    });
  });

  describe("validateCSRFToken", () => {
    it("should return true for valid token and matching cookie", async () => {
      const token = await generateCSRFToken(mockUid);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, mockUid);
      expect(isValid).toBe(true);
    });

    it("should return true when token is in headers", async () => {
      const token = await generateCSRFToken(mockUid);

      (headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(token),
      });
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(undefined, mockUid);
      expect(isValid).toBe(true);
    });

    it("should return false if token doesn't match cookie", async () => {
      const token1 = await generateCSRFToken(mockUid);

      // Assurer que le deuxième token est différent (timestamp différent)
      jest.spyOn(Date, "now").mockReturnValue(Date.now() + 1000);
      const token2 = await generateCSRFToken(mockUid);
      (Date.now as jest.Mock).mockRestore();

      expect(token1).not.toBe(token2);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token2 }),
      });

      const isValid = await validateCSRFToken(token1, mockUid);
      expect(isValid).toBe(false);
    });

    it("should return false if UID doesn't match", async () => {
      const token = await generateCSRFToken("other-uid");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, mockUid);
      expect(isValid).toBe(false);
    });

    it("should return false for malformed token", async () => {
      const malformedToken = Buffer.from("invalid:token").toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: malformedToken }),
      });

      const isValid = await validateCSRFToken(malformedToken, mockUid);
      expect(isValid).toBe(false);
    });

    it("should return false if cookie is missing", async () => {
      const token = await generateCSRFToken(mockUid);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const isValid = await validateCSRFToken(token, mockUid);
      expect(isValid).toBe(false);
    });

    it("should return false if signature is invalid", async () => {
      const timestamp = Date.now().toString();
      const invalidSignature = "a".repeat(64);
      const invalidToken = Buffer.from(`${mockUid}:${timestamp}:${invalidSignature}`).toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: invalidToken }),
      });

      const isValid = await validateCSRFToken(invalidToken, mockUid);
      expect(isValid).toBe(false);
    });
  });
});
