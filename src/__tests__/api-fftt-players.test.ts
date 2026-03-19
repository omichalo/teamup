import { GET } from "@/app/api/fftt/players/route";
import { adminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

interface MockResponse {
  status: number;
  json: () => Promise<unknown>;
  headers: {
    get: (name: string) => string | null;
    set: jest.Mock;
  };
}

// Mock next/server
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status ?? 200,
      json: async () => body,
      headers: {
        get: jest.fn((name) => init?.headers?.[name] || null),
        set: jest.fn(),
      },
    })),
  },
}));

// Mock firebase-admin/auth via @/lib/firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifySessionCookie: jest.fn(),
  },
  initializeFirebaseAdmin: jest.fn().mockResolvedValue(undefined),
  getFirestoreAdmin: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({
        forEach: jest.fn(),
      }),
    }),
  }),
}));

describe("GET /api/fftt/players", () => {
  let mockCookies: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies = {
      get: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);
  });

  it("should return 400 if clubCode is missing", async () => {
    const req = { url: "http://localhost/api/fftt/players" } as unknown as Request;
    const res = await GET(req) as unknown as MockResponse;
    const data = await res.json() as { error: string };

    expect(res.status).toBe(400);
    expect(data.error).toBe("Club code parameter is required");
  });

  it("should return 401 if session cookie is missing", async () => {
    const req = { url: "http://localhost/api/fftt/players?clubCode=123" } as unknown as Request;
    mockCookies.get.mockReturnValue(undefined);

    const res = await GET(req) as unknown as MockResponse;
    const data = await res.json() as { error: string };

    expect(res.status).toBe(401);
    expect(data.error).toBe("Authentification requise");
  });

  it("should return 403 if user does not have required role", async () => {
    const req = { url: "http://localhost/api/fftt/players?clubCode=123" } as unknown as Request;
    mockCookies.get.mockReturnValue({ value: "valid-session" });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      uid: "user123",
      role: "player",
    });

    const res = await GET(req) as unknown as MockResponse;
    const data = await res.json() as { error: string };

    expect(res.status).toBe(403);
    expect(data.error).toBe("Accès refusé");
  });

  it("should return 200 if user is admin", async () => {
    const req = { url: "http://localhost/api/fftt/players?clubCode=123" } as unknown as Request;
    mockCookies.get.mockReturnValue({ value: "valid-session" });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      uid: "admin123",
      role: "admin",
    });

    const res = await GET(req) as unknown as MockResponse;
    expect(res.status).toBe(200);

    // Check security headers
    expect(res.headers.set).toHaveBeenCalledWith("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    expect(res.headers.set).toHaveBeenCalledWith("Pragma", "no-cache");
    expect(res.headers.set).toHaveBeenCalledWith("Expires", "0");
  });

  it("should return 200 if user is coach", async () => {
    const req = { url: "http://localhost/api/fftt/players?clubCode=123" } as unknown as Request;
    mockCookies.get.mockReturnValue({ value: "valid-session" });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      uid: "coach123",
      role: "coach",
    });

    const res = await GET(req) as unknown as MockResponse;
    expect(res.status).toBe(200);
  });
});
