import { generateCSRFToken, validateCSRFToken } from "../lib/auth/csrf-utils";
import { cookies } from "next/headers";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CSRF_SECRET: "test-secret" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("generateCSRFToken", () => {
    it("should generate a base64 encoded token with uid, timestamp and signature", async () => {
      const uid = "user123";
      const token = await generateCSRFToken(uid);

      expect(token).toBeDefined();
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe(uid);
      expect(parts[2]).toHaveLength(64); // SHA256 hex signature length
    });

    it("should throw error if CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      await expect(generateCSRFToken("uid")).rejects.toThrow("CSRF_SECRET environment variable is required");
    });
  });

  describe("validateCSRFToken", () => {
    const mockUid = "user123";
    let validToken: string;

    beforeEach(async () => {
      validToken = await generateCSRFToken(mockUid);
    });

    it("should return true for a valid token matching the cookie", async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: validToken }),
      });

      const isValid = await validateCSRFToken(validToken, mockUid);
      expect(isValid).toBe(true);
    });

    it("should return false if provided token does not match cookie", async () => {
      // Attendre un peu pour garantir un timestamp différent
      await new Promise(resolve => setTimeout(resolve, 2));
      const anotherToken = await generateCSRFToken(mockUid);
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: validToken }),
      });

      const isValid = await validateCSRFToken(anotherToken, mockUid);
      expect(isValid).toBe(false);
    });

    it("should return false if signature is invalid", async () => {
      const decoded = Buffer.from(validToken, "base64").toString("utf-8");
      const parts = decoded.split(":");
      parts[2] = "incorrect-signature".padEnd(64, "0");
      const forgedToken = Buffer.from(parts.join(":")).toString("base64");

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: forgedToken }),
      });

      const isValid = await validateCSRFToken(forgedToken, mockUid);
      expect(isValid).toBe(false);
    });

    it("should return false if UID mismatch", async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: validToken }),
      });

      const isValid = await validateCSRFToken(validToken, "different-uid");
      expect(isValid).toBe(false);
    });

    it("should return false if token is malformed", async () => {
      const malformedToken = Buffer.from("uid:timestamp").toString("base64");
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: malformedToken }),
      });

      const isValid = await validateCSRFToken(malformedToken, mockUid);
      expect(isValid).toBe(false);
    });

    it("should return false if cookie is missing", async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const isValid = await validateCSRFToken(validToken, mockUid);
      expect(isValid).toBe(false);
    });
  });
});
