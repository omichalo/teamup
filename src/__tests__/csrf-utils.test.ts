/** @jest-environment node */
import { generateCSRFToken, validateCSRFToken } from "@/lib/auth/csrf-utils";
import { cookies, headers } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

describe("CSRF Utilities", () => {
  const mockSecret = "test_csrf_secret_for_unit_tests";
  const mockUid = "user123";

  beforeEach(() => {
    process.env.CSRF_SECRET = mockSecret;
    jest.clearAllMocks();
  });

  describe("generateCSRFToken", () => {
    it("should generate a base64 encoded token", async () => {
      const token = await generateCSRFToken(mockUid);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(() => Buffer.from(token, "base64")).not.toThrow();
    });

    it("should throw if CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      await expect(generateCSRFToken(mockUid)).rejects.toThrow("CSRF_SECRET environment variable is required");
    });

    it("should include the UID in the decoded token", async () => {
      const token = await generateCSRFToken(mockUid);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      expect(decoded.startsWith(`${mockUid}:`)).toBe(true);
    });
  });

  describe("validateCSRFToken", () => {
    it("should return false if token is missing and no header provided", async () => {
      (headers as jest.Mock).mockReturnValue(Promise.resolve({
        get: jest.fn().mockReturnValue(null),
      }));
      const result = await validateCSRFToken(null, mockUid);
      expect(result).toBe(false);
    });

    it("should use X-CSRF-Token header if providedToken is missing", async () => {
      const token = await generateCSRFToken(mockUid);
      (headers as jest.Mock).mockReturnValue(Promise.resolve({
        get: jest.fn().mockReturnValue(token),
      }));
      (cookies as jest.Mock).mockReturnValue(Promise.resolve({
        get: jest.fn().mockReturnValue({ value: token }),
      }));
      const result = await validateCSRFToken(null, mockUid);
      expect(result).toBe(true);
    });

    it("should return false if cookie is missing", async () => {
      (cookies as jest.Mock).mockReturnValue(Promise.resolve({
        get: jest.fn().mockReturnValue(undefined),
      }));
      const token = await generateCSRFToken(mockUid);
      const result = await validateCSRFToken(token, mockUid);
      expect(result).toBe(false);
    });

    it("should return true for a valid token matching the cookie", async () => {
      const token = await generateCSRFToken(mockUid);
      (cookies as jest.Mock).mockReturnValue(Promise.resolve({
        get: jest.fn().mockReturnValue({ value: token }),
      }));
      const result = await validateCSRFToken(token, mockUid);
      expect(result).toBe(true);
    });

    it("should return false if UID does not match", async () => {
      const token = await generateCSRFToken(mockUid);
      (cookies as jest.Mock).mockReturnValue(Promise.resolve({
        get: jest.fn().mockReturnValue({ value: token }),
      }));
      const result = await validateCSRFToken(token, "different_user");
      expect(result).toBe(false);
    });

    it("should return false if token is tampered with", async () => {
      const token = await generateCSRFToken(mockUid);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      parts[0] = "malicious_user";
      const tamperedToken = Buffer.from(parts.join(":")).toString("base64");

      (cookies as jest.Mock).mockReturnValue(Promise.resolve({
        get: jest.fn().mockReturnValue({ value: tamperedToken }),
      }));
      const result = await validateCSRFToken(tamperedToken, mockUid);
      expect(result).toBe(false);
    });

    it("should return false if token and cookie have different lengths", async () => {
      const token = await generateCSRFToken(mockUid);
      const shorterToken = "short";
      (cookies as jest.Mock).mockReturnValue(Promise.resolve({
        get: jest.fn().mockReturnValue({ value: token }),
      }));
      const result = await validateCSRFToken(shorterToken, mockUid);
      expect(result).toBe(false);
    });
  });
});
