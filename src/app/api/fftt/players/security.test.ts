/**
 * @jest-environment node
 */
import { GET } from "./route";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

// Mock des dépendances
jest.mock("next/headers");
jest.mock("@/lib/firebase-admin", () => ({
  initializeFirebaseAdmin: jest.fn().mockResolvedValue(undefined),
  getFirestoreAdmin: jest.fn(),
  adminAuth: {
    verifySessionCookie: jest.fn(),
  },
}));

describe("Players API Security", () => {
  const mockRequest = new Request("http://localhost/api/fftt/players?clubCode=123");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if no session cookie is provided", async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 401 if session cookie is invalid", async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "invalid-cookie" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockRejectedValue(new Error("Invalid token"));

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid session");
  });

  it("should return 403 if email is not verified", async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "valid-cookie" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      uid: "user123",
      email_verified: false,
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Email verification required");
  });

  it("should return 403 if user has insufficient role", async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "valid-cookie" }),
    });
    (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      uid: "user123",
      email_verified: true,
      role: "player",
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Access denied");
  });
});
