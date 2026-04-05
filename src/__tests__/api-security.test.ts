/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET as getPlayers } from "@/app/api/fftt/players/route";
import { GET as getMatches } from "@/app/api/teams/matches/route";
import { adminAuth } from "@/lib/firebase-admin";

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifySessionCookie: jest.fn(),
  },
  initializeFirebaseAdmin: jest.fn(),
  getFirestoreAdmin: jest.fn(),
}));

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

import { cookies } from "next/headers";

describe("API Security Tests", () => {
  const endpoints = [
    { name: "fftt/players", handler: getPlayers, url: "http://localhost/api/fftt/players?clubCode=123" },
    { name: "teams/matches", handler: getMatches, url: "http://localhost/api/teams/matches" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  endpoints.forEach(({ name, handler, url }) => {
    describe(`Endpoint: ${name}`, () => {
      it("should return 401 if no session cookie is present", async () => {
        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue(undefined),
        });

        const req = new NextRequest(url);
        const res = await handler(req);

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toMatch(/Authentification requise/i);
      });

      it("should return 401 if session cookie is invalid", async () => {
        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue({ value: "invalid-cookie" }),
        });
        (adminAuth.verifySessionCookie as jest.Mock).mockRejectedValue(new Error("Invalid cookie"));

        const req = new NextRequest(url);
        const res = await handler(req);

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toMatch(/Session invalide/i);
      });

      it("should return 403 if email is not verified", async () => {
        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue({ value: "valid-cookie" }),
        });
        (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
          email_verified: false,
          role: "admin",
        });

        const req = new NextRequest(url);
        const res = await handler(req);

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toMatch(/Email non vérifié/i);
      });

      it("should return 403 if user has PLAYER role", async () => {
        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue({ value: "valid-cookie" }),
        });
        (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
          email_verified: true,
          role: "player",
        });

        const req = new NextRequest(url);
        const res = await handler(req);

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toMatch(/Accès refusé/i);
      });

      it("should return 403 if user has no role", async () => {
        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue({ value: "valid-cookie" }),
        });
        (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
          email_verified: true,
        });

        const req = new NextRequest(url);
        const res = await handler(req);

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toMatch(/Accès refusé/i);
      });
    });
  });
});
