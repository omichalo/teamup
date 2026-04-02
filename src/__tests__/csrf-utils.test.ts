/**
 * @jest-environment node
 */
import { generateCSRFToken, validateCSRFToken } from "../lib/auth/csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utils Security Hardening", () => {
  const originalEnv = process.env;
  const mockSecret = "test_csrf_secret_for_unit_tests";
  const mockUid = "user_123";

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CSRF_SECRET: mockSecret };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should generate a token that does not contain the secret in plain text (base64)", async () => {
    const token = await generateCSRFToken(mockUid);
    const decoded = Buffer.from(token, "base64").toString("utf-8");

    // The secret should NOT be in the decoded token
    expect(decoded).not.toContain(mockSecret);

    // The token should contain UID and timestamp
    const parts = decoded.split(":");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe(mockUid);
    expect(parts[2]).toHaveLength(64); // HMAC-SHA256 hex signature length
  });

  it("should validate a correct token", async () => {
    const token = await generateCSRFToken(mockUid);

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: token }),
    }));

    const isValid = await validateCSRFToken(token, mockUid);
    expect(isValid).toBe(true);
  });

  it("should fail if the signature is tampered with", async () => {
    const token = await generateCSRFToken(mockUid);
    const decoded = Buffer.from(token, "base64").toString("utf-8").split(":");

    // Tamper with the signature
    decoded[2] = "a".repeat(64);
    const tamperedToken = Buffer.from(decoded.join(":")).toString("base64");

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: tamperedToken }),
    }));

    const isValid = await validateCSRFToken(tamperedToken, mockUid);
    expect(isValid).toBe(false);
  });

  it("should fail if the UID does not match", async () => {
    const token = await generateCSRFToken(mockUid);

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: token }),
    }));

    const isValid = await validateCSRFToken(token, "wrong_user");
    expect(isValid).toBe(false);
  });

  it("should fail if the cookie token does not match the provided token", async () => {
    // Generate two different tokens by waiting a bit to ensure different timestamps
    const token1 = await generateCSRFToken(mockUid);

    // We can't easily wait for Date.now() to change in a fast test,
    // so we manually create a different but valid-looking token
    const decoded = Buffer.from(token1, "base64").toString("utf-8").split(":");
    const differentTimestamp = (parseInt(decoded[1]) + 1000).toString();

    const crypto = require("node:crypto");
    const hmac = crypto.createHmac("sha256", mockSecret);
    hmac.update(`${mockUid}:${differentTimestamp}`);
    const differentSignature = hmac.digest("hex");
    const token2 = Buffer.from(`${mockUid}:${differentTimestamp}:${differentSignature}`).toString("base64");

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: token2 }),
    }));

    const isValid = await validateCSRFToken(token1, mockUid);
    expect(isValid).toBe(false);
  });
});
