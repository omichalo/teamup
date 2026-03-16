import { generateCSRFToken, validateCSRFToken } from "../lib/auth/csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utils Security", () => {
  const originalEnv = process.env;
  const TEST_SECRET = "super-secret-csrf-key-12345";
  const TEST_UID = "user-123";

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.CSRF_SECRET = TEST_SECRET;
    process.env.NODE_ENV = "production";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should NOT leak the secret in the generated token", async () => {
    const token = await generateCSRFToken(TEST_UID);
    const decoded = Buffer.from(token, "base64").toString("utf-8");

    // Verify that the secret is not present in the base64-decoded token payload
    expect(decoded).not.toContain(TEST_SECRET);
  });

  it("should validate a correct token", async () => {
    const token = await generateCSRFToken(TEST_UID);

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: token }),
    }));

    const isValid = await validateCSRFToken(token, TEST_UID);
    expect(isValid).toBe(true);
  });

  it("should fail validation if token is tampered with", async () => {
    const token = await generateCSRFToken(TEST_UID);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    // Tamper with UID
    const tamperedToken = Buffer.from(`other-user:${parts[1]}:${parts[2]}`).toString("base64");

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: token }),
    }));

    const isValid = await validateCSRFToken(tamperedToken, TEST_UID);
    expect(isValid).toBe(false);
  });
});
