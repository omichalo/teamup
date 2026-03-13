import { generateCSRFToken, validateCSRFToken } from "../csrf-utils";

// Mock next/headers
const mockGet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: mockGet,
  })),
}));

describe("CSRF Utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.CSRF_SECRET = "test-secret-key-for-unit-tests";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("generateCSRFToken", () => {
    it("should generate a valid base64 token", async () => {
      const uid = "user123";
      const token = await generateCSRFToken(uid);

      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);

      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe(uid);
      expect(parts[2]).toHaveLength(64); // SHA256 hex is 64 chars
    });

    it("should throw error if CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      await expect(generateCSRFToken("uid")).rejects.toThrow("CSRF_SECRET environment variable is required");
    });
  });

  describe("validateCSRFToken", () => {
    it("should return false if providedToken is missing", async () => {
      const result = await validateCSRFToken(null);
      expect(result).toBe(false);
    });

    it("should return true for valid token and matching cookie", async () => {
      const uid = "user123";
      const token = await generateCSRFToken(uid);

      mockGet.mockReturnValue({ value: token });

      const result = await validateCSRFToken(token, uid);
      expect(result).toBe(true);
    });

    it("should return false if token UID doesn't match provided UID", async () => {
      const uid = "user123";
      const token = await generateCSRFToken(uid);

      mockGet.mockReturnValue({ value: token });

      const result = await validateCSRFToken(token, "otherUser");
      expect(result).toBe(false);
    });

    it("should return false if token signature is invalid", async () => {
      const uid = "user123";
      const timestamp = Date.now().toString();
      const data = `${uid}:${timestamp}`;
      const invalidSignature = "a".repeat(64);
      const invalidToken = Buffer.from(`${data}:${invalidSignature}`).toString("base64");

      mockGet.mockReturnValue({ value: invalidToken });

      const result = await validateCSRFToken(invalidToken, uid);
      expect(result).toBe(false);
    });

    it("should return false if token doesn't match cookie", async () => {
      const uid = "user123";
      const token1 = await generateCSRFToken(uid);

      // Use a different secret to generate a different but valid-looking token
      process.env.CSRF_SECRET = "different-secret";
      const token2 = await generateCSRFToken(uid);
      process.env.CSRF_SECRET = "test-secret-key-for-unit-tests";

      mockGet.mockReturnValue({ value: token1 });

      const result = await validateCSRFToken(token2, uid);
      expect(result).toBe(false);
    });

    it("should return false if token length is different (timingSafeEqual safety check)", async () => {
      const uid = "user123";
      const token = await generateCSRFToken(uid);
      const shortToken = "short";

      mockGet.mockReturnValue({ value: token });

      const result = await validateCSRFToken(shortToken, uid);
      expect(result).toBe(false);
    });
  });
});
