import {
  hasFfttIdentityMismatch,
  hasFfttSexMismatch,
  normalizeIdentityToken,
} from "./compare-fftt-identity";

describe("compare-fftt-identity", () => {
  it("normalise casse et accents", () => {
    expect(normalizeIdentityToken("  Théo  ")).toBe("THEO");
    expect(normalizeIdentityToken("NOSPERGER")).toBe("NOSPERGER");
  });

  it("détecte un écart entre identité déclarative et FFTT", () => {
    expect(
      hasFfttIdentityMismatch(
        { firstName: "Théo", lastName: "NOSPERGER" },
        { firstName: "Theo", lastName: "NOSPERGER" }
      )
    ).toBe(false);
    expect(
      hasFfttIdentityMismatch(
        { firstName: "Théo", lastName: "NOSPERGER" },
        { firstName: "Thomas", lastName: "NOSPERGER" }
      )
    ).toBe(true);
    expect(
      hasFfttIdentityMismatch(
        { firstName: "Théo", lastName: "NOSPERGER" },
        { firstName: "", lastName: "" }
      )
    ).toBe(false);
  });

  it("détecte un écart de sexe FFTT", () => {
    expect(hasFfttSexMismatch("female", true)).toBe(true);
    expect(hasFfttSexMismatch("male", true)).toBe(false);
    expect(hasFfttSexMismatch("", true)).toBe(false);
  });
});
