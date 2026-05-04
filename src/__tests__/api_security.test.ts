/**
 * @jest-environment node
 */
import { GET as getPlayers } from "@/app/api/fftt/players/route";
import { GET as getMatches } from "@/app/api/teams/matches/route";
import { adminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  initializeFirebaseAdmin: jest.fn().mockResolvedValue(undefined),
  getFirestoreAdmin: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ forEach: jest.fn() }),
  }),
  adminAuth: {
    verifySessionCookie: jest.fn(),
  },
}));

// Mock server team-matches
jest.mock("@/lib/server/team-matches", () => ({
  getTeams: jest.fn().mockResolvedValue([]),
  getTeamMatches: jest.fn().mockResolvedValue([]),
}));

describe("API Security Tests", () => {
  const mockCookies = cookies as jest.Mock;
  const mockVerifySessionCookie = adminAuth.verifySessionCookie as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/fftt/players", () => {
    it("should return 401 if no session cookie is present", async () => {
      mockCookies.mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const req = new Request("http://localhost/api/fftt/players?clubCode=123");
      const response = await getPlayers(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Authentification requise");
    });

    it("should return 403 if email is not verified", async () => {
      mockCookies.mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: "fake-cookie" }),
      });
      mockVerifySessionCookie.mockResolvedValue({
        email_verified: false,
        uid: "user123",
      });

      const req = new Request("http://localhost/api/fftt/players?clubCode=123");
      const response = await getPlayers(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Email non vérifié");
    });

    it("should return 403 if user has insufficient role", async () => {
      mockCookies.mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: "fake-cookie" }),
      });
      mockVerifySessionCookie.mockResolvedValue({
        email_verified: true,
        uid: "user123",
        role: "player",
      });

      const req = new Request("http://localhost/api/fftt/players?clubCode=123");
      const response = await getPlayers(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Accès refusé");
    });
  });

  describe("GET /api/teams/matches", () => {
    it("should return 401 if no session cookie is present", async () => {
      mockCookies.mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const req = new Request("http://localhost/api/teams/matches");
      const response = await getMatches(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Authentification requise");
    });

    it("should return 403 if user has insufficient role", async () => {
      mockCookies.mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: "fake-cookie" }),
      });
      mockVerifySessionCookie.mockResolvedValue({
        email_verified: true,
        uid: "user123",
        role: "player",
      });

      const req = new Request("http://localhost/api/teams/matches");
      const response = await getMatches(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Accès refusé");
    });
  });
});
