/**
 * @jest-environment node
 */
import { GET } from "../app/api/fftt/players/route";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifySessionCookie: jest.fn(),
  },
  getFirestoreAdmin: jest.fn(),
  initializeFirebaseAdmin: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("GET /api/fftt/players security", () => {
  const mockRequest = new Request("http://localhost/api/fftt/players?clubCode=123");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if no session cookie is present", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentification requise");
  });

  it("should return 403 if email is not verified", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "valid-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: false,
      uid: "user123",
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Email non vérifié");
  });

  it("should return 403 if user does not have ADMIN or COACH role", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "valid-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: true,
      uid: "user123",
      role: "player",
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Accès refusé");
  });

  it("should return 200 and data if user is ADMIN", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "valid-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: true,
      uid: "user123",
      role: "admin",
    });

    const mockDocs = [
      {
        id: "p1",
        data: () => ({
          points: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    ];

    (getFirestoreAdmin as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          forEach: (callback: any) => mockDocs.forEach(callback),
        }),
      }),
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.players).toBeDefined();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("should return 200 and data if user is COACH", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "valid-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: true,
      uid: "user123",
      role: "coach",
    });

    const mockDocs = [
      {
        id: "p1",
        data: () => ({
          points: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    ];

    (getFirestoreAdmin as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          forEach: (callback: any) => mockDocs.forEach(callback),
        }),
      }),
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.players).toBeDefined();
  });
});
