import { generateCSRFToken, validateCSRFToken } from "@/lib/auth/csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CSRF_SECRET: "test_csrf_secret_for_unit_tests" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should generate a signed token that does not contain the secret", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    expect(token).toContain(".");
    const [payloadB64] = token.split(".");
    const payload = Buffer.from(payloadB64, "base64").toString("utf-8");

    expect(payload).toContain(uid);
    expect(token).not.toContain("test_csrf_secret_for_unit_tests");
  });

  it("should validate a correct token", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: (name: string) => name === "__csrf" ? { value: token } : undefined
    }));

    const isValid = await validateCSRFToken(token, uid);
    expect(isValid).toBe(true);
  });

  it("should fail validation if the token is tampered with", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);
    const tamperedToken = token.substring(0, token.length - 1) + (token.endsWith("A") ? "B" : "A");

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: (name: string) => name === "__csrf" ? { value: tamperedToken } : undefined
    }));

    const isValid = await validateCSRFToken(tamperedToken, uid);
    expect(isValid).toBe(false);
  });

  it("should fail validation if the UID does not match", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: (name: string) => name === "__csrf" ? { value: token } : undefined
    }));

    const isValid = await validateCSRFToken(token, "wrongUser");
    expect(isValid).toBe(false);
  });

  it("should fail validation if the secret changes", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    process.env.CSRF_SECRET = "different_secret";

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: (name: string) => name === "__csrf" ? { value: token } : undefined
    }));

    const isValid = await validateCSRFToken(token, uid);
    expect(isValid).toBe(false);
  });
});
