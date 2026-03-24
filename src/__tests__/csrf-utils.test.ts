import { generateCSRFToken, validateCSRFToken } from "../lib/auth/csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utils Security", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // 🛡️ Sentinel: Utiliser un secret de test à faible entropie pour éviter les faux positifs Gitleaks.
    process.env.CSRF_SECRET = "test_csrf_secret_for_unit_tests";
    process.env.NODE_ENV = "production";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should not leak the secret in the generated token", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);
    const decoded = Buffer.from(token, "base64").toString("utf-8");

    // The decoded token should contain UID, timestamp and HMAC signature, NOT the secret
    expect(decoded).not.toContain(process.env.CSRF_SECRET);

    // It should have 3 parts: uid:timestamp:signature
    const parts = decoded.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe(uid);
    expect(parts[2]).toHaveLength(64); // SHA256 hex signature length
  });

  it("should validate a correctly generated token", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: (name: string) => (name === "__csrf" ? { value: token } : undefined),
    }));

    const isValid = await validateCSRFToken(token, uid);
    expect(isValid).toBe(true);
  });

  it("should reject a token if the secret is modified", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    // Store original secret
    const originalSecret = process.env.CSRF_SECRET;

    // Mock the cookie with the original token
    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: (name: string) => (name === "__csrf" ? { value: token } : undefined),
    }));

    // Change secret for validation
    process.env.CSRF_SECRET = "different-secret-key-0987654321";

    const isValid = await validateCSRFToken(token, uid);
    expect(isValid).toBe(false);

    // Restore secret
    process.env.CSRF_SECRET = originalSecret;
  });

  it("should reject a token if it was not signed by HMAC", async () => {
    const uid = "user123";
    const timestamp = Date.now().toString();
    // Insecure token (just concatenation)
    const insecureToken = Buffer.from(`${uid}:${timestamp}:signature`).toString("base64");

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: (name: string) => (name === "__csrf" ? { value: insecureToken } : undefined),
    }));

    const isValid = await validateCSRFToken(insecureToken, uid);
    expect(isValid).toBe(false);
  });
});
