import { generateCSRFToken, validateCSRFToken } from "../lib/auth/csrf-utils";
import { cookies } from "next/headers";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utils Security Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CSRF_SECRET: "test-secret" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should NOT be possible to recover the secret from the token", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");

    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe(uid);
    // The secret should not be in the token anymore
    expect(parts[2]).not.toBe("test-secret");
    // parts[2] should be a base64 encoded HMAC signature (44 chars for SHA-256)
    expect(parts[2].length).toBeGreaterThanOrEqual(40);
  });

  it("should fail validation if the token is tampered with", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    // Tamper with UID but keep the same signature
    const tamperedToken = Buffer.from(`otheruser:${parts[1]}:${parts[2]}`).toString("base64");

    (cookies as jest.fn).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: tamperedToken }),
    });

    const isValid = await validateCSRFToken(tamperedToken, uid);
    expect(isValid).toBe(false);
  });

  it("should validate a correct token", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    (cookies as jest.fn).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token }),
    });

    const isValid = await validateCSRFToken(token, uid);
    expect(isValid).toBe(true);
  });

  it("should fail if the token does not match the cookie", async () => {
    const uid = "user123";
    const token1 = await generateCSRFToken(uid);

    // Create a different token by changing one character to keep length same
    const token2 = token1.substring(0, token1.length - 4) + "XXXX";

    (cookies as jest.fn).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token1 }),
    });

    const isValid = await validateCSRFToken(token2, uid);
    expect(isValid).toBe(false);
  });
});
