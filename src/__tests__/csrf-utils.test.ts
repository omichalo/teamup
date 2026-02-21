import { generateCSRFToken, validateCSRFToken } from "@/lib/auth/csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utils Security", () => {
  const originalEnv = process.env;
  const mockSecret = "test-csrf-secret-12345678901234567890";

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CSRF_SECRET: mockSecret };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should NOT leak the secret in the token", async () => {
    const uid = "user-123";
    const token = await generateCSRFToken(uid);

    // Decode the base64 token
    const decoded = Buffer.from(token, "base64").toString("utf-8");

    // The secret should NOT be present as a plain string anymore
    console.log("Decoded token (should be secure):", decoded);
    expect(decoded).not.toContain(mockSecret);

    const parts = decoded.split(":");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe(uid);
    // The third part should be the HMAC signature, not the secret
    expect(parts[2]).not.toBe(mockSecret);
    expect(parts[2]).toHaveLength(64); // SHA-256 hex is 64 chars
  });

  it("should validate a correct token", async () => {
    const uid = "user-123";
    const token = await generateCSRFToken(uid);

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: token }),
    }));

    const isValid = await validateCSRFToken(token, uid);
    expect(isValid).toBe(true);
  });

  it("should reject a token with incorrect UID", async () => {
    const token = await generateCSRFToken("user-123");

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: token }),
    }));

    const isValid = await validateCSRFToken(token, "wrong-user");
    expect(isValid).toBe(false);
  });

  it("should reject a tampered token", async () => {
    const uid = "user-123";
    const token = await generateCSRFToken(uid);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");

    // Tamper with the UID but keep the same signature
    const tamperedDecoded = `user-456:${parts[1]}:${parts[2]}`;
    const tamperedToken = Buffer.from(tamperedDecoded).toString("base64");

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: tamperedToken }),
    }));

    const isValid = await validateCSRFToken(tamperedToken, "user-456");
    expect(isValid).toBe(false);
  });
});
