import { generateCSRFToken, validateCSRFToken } from "@/lib/auth/csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utilities Security", () => {
  const MOCK_UID = "user123";
  const MOCK_SECRET = "super_secret_csrf_key_123";

  beforeEach(() => {
    process.env.CSRF_SECRET = MOCK_SECRET;
    jest.clearAllMocks();
  });

  it("VULNERABILITY REPRODUCTION: token should NOT contain the secret when base64 decoded", async () => {
    const token = await generateCSRFToken(MOCK_UID);
    const decoded = Buffer.from(token, "base64").toString("utf-8");

    // In the current vulnerable implementation, this will fail (it DOES contain the secret)
    // We want it to NOT contain the secret in the fixed version.
    expect(decoded).not.toContain(MOCK_SECRET);
  });

  it("should validate a correct token", async () => {
    const token = await generateCSRFToken(MOCK_UID);

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: (name: string) => (name === "__csrf" ? { value: token } : undefined),
    }));

    const isValid = await validateCSRFToken(token, MOCK_UID);
    expect(isValid).toBe(true);
  });

  it("should fail validation with wrong UID", async () => {
    const token = await generateCSRFToken(MOCK_UID);

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: (name: string) => (name === "__csrf" ? { value: token } : undefined),
    }));

    const isValid = await validateCSRFToken(token, "wrong-user");
    expect(isValid).toBe(false);
  });

  it("should fail validation with tampered token", async () => {
    const token = await generateCSRFToken(MOCK_UID);
    const tamperedToken = Buffer.from(
      Buffer.from(token, "base64").toString("utf-8").replace(MOCK_UID, "otheruser")
    ).toString("base64");

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: (name: string) => (name === "__csrf" ? { value: token } : undefined),
    }));

    const isValid = await validateCSRFToken(tamperedToken, MOCK_UID);
    expect(isValid).toBe(false);
  });
});
