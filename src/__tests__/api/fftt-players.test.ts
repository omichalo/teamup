/**
 * @jest-environment node
 */
import { GET } from "@/app/api/fftt/players/route";
import { adminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Mock des dépendances
jest.mock("@/lib/firebase-admin", () => ({
  initializeFirebaseAdmin: jest.fn(),
  getFirestoreAdmin: jest.fn(),
  adminAuth: {
    verifySessionCookie: jest.fn(),
  },
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("GET /api/fftt/players security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if no session cookie is provided", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const req = new Request("http://localhost/api/fftt/players?clubCode=123");
    const response = await GET(req);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Authentification requise");
  });

  it("should return 403 if email is not verified", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "fake-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: false,
    });

    const req = new Request("http://localhost/api/fftt/players?clubCode=123");
    const response = await GET(req);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Email non vérifié");
  });

  it("should return 403 if user has PLAYER role", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "fake-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: true,
      role: "player",
    });

    const req = new Request("http://localhost/api/fftt/players?clubCode=123");
    const response = await GET(req);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Accès refusé");
  });

  it("should return 401 if session cookie is invalid", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "invalid-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockRejectedValue(new Error("invalid"));

    const req = new Request("http://localhost/api/fftt/players?clubCode=123");
    const response = await GET(req);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Session invalide");
  });
});
