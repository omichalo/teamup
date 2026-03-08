import { generateCSRFToken, validateCSRFToken } from "@/lib/auth/csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utilities Security", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.CSRF_SECRET = "test-secret-key-12345";
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should not leak CSRF_SECRET in the generated token", async () => {
    const uid = "user-123";
    const token = await generateCSRFToken(uid);

    // The current implementation uses base64(uid:timestamp:secret)
    const decoded = Buffer.from(token, "base64").toString("utf-8");

    // Check if the secret is part of the decoded token
    // In a secure implementation, the secret itself should NEVER be in the token
    const parts = decoded.split(":");
    expect(parts).not.toContain(process.env.CSRF_SECRET);
  });

  it("should validate a correctly generated token", async () => {
    const uid = "user-123";
    const token = await generateCSRFToken(uid);

    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: token }),
    });

    const isValid = await validateCSRFToken(token, uid);
    expect(isValid).toBe(true);
  });

  it("should reject an invalid token", async () => {
    const uid = "user-123";
    const token = await generateCSRFToken(uid);

    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: token }),
    });

    const isValid = await validateCSRFToken("invalid-token", uid);
    expect(isValid).toBe(false);
  });
});
