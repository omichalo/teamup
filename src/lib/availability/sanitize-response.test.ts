import { sanitizeAvailabilityResponse } from "@/lib/availability/sanitize-response";

describe("sanitizeAvailabilityResponse", () => {
  it("returns undefined for empty payloads", () => {
    expect(sanitizeAvailabilityResponse({})).toBeUndefined();
    expect(sanitizeAvailabilityResponse(null)).toBeUndefined();
  });

  it("trims comments and keeps booleans", () => {
    expect(
      sanitizeAvailabilityResponse({
        available: true,
        comment: "  ok  ",
        fridayAvailable: false,
      })
    ).toEqual({
      available: true,
      comment: "ok",
      fridayAvailable: false,
    });
  });

  it("drops blank comments", () => {
    expect(
      sanitizeAvailabilityResponse({
        available: false,
        comment: "   ",
      })
    ).toEqual({
      available: false,
    });
  });
});
