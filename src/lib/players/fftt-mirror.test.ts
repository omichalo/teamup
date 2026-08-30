import { describe, expect, it } from "@jest/globals";
import { playerDocDataToFfttMirror, toRosterPlayerMirror } from "./fftt-mirror";
import {
  ffttCategorieFromLookup,
  mergeFfttLicenseLookupFromMirror,
} from "./map-player-to-license-lookup";
import { applyFfttMirrorToRegistration } from "@/lib/club-registration/hydrate-registration-fftt-lookup";

describe("playerDocDataToFfttMirror", () => {
  it("mappe sexe F vers isHomme false et nomClub depuis club", () => {
    const mirror = playerDocDataToFfttMirror("1234567", {
      prenom: "Léa",
      nom: "Martin",
      sexe: "F",
      club: "SQY PING",
      categorie: "Sénior",
      points: 1120,
      listedInClub: true,
    });
    expect(mirror).toMatchObject({
      licence: "1234567",
      prenom: "Léa",
      isHomme: false,
      nomClub: "SQY PING",
      categorie: "Sénior",
      pointsLicence: 1120,
      listedInClub: true,
      typeLicence: null,
    });
  });

  it("préfère nomClub, isHomme et pointsLicence du document", () => {
    const mirror = playerDocDataToFfttMirror("99", {
      nomClub: "Autre Club",
      club: "SQY PING",
      isHomme: true,
      sexe: "F",
      pointsLicence: 50,
      points: 999,
      typeLicence: "T",
    });
    expect(mirror.nomClub).toBe("Autre Club");
    expect(mirror.isHomme).toBe(true);
    expect(mirror.pointsLicence).toBe(50);
    expect(mirror.typeLicence).toBe("T");
  });
});

describe("mergeFfttLicenseLookupFromMirror", () => {
  const stored = {
    licence: "1234567",
    nom: "Ancien",
    prenom: "Jean",
    nomClub: "Ancien club",
    categorie: "Vétéran",
    pointsLicence: 800,
    typeLicence: "T",
  };

  it("conserve le cliché sans fiche players utilisable", () => {
    expect(mergeFfttLicenseLookupFromMirror(stored, null)).toMatchObject(stored);
    expect(
      mergeFfttLicenseLookupFromMirror(stored, {
        licence: "1234567",
        listedInClub: false,
        isTemporary: true,
        typeLicence: null,
        categorie: "Sénior",
      })
    ).toMatchObject(stored);
  });

  it("overlay les champs non vides du miroir et garde la catégorie du cliché si absente", () => {
    const merged = mergeFfttLicenseLookupFromMirror(stored, {
      licence: "1234567",
      listedInClub: true,
      isTemporary: false,
      nom: "Dupont",
      prenom: "Jean",
      nomClub: "SQY PING",
      pointsLicence: 910,
      typeLicence: null,
      isHomme: true,
    });
    expect(merged).toMatchObject({
      licence: "1234567",
      nom: "DUPONT",
      prenom: "Jean",
      nomClub: "SQY PING",
      categorie: "Vétéran",
      pointsLicence: 910,
      typeLicence: null,
      isHomme: true,
    });
  });

  it("prend la catégorie du miroir quand elle est présente", () => {
    const merged = mergeFfttLicenseLookupFromMirror(stored, {
      licence: "1234567",
      listedInClub: true,
      isTemporary: false,
      typeLicence: "P",
      categorie: "Sénior",
    });
    expect(merged?.categorie).toBe("Sénior");
    expect(merged?.typeLicence).toBe("P");
  });
});

describe("applyFfttMirrorToRegistration", () => {
  it("expose ffttCategorie dérivée du lookup hydraté", () => {
    const hydrated = applyFfttMirrorToRegistration(
      {
        id: "reg_1",
        ffttLicense: "1234567",
        ffttLicenseLookup: { licence: "1234567", categorie: "Poussin" },
      },
      {
        licence: "1234567",
        listedInClub: true,
        isTemporary: false,
        typeLicence: "T",
        categorie: "Sénior",
      }
    );
    expect(hydrated.ffttCategorie).toBe("Sénior");
    expect(
      (hydrated.ffttLicenseLookup as { categorie?: string }).categorie
    ).toBe("Sénior");
  });

  it("dérive ffttCategorie du cliché si le miroir est absent", () => {
    const hydrated = applyFfttMirrorToRegistration(
      {
        id: "reg_2",
        ffttLicenseLookup: { licence: "1", categorie: "Cadet" },
      },
      null
    );
    expect(hydrated.ffttCategorie).toBe("Cadet");
  });
});

describe("toRosterPlayerMirror", () => {
  it("renvoie listedInClub false si la fiche est absente", () => {
    expect(toRosterPlayerMirror(null)).toEqual({
      listedInClub: false,
      typeLicence: null,
      nomClub: null,
    });
  });
});

describe("ffttCategorieFromLookup", () => {
  it("ignore les catégories vides", () => {
    expect(ffttCategorieFromLookup(undefined)).toBeUndefined();
    expect(ffttCategorieFromLookup({ licence: "1", categorie: "  " })).toBeUndefined();
    expect(ffttCategorieFromLookup({ licence: "1", categorie: "Sénior" })).toBe(
      "Sénior"
    );
  });
});
