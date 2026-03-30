/**
 * @jest-environment node
 */
import { generateCSRFToken, validateCSRFToken } from "@/lib/auth/csrf-utils";
import { cookies, headers } from "next/headers";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

describe("CSRF Utilities", () => {
  const SECRET = "test_csrf_secret_for_unit_tests";
  const UID = "user123";

  beforeEach(() => {
    process.env.CSRF_SECRET = SECRET;
    jest.clearAllMocks();
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
    });

    it("should not contain the raw secret in the decoded token", async () => {
      const token = await generateCSRFToken(UID);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      expect(decoded).not.toContain(SECRET);
    });

    it("should throw if CSRF_SECRET is missing", async () => {
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

    it("should return false if token doesn't match cookie", async () => {
      const token = await generateCSRFToken(UID);
      const otherToken = await generateCSRFToken("otherUser");

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: otherToken }),
      });

      const isValid = await validateCSRFToken(token, UID);
      expect(isValid).toBe(false);
    });

    it("should return false if signature is invalid", async () => {
      const token = await generateCSRFToken(UID);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      parts[2] = "tampered_signature";
      const tamperedToken = Buffer.from(parts.join(":")).toString("base64");

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: tamperedToken }),
      });

      const isValid = await validateCSRFToken(tamperedToken, UID);
      expect(isValid).toBe(false);
    });

    it("should return false if UID doesn't match", async () => {
      const token = await generateCSRFToken(UID);

      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, "wrongUser");
      expect(isValid).toBe(false);
    });

    it("should automatically use X-CSRF-Token header if token is not provided", async () => {
      const token = await generateCSRFToken(UID);

      (headers as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(token),
      });
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(null, UID);
      expect(isValid).toBe(true);
      expect(headers).toHaveBeenCalled();
    });
  });
});
