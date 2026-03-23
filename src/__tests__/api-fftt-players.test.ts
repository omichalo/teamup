/**
 * @jest-environment node
 */
import { GET } from "@/app/api/fftt/players/route";
import { adminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Mocks
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

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("GET /api/fftt/players", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if no session cookie is provided", async () => {
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

  it("should return 403 if user has PLAYER role", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "fake-session-cookie" }),
    });

    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      uid: "user123",
      role: "player",
    });

    const req = new Request("http://localhost/api/fftt/players?clubCode=123");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Accès refusé - Admin ou Coach uniquement");
  });

  it("should return 200 and players if user has ADMIN role", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "fake-session-cookie" }),
    });

    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      uid: "admin123",
      role: "admin",
    });

    const req = new Request("http://localhost/api/fftt/players?clubCode=123");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.players).toBeDefined();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("should return 200 and players if user has COACH role", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "fake-session-cookie" }),
    });

    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      uid: "coach123",
      role: "coach",
    });

    const req = new Request("http://localhost/api/fftt/players?clubCode=123");
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});
