import { generateCSRFToken, validateCSRFToken } from "./csrf-utils";
import { cookies } from "next/headers";
import { createHmac } from "node:crypto";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("CSRF Utils Security Audit", () => {
  const MOCK_SECRET = "test-secret-key-that-should-not-be-leaked";
  const MOCK_UID = "user-123";

  beforeEach(() => {
    process.env.CSRF_SECRET = MOCK_SECRET;
    jest.clearAllMocks();
  });

  it("should NOT leak the CSRF_SECRET in the generated token", async () => {
    const token = await generateCSRFToken(MOCK_UID);
    expect(token).not.toContain(MOCK_SECRET);

    const [payloadBase64, signature] = token.split(".");
    const decoded = Buffer.from(payloadBase64, "base64").toString("utf-8");
    expect(decoded).not.toContain(MOCK_SECRET);
    expect(signature).not.toBe(MOCK_SECRET);
  });

  it("should validate a valid token", async () => {
    const token = await generateCSRFToken(MOCK_UID);

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: token }),
    }));

    const isValid = await validateCSRFToken(token, MOCK_UID);
    expect(isValid).toBe(true);
  });

  it("should reject a token with wrong UID", async () => {
    const token = await generateCSRFToken(MOCK_UID);

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: token }),
    }));

    const isValid = await validateCSRFToken(token, "wrong-uid");
    expect(isValid).toBe(false);
  });

  it("should reject a tampered token", async () => {
    const token = await generateCSRFToken(MOCK_UID);
    const [payloadBase64, signature] = token.split(".");

    const decoded = Buffer.from(payloadBase64, "base64").toString("utf-8");
    const [, timestamp] = decoded.split(":");

    // Tamper with UID but keep original signature
    const tamperedPayload = Buffer.from(`attacker-uid:${timestamp}`).toString("base64");
    const tamperedToken = `${tamperedPayload}.${signature}`;

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: token }),
    }));

    const isValid = await validateCSRFToken(tamperedToken, "attacker-uid");
    expect(isValid).toBe(false);
  });

  it("should reject expired tokens", async () => {
    // 25 hours ago
    const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000);
    const message = `${MOCK_UID}:${oldTimestamp}`;
    const signature = createHmac("sha256", MOCK_SECRET).update(message).digest("base64");
    const expiredToken = `${Buffer.from(message).toString("base64")}.${signature}`;

    (cookies as jest.Mock).mockReturnValue(Promise.resolve({
      get: jest.fn().mockReturnValue({ value: expiredToken }),
    }));

    const isValid = await validateCSRFToken(expiredToken, MOCK_UID);
    expect(isValid).toBe(false);
  });
});
