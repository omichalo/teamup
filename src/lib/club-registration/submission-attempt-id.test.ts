/**
 * @jest-environment node
 */

import {
  parseSubmissionAttemptId,
  readSubmissionAttemptId,
} from "./submission-attempt-id";

describe("submission-attempt-id", () => {
  it("accepte un UUID v4 valide", () => {
    expect(parseSubmissionAttemptId("A1B2C3D4-E5F6-4789-ABCD-EF0123456789")).toBe(
      "a1b2c3d4-e5f6-4789-abcd-ef0123456789"
    );
  });

  it("rejette un identifiant invalide", () => {
    expect(parseSubmissionAttemptId("not-a-uuid")).toBeNull();
    expect(parseSubmissionAttemptId("")).toBeNull();
  });

  it("lit l'en-tête HTTP de soumission", () => {
    const req = new Request("https://example.com/api/club/registration", {
      headers: {
        "x-registration-attempt-id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      },
    });
    expect(readSubmissionAttemptId(req)).toBe(
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    );
  });
});
