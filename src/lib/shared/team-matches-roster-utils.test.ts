import type { MatchData } from "./team-matches-sync-types";
import { isLicenceListedInMatchRoster } from "./team-matches-roster-utils";

describe("isLicenceListedInMatchRoster", () => {
  const baseMatch: MatchData = {
    id: "m1",
    ffttId: "link",
    teamId: "1_retour",
    teamNumber: 5,
    opponent: "ADV",
    opponentClub: "ADV",
    date: new Date(),
    location: "home",
    isHome: true,
    isExempt: false,
    isForfeit: false,
    phase: "retour",
    journee: 3,
    isFemale: false,
    division: "div",
    epreuve: "epreuve",
    createdAt: new Date(),
    updatedAt: new Date(),
    resultatsIndividuels: {
      nomEquipeA: "SQY PING 5",
      nomEquipeB: "ADV 1",
      joueursA: {
        a: { nom: "BARGET", prenom: "Yannis" },
        b: { nom: "FERREIRA", prenom: "Joao Marques" },
        c: { nom: "FOUCHE", prenom: "Erwann" },
      },
      joueursB: {},
    },
    joueursSQY: [
      { id: "1", licence: "217409", nom: "", prenom: "", points: 1009, sexe: "M" },
    ],
  };

  it("rejette une licence fantôme absente de la feuille FFTT", () => {
    expect(isLicenceListedInMatchRoster(baseMatch, baseMatch.joueursSQY![0])).toBe(
      false
    );
  });

  it("accepte un joueur présent dans la feuille FFTT", () => {
    const match: MatchData = {
      ...baseMatch,
      teamNumber: 10,
      resultatsIndividuels: {
        nomEquipeA: "SQY PING 10",
        nomEquipeB: "ADV 1",
        joueursA: {
          a: { nom: "JACOBY", prenom: "Stephane" },
        },
        joueursB: {},
      },
      joueursSQY: [
        {
          id: "1",
          licence: "217409",
          nom: "JACOBY",
          prenom: "Stephane",
          points: 1009,
          sexe: "M",
        },
      ],
    };

    expect(isLicenceListedInMatchRoster(match, match.joueursSQY![0])).toBe(true);
  });
});
