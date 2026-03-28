/** @jest-environment node */
import { generateCSRFToken, validateCSRFToken } from "@/lib/auth/csrf-utils";
import { cookies, headers } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

describe("CSRF Utils", () => {
  const SECRET = "test_csrf_secret_for_unit_tests";
  const UID = "test-uid-123";

  beforeAll(() => {
    process.env.CSRF_SECRET = SECRET;
  });

  afterAll(() => {
    delete process.env.CSRF_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateCSRFToken", () => {
    it("should generate a base64 encoded token with uid, timestamp and HMAC", async () => {
      const token = await generateCSRFToken(UID);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe(UID);
      expect(parseInt(parts[1])).toBeGreaterThan(0);
      expect(parts[2]).toHaveLength(64); // SHA256 hex signature
    });

    it("should throw error if CSRF_SECRET is missing", async () => {
      const originalSecret = process.env.CSRF_SECRET;
      delete process.env.CSRF_SECRET;

      await expect(generateCSRFToken(UID)).rejects.toThrow("CSRF_SECRET environment variable is required");

      process.env.CSRF_SECRET = originalSecret;
    });
  });

  describe("validateCSRFToken", () => {
    it("should validate a valid token matching the cookie", async () => {
      const token = await generateCSRFToken(UID);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, UID);
      expect(isValid).toBe(true);
    });

    it("should validate a valid token from headers matching the cookie", async () => {
      const token = await generateCSRFToken(UID);

      (headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(token),
      });
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(undefined, UID);
      expect(isValid).toBe(true);
    });

    it("should fail if token does not match cookie", async () => {
      const token = await generateCSRFToken(UID);
      // Attendre un peu pour que le timestamp soit différent
      await new Promise(resolve => setTimeout(resolve, 2));
      const differentToken = await generateCSRFToken(UID);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: differentToken }),
      });

      const isValid = await validateCSRFToken(token, UID);
      expect(isValid).toBe(false);
    });

    it("should fail if UID does not match", async () => {
      const token = await generateCSRFToken(UID);

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: token }),
      });

      const isValid = await validateCSRFToken(token, "wrong-uid");
      expect(isValid).toBe(false);
    });

    it("should fail if signature is invalid", async () => {
      const timestamp = Date.now().toString();
      const invalidToken = Buffer.from(`${UID}:${timestamp}:invalid-signature`).toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: invalidToken }),
      });

      const isValid = await validateCSRFToken(invalidToken, UID);
      expect(isValid).toBe(false);
    });

    it("should fail if token is malformed", async () => {
      const malformedToken = Buffer.from("not-a-valid-token").toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: malformedToken }),
      });

      const isValid = await validateCSRFToken(malformedToken, UID);
      expect(isValid).toBe(false);
    });
  });
});
