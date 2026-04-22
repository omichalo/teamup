/** @jest-environment node */
import { GET } from "../route";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";

// Mock des dépendances
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifySessionCookie: jest.fn(),
  },
  initializeFirebaseAdmin: jest.fn(),
  getFirestoreAdmin: jest.fn(() => ({
    collection: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({
        forEach: jest.fn(),
      })),
    })),
  })),
}));

jest.mock("@/lib/auth/csrf-utils", () => ({
  validateOrigin: jest.fn(),
}));

describe("GET /api/fftt/players", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateOrigin as jest.Mock).mockReturnValue(true);
  });

  it("should return 403 if origin is invalid", async () => {
    (validateOrigin as jest.Mock).mockReturnValue(false);
    const req = new Request("http://localhost/api/fftt/players?clubCode=123");

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid origin");
  });

  it("should return 401 if session cookie is missing", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });
    const req = new Request("http://localhost/api/fftt/players?clubCode=123");

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Authentification requise");
  });

  it("should return 403 if email is not verified", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "fake-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: false,
      role: "admin",
    });
    const req = new Request("http://localhost/api/fftt/players?clubCode=123");

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Email non vérifié");
  });

  it("should return 403 if user is not admin or coach", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "fake-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: true,
      role: "player",
    });
    const req = new Request("http://localhost/api/fftt/players?clubCode=123");

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Accès refusé - Permissions insuffisantes");
  });

  it("should return 200 and players if authenticated as admin", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "fake-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: true,
      role: "admin",
    });
    const req = new Request("http://localhost/api/fftt/players?clubCode=123");

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.players)).toBe(true);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
