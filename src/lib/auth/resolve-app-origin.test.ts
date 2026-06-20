import { afterEach, describe, expect, it } from "@jest/globals";
import {
  buildDirectAppActionLink,
  isLocalhostUrl,
  resolveAppOrigin,
  withActionContinueUrl,
} from "./resolve-app-origin";

function requestWithHeaders(headers: Record<string, string>): Request {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    headers: {
      get: (name: string) => normalized[name.toLowerCase()] ?? null,
    },
  } as Request;
}

describe("resolveAppOrigin", () => {
  const originalAppUrl = process.env.APP_URL;
  const originalPublicUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = originalAppUrl;
    }
    if (originalPublicUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalPublicUrl;
    }
    if (originalProjectId === undefined) {
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    } else {
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = originalProjectId;
    }
  });

  it("prefers non-localhost APP_URL", () => {
    process.env.APP_URL =
      "https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app";
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(
      resolveAppOrigin(
        requestWithHeaders({
          origin: "http://localhost:3000",
        })
      )
    ).toBe("https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app");
  });

  it("uses Origin when env is localhost", () => {
    process.env.APP_URL = "http://localhost:3000";
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(
      resolveAppOrigin(
        requestWithHeaders({
          origin: "https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app",
        })
      )
    ).toBe("https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app");
  });

  it("uses forwarded host when env is missing", () => {
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(
      resolveAppOrigin(
        requestWithHeaders({
          "x-forwarded-proto": "https",
          "x-forwarded-host":
            "teamup-staging--sqyping-teamup-dev.us-east4.hosted.app",
        })
      )
    ).toBe("https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app");
  });

  it("falls back to localhost in local dev", () => {
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(
      resolveAppOrigin(
        requestWithHeaders({
          host: "localhost:3000",
        })
      )
    ).toBe("http://localhost:3000");
  });

  it("uses known staging origin when env is localhost and request is hosted", () => {
    process.env.APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "sqyping-teamup-dev";
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(
      resolveAppOrigin(
        requestWithHeaders({
          "x-forwarded-proto": "https",
          "x-forwarded-host":
            "teamup-staging--sqyping-teamup-dev.us-east4.hosted.app",
        })
      )
    ).toBe("https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app");
  });

  it("keeps localhost when env is localhost and request is local", () => {
    process.env.APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "sqyping-teamup-dev";
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(
      resolveAppOrigin(
        requestWithHeaders({
          host: "localhost:3000",
          origin: "http://localhost:3000",
        })
      )
    ).toBe("http://localhost:3000");
  });
});

describe("isLocalhostUrl", () => {
  it("detects localhost URLs", () => {
    expect(isLocalhostUrl("http://localhost:3000/auth")).toBe(true);
    expect(
      isLocalhostUrl(
        "https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app"
      )
    ).toBe(false);
  });
});

describe("withActionContinueUrl", () => {
  it("replaces continueUrl in Firebase oob links", () => {
    const link =
      "https://sqyping-teamup-dev.firebaseapp.com/__/auth/action?mode=verifyEmail&continueUrl=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fverify-email&oobCode=abc";
    const updated = withActionContinueUrl(
      link,
      "https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app/auth/verify-email"
    );

    expect(updated).toContain(
      "continueUrl=https%3A%2F%2Fteamup-staging--sqyping-teamup-dev.us-east4.hosted.app%2Fauth%2Fverify-email"
    );
    expect(updated).not.toContain("localhost");
  });
});

describe("buildDirectAppActionLink", () => {
  const stagingOrigin =
    "https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app";

  it("builds a direct app link for email verification", () => {
    const firebaseLink =
      "https://sqyping-teamup-dev.firebaseapp.com/__/auth/action?mode=verifyEmail&continueUrl=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fverify-email&oobCode=abc123";

    expect(
      buildDirectAppActionLink(
        firebaseLink,
        stagingOrigin,
        "/auth/verify-email"
      )
    ).toBe(
      "https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app/auth/verify-email?oobCode=abc123&mode=verifyEmail"
    );
  });

  it("builds a direct app link for password reset", () => {
    const firebaseLink =
      "http://localhost:3000/__/auth/action?mode=resetPassword&oobCode=reset456";

    expect(
      buildDirectAppActionLink(firebaseLink, stagingOrigin, "/reset-password")
    ).toBe(
      "https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app/reset-password?oobCode=reset456&mode=resetPassword"
    );
  });
});
