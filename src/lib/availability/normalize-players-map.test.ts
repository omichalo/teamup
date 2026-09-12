import { normalizePlayersMap } from "@/lib/availability/normalize-players-map";

describe("normalizePlayersMap", () => {
  it("returns empty object for missing data", () => {
    expect(normalizePlayersMap(null)).toEqual({});
    expect(normalizePlayersMap(undefined)).toEqual({});
  });

  it("reads nested players map", () => {
    expect(
      normalizePlayersMap({
        players: {
          "7864877": { available: true, comment: "ok" },
          "111": { available: false },
        },
      })
    ).toEqual({
      "7864877": { available: true, comment: "ok" },
      "111": { available: false },
    });
  });

  it("reads corrupted dotted top-level fields", () => {
    expect(
      normalizePlayersMap({
        journee: 1,
        "players.7864877": { available: true },
        "players.111": { available: false, fridayAvailable: true },
      })
    ).toEqual({
      "7864877": { available: true },
      "111": { available: false, fridayAvailable: true },
    });
  });

  it("prefers nested map over dotted duplicate", () => {
    expect(
      normalizePlayersMap({
        players: {
          "7864877": { available: false },
        },
        "players.7864877": { available: true },
      })
    ).toEqual({
      "7864877": { available: false },
    });
  });

  it("ignores empty or invalid player payloads", () => {
    expect(
      normalizePlayersMap({
        players: {
          "1": {},
          "2": { comment: "" },
          "3": "nope",
        },
        "players.4": null,
      })
    ).toEqual({});
  });
});
