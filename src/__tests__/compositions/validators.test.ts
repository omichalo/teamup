import {
  calculateFutureBurnout,
  calculateFutureBurnoutParis,
  isMatchPlayed,
} from "@/lib/compositions/validators";
import type { Match } from "@/types";

describe("validators helpers", () => {
  describe("calculateFutureBurnout", () => {
    it("returns the future burned team when adding a second match", () => {
      expect(calculateFutureBurnout(undefined, 4, "masculin")).toBeNull();
      expect(calculateFutureBurnout({ 4: 1 }, 4, "masculin")).toBe(4);
    });

    it("returns the second team number when player becomes burned", () => {
      const result = calculateFutureBurnout({ 4: 1, 6: 1 }, 4, "masculin");
      expect(result).toBe(4);
    });
  });

  describe("calculateFutureBurnoutParis", () => {
    it("returns null when there are no prior matches", () => {
      expect(calculateFutureBurnoutParis(undefined, 5, "masculin")).toBeNull();
    });

    it("returns highest team number where player will be burned", () => {
      const result = calculateFutureBurnoutParis({ 3: 3, 5: 1 }, 5, "masculin");
      expect(result).toBe(5);
    });
  });

  describe("isMatchPlayed", () => {
    const baseMatch: Match = {
      id: "1",
      opponent: "",
      phase: "aller",
      score: "0-0",
      journee: 1,
      result: "À VENIR",
    };

    it("detects played matches from players list", () => {
      const match: Match = {
        ...baseMatch,
        joueursSQY: [{ licence: "123" }],
      };
      expect(isMatchPlayed(match)).toBe(true);
    });

    it("detects played matches from a valid score", () => {
      const match: Match = {
        ...baseMatch,
        score: "3-1",
        result: "Victoire",
      };
      expect(isMatchPlayed(match)).toBe(true);
    });

    it("returns false when score and players are missing", () => {
      expect(isMatchPlayed(baseMatch)).toBe(false);
    });
  });
});
