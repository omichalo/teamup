/**
 * @jest-environment node
 */
import { GET as getFfttPlayers } from "@/app/api/fftt/players/route";
import { GET as getTeamsMatches } from "@/app/api/teams/matches/route";
import { adminAuth } from "@/lib/firebase-admin";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  initializeFirebaseAdmin: jest.fn().mockResolvedValue(undefined),
  getFirestoreAdmin: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      forEach: jest.fn(),
    }),
    doc: jest.fn().mockReturnThis(),
  }),
  adminAuth: {
    verifySessionCookie: jest.fn(),
  },
}));

// Mock cookies
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn(),
  }),
}));

// Mock team-matches server actions
jest.mock("@/lib/server/team-matches", () => ({
  getTeams: jest.fn().mockResolvedValue([]),
  getTeamMatches: jest.fn().mockResolvedValue([]),
}));

describe("API Security Regression Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/fftt/players should now return 401 without session cookie", async () => {
    const { cookies } = require("next/headers");
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const req = new Request("http://localhost/api/fftt/players?clubCode=123");
    const response = await getFfttPlayers(req);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Authentification requise");
  });

  it("GET /api/fftt/players should return 403 if email not verified", async () => {
    const { cookies } = require("next/headers");
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "fake-cookie" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: false,
    });

    const req = new Request("http://localhost/api/fftt/players?clubCode=123");
    const response = await getFfttPlayers(req);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Email non vérifié");
  });

  it("GET /api/fftt/players should return 403 if user is just a player", async () => {
    const { cookies } = require("next/headers");
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "fake-cookie" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      email_verified: true,
      role: "player",
    });

    const req = new Request("http://localhost/api/fftt/players?clubCode=123");
    const response = await getFfttPlayers(req);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Accès refusé");
  });

  it("GET /api/teams/matches should now return 401 without session cookie", async () => {
    const { cookies } = require("next/headers");
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const req = new Request("http://localhost/api/teams/matches");
    const response = await getTeamsMatches(req);

    expect(response.status).toBe(401);
  });
});
