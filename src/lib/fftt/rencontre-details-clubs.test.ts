import {
  countNamedRencontrePlayers,
  countRencontrePlayersWithPoints,
  getDetailsRencontreWithClubFallback,
  preferRencontreDetailsWithPoints,
} from "./rencontre-details-clubs";

describe("rencontre-details-clubs", () => {
  const emptySheet = {
    joueursA: {},
    joueursB: {},
  };

  const withoutPoints = {
    joueursA: {
      "VERITE Jeremy": { nom: "VERITE", prenom: "Jeremy", licence: "", points: null },
      "LAGUERRE Arnaud": {
        nom: "LAGUERRE",
        prenom: "Arnaud",
        licence: "",
        points: null,
      },
    },
    joueursB: {
      "TINDILLERE Francois": {
        nom: "TINDILLERE",
        prenom: "Francois",
        licence: "",
        points: null,
      },
    },
  };

  const withPoints = {
    joueursA: {
      "VERITE Jeremy": {
        nom: "VERITE",
        prenom: "Jeremy",
        licence: "7841644",
        points: 1479,
      },
      "LAGUERRE Arnaud": {
        nom: "LAGUERRE",
        prenom: "Arnaud",
        licence: "78101147",
        points: 1223,
      },
    },
    joueursB: {
      "TINDILLERE Francois": {
        nom: "TINDILLERE",
        prenom: "Francois",
        licence: "123",
        points: 1100,
      },
    },
  };

  it("compte les joueurs nommés et avec points", () => {
    expect(countNamedRencontrePlayers(withoutPoints)).toBe(3);
    expect(countRencontrePlayersWithPoints(withoutPoints)).toBe(0);
    expect(countRencontrePlayersWithPoints(withPoints)).toBe(3);
    expect(countNamedRencontrePlayers(emptySheet)).toBe(0);
  });

  it("préfère le détail avec points quand clubnums sont inversés", () => {
    expect(preferRencontreDetailsWithPoints(withoutPoints, withPoints)).toBe(
      withPoints
    );
    expect(preferRencontreDetailsWithPoints(withPoints, withoutPoints)).toBe(
      withPoints
    );
  });

  it("conserve le primaire si feuille vide ou swapped absent", () => {
    expect(preferRencontreDetailsWithPoints(emptySheet, withPoints)).toBe(
      emptySheet
    );
    expect(preferRencontreDetailsWithPoints(withoutPoints, null)).toBe(
      withoutPoints
    );
  });

  it("réessaie avec clubs inversés si points absents", async () => {
    const calls: Array<[string, string]> = [];
    const api = {
      getDetailsRencontreByLien: async (
        _lien: string,
        clubA: string,
        clubB: string
      ) => {
        calls.push([clubA, clubB]);
        if (clubA === "club1" && clubB === "club2") return withoutPoints;
        return withPoints;
      },
    };

    const result = await getDetailsRencontreWithClubFallback(
      api,
      "lien",
      "club1",
      "club2"
    );
    expect(calls).toEqual([
      ["club1", "club2"],
      ["club2", "club1"],
    ]);
    expect(result).toBe(withPoints);
  });

  it("ne réessaie pas si les points sont déjà présents", async () => {
    const calls: Array<[string, string]> = [];
    const api = {
      getDetailsRencontreByLien: async (
        _lien: string,
        clubA: string,
        clubB: string
      ) => {
        calls.push([clubA, clubB]);
        return withPoints;
      },
    };

    const result = await getDetailsRencontreWithClubFallback(
      api,
      "lien",
      "club1",
      "club2"
    );
    expect(calls).toEqual([["club1", "club2"]]);
    expect(result).toBe(withPoints);
  });
});
