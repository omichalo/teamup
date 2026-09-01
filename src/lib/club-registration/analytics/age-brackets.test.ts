import { resolveAgeBracketId, ageBracketLabel } from "./age-brackets";

describe("resolveAgeBracketId", () => {
  it("classe selon la date de référence saison", () => {
    expect(resolveAgeBracketId("2018-01-01", "2025-2026")).toBe("7_10");
    expect(resolveAgeBracketId("2012-06-01", "2025-2026")).toBe("13_14");
    expect(resolveAgeBracketId("1960-01-01", "2025-2026")).toBe("65_plus");
  });

  it("retourne unknown si date absente", () => {
    expect(resolveAgeBracketId(undefined, "2025-2026")).toBe("unknown");
    expect(ageBracketLabel("unknown")).toBe("Non renseigné");
  });
});
