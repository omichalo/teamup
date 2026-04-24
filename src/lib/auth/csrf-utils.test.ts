/**
 * @jest-environment node
 */
import { generateCSRFToken, validateCSRFToken } from "./csrf-utils";
import { cookies } from "next/headers";
import { createHmac } from "crypto";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("csrf-utils", () => {
  const mockUid = "test-uid";
  const mockSecret = "test-secret-at-least-32-chars-long-!!";
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CSRF_SECRET: mockSecret };
    (cookies as jest.Mock).mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("generateCSRFToken", () => {
    it("should generate a token", async () => {
      const token = await generateCSRFToken(mockUid);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const [uid, timestamp, signature] = decoded.split(":");
      expect(uid).toBe(mockUid);
      expect(timestamp).toBeDefined();
      expect(signature).toBeDefined();
    });

    it("should throw error if CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      await expect(generateCSRFToken(mockUid)).rejects.toThrow("CSRF_SECRET environment variable is required");
    });
  });

  describe("validateCSRFToken", () => {
    const setupCookie = (token: string) => {
      (cookies as jest.Mock).mockReturnValue(Promise.resolve({
        get: jest.fn().mockReturnValue({ value: token }),
      }));
    };

    it("should validate a correct token", async () => {
      const token = await generateCSRFToken(mockUid);
      setupCookie(token);

      const isValid = await validateCSRFToken(token, mockUid);
      expect(isValid).toBe(true);
    });

    it("should reject if token doesn't match cookie", async () => {
      const token = await generateCSRFToken(mockUid);
      setupCookie("other-token");

      const isValid = await validateCSRFToken(token, mockUid);
      expect(isValid).toBe(false);
    });

    it("should reject an incorrect signature", async () => {
      const timestamp = Date.now();
      const data = `${mockUid}:${timestamp}`;
      const fakeSignature = "wrong-signature";
      const token = Buffer.from(`${data}:${fakeSignature}`).toString("base64");

      setupCookie(token);

      const isValid = await validateCSRFToken(token, mockUid);
      expect(isValid).toBe(false);
    });

    it("should reject token with wrong UID", async () => {
      const token = await generateCSRFToken(mockUid);
      setupCookie(token);

      const isValid = await validateCSRFToken(token, "other-uid");
      expect(isValid).toBe(false);
    });

    it("should reject expired token", async () => {
      // 25 hours ago
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      const data = `${mockUid}:${oldTimestamp}`;
      const signature = createHmac("sha256", mockSecret).update(data).digest("hex");
      const token = Buffer.from(`${data}:${signature}`).toString("base64");

      setupCookie(token);

      const isValid = await validateCSRFToken(token, mockUid);
      expect(isValid).toBe(false);
    });

    it("should reject malformed token", async () => {
      const token = Buffer.from("not-a-csrf-token").toString("base64");
      setupCookie(token);

      const isValid = await validateCSRFToken(token, mockUid);
      expect(isValid).toBe(false);
    });
  });
});
