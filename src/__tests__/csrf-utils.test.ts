import { generateCSRFToken, validateCSRFToken } from "../lib/auth/csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utilities", () => {
  const originalEnv = process.env;
  const mockSecret = "test_csrf_secret_for_unit_tests";
  const mockUid = "user-123";

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CSRF_SECRET: mockSecret };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("generateCSRFToken", () => {
    it("should generate a valid base64 token", async () => {
      const token = await generateCSRFToken(mockUid);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const [uid, timestamp, signature] = decoded.split(":");

      expect(uid).toBe(mockUid);
      expect(timestamp).toMatch(/^\d+$/);
      expect(signature).toHaveLength(64); // SHA256 hex is 64 chars
    });

    it("should throw if CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      await expect(generateCSRFToken(mockUid)).rejects.toThrow("CSRF_SECRET environment variable is required");
    });
  });

  describe("validateCSRFToken", () => {
    let nowSpy: jest.SpyInstance;

    beforeEach(() => {
      nowSpy = jest.spyOn(Date, "now");
    });

    afterEach(() => {
      nowSpy.mockRestore();
    });

    it("should return true for a valid token and matching cookie", async () => {
      const token = await generateCSRFToken(mockUid);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, mockUid);
      expect(isValid).toBe(true);
    });

    it("should return false if token doesn't match cookie", async () => {
      nowSpy.mockReturnValue(1000);
      const token = await generateCSRFToken(mockUid);

      nowSpy.mockReturnValue(2000);
      const otherToken = await generateCSRFToken(mockUid);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: otherToken }),
      });

      const isValid = await validateCSRFToken(token, mockUid);
      expect(isValid).toBe(false);
    });

    it("should return false if UID doesn't match", async () => {
      const token = await generateCSRFToken(mockUid);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, "wrong-user");
      expect(isValid).toBe(false);
    });

    it("should return false if signature is invalid", async () => {
      const token = await generateCSRFToken(mockUid);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const [uid, timestamp] = decoded.split(":");
      const tamperedToken = Buffer.from(`${uid}:${timestamp}:invalid-signature`).toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: tamperedToken }),
      });

      const isValid = await validateCSRFToken(tamperedToken, mockUid);
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

    it("should return false if token is null", async () => {
      const isValid = await validateCSRFToken(null, mockUid);
      expect(isValid).toBe(false);
    });
  });
});
