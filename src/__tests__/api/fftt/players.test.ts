/**
 * @jest-environment node
 */
import { GET } from "@/app/api/fftt/players/route";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

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

describe("GET /api/fftt/players", () => {
  const mockRequest = new Request("http://localhost/api/fftt/players?clubCode=08781477");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if no session cookie is present", async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Authentification requise");
  });

  it("should return 403 if email is not verified", async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "valid-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: false,
      role: "admin",
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Email non vérifié");
  });

  it("should return 403 if user is not admin or coach", async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "valid-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: true,
      role: "player",
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Accès refusé");
  });

  it("should return 200 and players data for authorized admin", async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "valid-session" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: true,
      role: "admin",
    });

    const mockPlayers = [
      { id: "1", points: 1000, firstName: "John", lastName: "Doe" },
      { id: "2", points: 1200, firstName: "Jane", lastName: "Smith" },
    ];

    const mockSnapshot = {
      forEach: (callback: (doc: { id: string; data: () => unknown }) => void) => {
        mockPlayers.forEach((p) => callback({ id: p.id, data: () => p }));
      },
    };

    (getFirestoreAdmin as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockSnapshot),
      }),
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.players).toHaveLength(2);
    expect(data.players[0].points).toBe(1200); // Sorted
    expect(response.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate, proxy-revalidate");
  });
});
