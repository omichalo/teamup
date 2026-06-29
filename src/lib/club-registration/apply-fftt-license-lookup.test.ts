import {
  buildFfttIdentityPatchFromLookup,
  buildFfttLicenseLookupPatch,
} from "./apply-fftt-license-lookup";

describe("apply-fftt-license-lookup", () => {
  const player = {
    licence: "1234567",
    prenom: "Jean",
    nom: "DUPONT",
    isHomme: true,
  };

  it("préremplit identité vide sans écraser une saisie existante", () => {
    const empty = buildFfttLicenseLookupPatch(player, {
      firstName: "",
      lastName: "",
      sex: "",
    });
    expect(empty.patch.firstName).toBe("Jean");
    expect(empty.patch.lastName).toBe("DUPONT");
    expect(empty.patch.sex).toBe("male");
    expect(empty.prefilledNames).toBe(true);
    expect(empty.prefilledSex).toBe(true);
    expect(empty.identityMismatch).toBe(false);
    expect(empty.sexMismatch).toBe(false);

    const filled = buildFfttLicenseLookupPatch(player, {
      firstName: "Pierre",
      lastName: "MARTIN",
      sex: "female",
    });
    expect(filled.patch.firstName).toBeUndefined();
    expect(filled.patch.lastName).toBeUndefined();
    expect(filled.patch.sex).toBeUndefined();
    expect(filled.identityMismatch).toBe(true);
    expect(filled.sexMismatch).toBe(true);
    expect(filled.prefilledNames).toBe(false);
    expect(filled.prefilledSex).toBe(false);
  });

  it("expose un patch explicite pour appliquer l'identité FFTT", () => {
    expect(buildFfttIdentityPatchFromLookup(player)).toEqual({
      firstName: "Jean",
      lastName: "DUPONT",
      sex: "male",
    });
  });
});
