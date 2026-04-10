/** @jest-environment node */
import { generateCSRFToken, validateCSRFToken } from "@/lib/auth/csrf-utils";
import { cookies, headers } from "next/headers";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

describe("CSRF Utils Hardening", () => {
  const mockUid = "test-uid";
  const mockSecret = "test-secret-that-is-at-least-32-chars-long";
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv, CSRF_SECRET: mockSecret };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should generate a signed token and validate it successfully", async () => {
    const token = await generateCSRFToken(mockUid);

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token }),
    });
    (headers as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(token),
    });

    const isValid = await validateCSRFToken(token, mockUid);
    expect(isValid).toBe(true);
  });

  it("should fail if the token is tampered with", async () => {
    const token = await generateCSRFToken(mockUid);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    // Tamper with the UID in the data part
    const tamperedData = `other-uid:${parts[1]}`;
    const tamperedToken = Buffer.from(`${tamperedData}:${parts[2]}`).toString("base64");

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(tamperedToken),
    });

    const isValid = await validateCSRFToken(tamperedToken, mockUid);
    expect(isValid).toBe(false);
  });

  it("should fail if the secret is different", async () => {
    const token = await generateCSRFToken(mockUid);

    // Change secret for validation
    process.env.CSRF_SECRET = "different-secret-that-is-also-long-enough";

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(token),
    });

    const isValid = await validateCSRFToken(token, mockUid);
    expect(isValid).toBe(false);
  });

  it("should fail if the token and cookie don't match", async () => {
    const token = await generateCSRFToken(mockUid);
    const otherToken = await generateCSRFToken(mockUid);

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(token),
    });

    const isValid = await validateCSRFToken(otherToken, mockUid);
    expect(isValid).toBe(false);
  });
});
