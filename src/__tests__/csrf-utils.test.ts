
import { generateCSRFToken, validateCSRFToken } from "../lib/auth/csrf-utils";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utils", () => {
  const originalEnv = process.env;
  const SECRET = "test-secret-key-at-least-32-chars-long";

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.CSRF_SECRET = SECRET;

    // Default mock for cookies
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn()
    });
    // Mock Date.now to have consistent timestamp
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should generate a valid token and validate it", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    expect(token).toBeDefined();

    // Check that secret is NOT in the token
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    expect(decoded).not.toContain(SECRET);
    expect(decoded.split(":")).toHaveLength(3); // uid, timestamp, signature

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token }),
    });

    const isValid = await validateCSRFToken(token, uid);
    expect(isValid).toBe(true);
  });

  it("should fail if signature is tempered", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    // Tempered signature
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [tokenUid, timestamp] = decoded.split(":");
    const temperedToken = Buffer.from(`${tokenUid}:${timestamp}:wrongsignature`).toString("base64");

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token }),
    });

    const isValid = await validateCSRFToken(temperedToken, uid);
    expect(isValid).toBe(false);
  });

  it("should fail if UID doesn't match", async () => {
    const uid = "user123";
    const token = await generateCSRFToken(uid);

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token }),
    });

    const isValid = await validateCSRFToken(token, "different-uid");
    expect(isValid).toBe(false);
  });

  it("should fail if cookie token doesn't match provided token", async () => {
    const uid = "user123";
    const token1 = await generateCSRFToken(uid);
    // Move time forward
    jest.spyOn(Date, 'now').mockReturnValue(1234567999);
    const token2 = await generateCSRFToken(uid);

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token1 }),
    });

    const isValid = await validateCSRFToken(token2, uid);
    expect(isValid).toBe(false);
  });

  it("should fail if token format is invalid", async () => {
    const invalidToken = Buffer.from("invalid:token").toString("base64");
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: invalidToken }),
    });

    const isValid = await validateCSRFToken(invalidToken, "user123");
    expect(isValid).toBe(false);
  });
});
