import { generateCSRFToken, validateCSRFToken } from "@/lib/auth/csrf-utils";
import { cookies } from "next/headers";

// Mock de next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

// Mock de process.env
const originalEnv = process.env;

describe("CSRF Utils Security", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CSRF_SECRET: "super-secret-key", NODE_ENV: "test" };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should not leak the secret in the generated token", async () => {
    const uid = "user-123";
    const token = await generateCSRFToken(uid);

    // Décodage du token base64
    const decoded = Buffer.from(token, "base64").toString("utf-8");

    // Vérifier si le secret est présent dans le token décodé
    expect(decoded).not.toContain("super-secret-key");

    // Le format doit être uid:timestamp:signature
    const parts = decoded.split(":");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe(uid);
  });

  it("should validate a correct token", async () => {
    const uid = "user-123";
    const token = await generateCSRFToken(uid);

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token })
    });

    const isValid = await validateCSRFToken(token, uid);
    expect(isValid).toBe(true);
  });

  it("should reject a token with wrong UID", async () => {
    const uid = "user-123";
    const token = await generateCSRFToken(uid);

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token })
    });

    const isValid = await validateCSRFToken(token, "other-user");
    expect(isValid).toBe(false);
  });

  it("should reject an expired token", async () => {
    const uid = "user-123";
    // Créer un token manuellement avec un timestamp vieux de 48h
    const oldTimestamp = (Date.now() - 48 * 60 * 60 * 1000).toString();
    const data = `${uid}:${oldTimestamp}`;

    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", "super-secret-key");
    hmac.update(data);
    const signature = hmac.digest("hex");
    const token = Buffer.from(`${data}:${signature}`).toString("base64");

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token })
    });

    const isValid = await validateCSRFToken(token, uid);
    expect(isValid).toBe(false);
  });

  it("should reject a tampered token", async () => {
    const uid = "user-123";
    const token = await generateCSRFToken(uid);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");

    // Changer le UID mais garder la même signature
    parts[0] = "attacker";
    const tamperedToken = Buffer.from(parts.join(":")).toString("base64");

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: tamperedToken })
    });

    const isValid = await validateCSRFToken(tamperedToken, "attacker");
    expect(isValid).toBe(false);
  });
});
