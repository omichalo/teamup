import type { Match } from "@/types";
import type { MatchData } from "./team-matches-sync-types";
import {
  buildCanonicalCompositionPlayerKeys,
  compareMatchesByJourneeThenDate,
  getSQYCompositionPlayers,
  isPlayedTeamMatch,
  listLicensedSqyPlayersInMatch,
} from "./match-composition-utils";

describe("getSQYCompositionPlayers", () => {
  it("utilise la feuille FFTT et ignore les entrées joueursSQY fantômes", () => {
    const match = {
      resultatsIndividuels: {
        nomEquipeA: "SQY PING 5",
        nomEquipeB: "ADV",
        joueursA: {
          a: { nom: "BARGET", prenom: "Yannis" },
          b: { nom: "FERREIRA", prenom: "Joao Marques" },
          c: { nom: "FOUCHE", prenom: "Erwann" },
        },
        joueursB: {},
        parties: [],
      },
      joueursSQY: [
        { licence: "7891628", nom: "FERREIRA", prenom: "Joao Marques" },
        { licence: "7885728", nom: "BARGET", prenom: "Yannis" },
        { licence: "7886612", nom: "FOUCHE", prenom: "Erwann" },
        { licence: "217409", nom: "", prenom: "" },
      ],
    } as unknown as Match;

    const players = getSQYCompositionPlayers(match);
    expect(players).toHaveLength(3);
    expect(players.map((p) => p.nom)).toEqual(
      expect.arrayContaining(["BARGET", "FERREIRA", "FOUCHE"])
    );
  });

  it("reconstruit depuis les parties individuelles si la feuille est absente", () => {
    const match = {
      isHome: false,
      resultatsIndividuels: {
        nomEquipeA: "ADV",
        nomEquipeB: "SQY PING 5",
        joueursA: {},
        joueursB: {},
        parties: [
          { joueurA: "ADV Player", joueurB: "Baptiste GOSSA", scoreA: 0, scoreB: 3 },
          { joueurA: "Other ADV", joueurB: "Yannis BARGET", scoreA: 1, scoreB: 3 },
        ],
      },
      joueursSQY: [],
    } as unknown as Match;

    const players = getSQYCompositionPlayers(match);
    expect(players).toHaveLength(2);
    expect(players.map((p) => p.nom)).toEqual(
      expect.arrayContaining(["GOSSA", "BARGET"])
    );
  });
});

describe("isPlayedTeamMatch", () => {
  it("exclut les matchs 0-0", () => {
    expect(isPlayedTeamMatch({ score: "0-0" } as Match)).toBe(false);
    expect(isPlayedTeamMatch({ score: "11-27" } as Match)).toBe(true);
  });
});

describe("listLicensedSqyPlayersInMatch", () => {
  it("compte un joueur issu des parties avec licence rattachee par nom", () => {
    const match = {
      isHome: false,
      resultatsIndividuels: {
        nomEquipeA: "ADV",
        nomEquipeB: "SQY PING 3",
        joueursA: {},
        joueursB: {},
        parties: [
          { joueurA: "ADV", joueurB: "Thibaud LEROY", scoreA: 0, scoreB: 3 },
        ],
      },
      joueursSQY: [{ licence: "111", nom: "LEROY", prenom: "Thibaud", points: 1990 }],
    } as unknown as MatchData;

    const players = listLicensedSqyPlayersInMatch(match);
    expect(players).toHaveLength(1);
    expect(players[0]?.licence).toBe("111");
  });
});

describe("buildCanonicalCompositionPlayerKeys", () => {
  it("fusionne licence et nom pour le même joueur", () => {
    const players = [
      { nom: "LEROY", prenom: "Thibaud" },
      { nom: "LEROY", prenom: "Thibaud", licence: "123456", points: 1990 },
    ];
    const { canonicalKey } = buildCanonicalCompositionPlayerKeys(players);
    expect(canonicalKey(players[0])).toBe("123456");
    expect(canonicalKey(players[1])).toBe("123456");
  });
});

describe("compareMatchesByJourneeThenDate", () => {
  it("trie par numéro de journée", () => {
    const m1 = { journee: 2, date: new Date("2026-03-01") } as Match;
    const m2 = { journee: 1, date: new Date("2026-04-01") } as Match;
    expect(compareMatchesByJourneeThenDate(m1, m2)).toBeGreaterThan(0);
  });
});
