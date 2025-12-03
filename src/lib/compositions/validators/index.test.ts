import {
  calculateFutureBurnout,
  calculateFutureBurnoutParis,
  extractTeamNumber,
  getParisTeamStructure,
  isMatchPlayed,
} from "./index";

import type { Match } from "@/types";

describe("compositions validators", () => {
  it("detects played matches using score and players", () => {
    const played: Match = {
      id: "m1",
      phase: "aller",
      journee: 1,
      score: "3-1",
      result: "VICTOIRE",
      joueursSQY: [],
    };

    const notPlayed: Match = {
      id: "m2",
      phase: "aller",
      journee: 2,
      score: "0-0",
      result: "À VENIR",
      joueursSQY: [],
    };

    expect(isMatchPlayed(played)).toBe(true);
    expect(isMatchPlayed(notPlayed)).toBe(false);
  });

  it("extracts team numbers from multiple formats", () => {
    expect(extractTeamNumber("SQY PING (3) - Phase 1")).toBe(3);
    expect(extractTeamNumber("SQY PING 7")).toBe(7);
    expect(extractTeamNumber("No number here")).toBe(0);
  });

  it("computes future burnout for classic championship", () => {
    const futureBurn = calculateFutureBurnout({ 1: 1, 3: 1 }, 2, "masculin");
    expect(futureBurn).toBe(2);
  });

  it("computes future burnout with Paris rules", () => {
    const futureBurn = calculateFutureBurnoutParis({ 1: 3, 3: 1 }, 4, "masculin");
    expect(futureBurn).toBe(4);
  });

  it("identifies Paris team structures", () => {
    expect(getParisTeamStructure("Excellence")).toEqual({
      groups: 3,
      playersPerGroup: 3,
      totalPlayers: 9,
    });
    expect(getParisTeamStructure("1ere Division")).toEqual({
      groups: 2,
      playersPerGroup: 3,
      totalPlayers: 6,
    });
    expect(getParisTeamStructure("2eme Division")).toEqual({
      groups: 1,
      playersPerGroup: 3,
      totalPlayers: 3,
    });
    expect(getParisTeamStructure("Autre")).toBeNull();
  });
});
