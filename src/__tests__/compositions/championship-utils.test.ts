import { getPlayersByType, getTeamsByType } from "@/lib/compositions/championship-utils";
import type { EquipeWithMatches } from "@/hooks/useTeamData";
import type { Player } from "@/types/team-management";

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: "p1",
  name: "Doe",
  firstName: "John",
  license: "123",
  typeLicence: "T",
  gender: "M",
  nationality: "FR",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  preferredTeams: { masculine: [], feminine: [] },
  participation: {},
  ...overrides,
});

const createEquipe = (
  id: string,
  matches: Array<Partial<EquipeWithMatches["matches"][number]>>
): EquipeWithMatches => ({
  team: {
    id,
    name: `Team ${id}`,
    division: "D1",
    gender: "M",
    level: 1,
    isActive: true,
  },
  matches: matches.map((match, index) => ({
    id: `m-${id}-${index}`,
    opponent: "",
    phase: "aller",
    score: "0-0",
    journee: 1,
    result: "",
    ...match,
  })),
});

describe("championship-utils", () => {
  describe("getTeamsByType", () => {
    it("should split teams between masculine and feminine based on matches", () => {
      const equipes: EquipeWithMatches[] = [
        createEquipe("1", [{ isFemale: true }]),
        createEquipe("2", [{ isFemale: false }]),
        createEquipe("3", [{ isFemale: true }]),
      ];

      const result = getTeamsByType(equipes);

      expect(result.feminin.map((team) => team.team.id)).toEqual(["1", "3"]);
      expect(result.masculin.map((team) => team.team.id)).toEqual(["2"]);
    });
  });

  describe("getPlayersByType", () => {
    it("should return all players for masculine championship", () => {
      const players = [createPlayer({ id: "p1" }), createPlayer({ id: "p2", gender: "F" })];

      const result = getPlayersByType(players, "masculin");

      expect(result).toHaveLength(2);
    });

    it("should only return female players for feminine championship", () => {
      const players = [
        createPlayer({ id: "p1", gender: "M" }),
        createPlayer({ id: "p2", gender: "F" }),
        createPlayer({ id: "p3", gender: "F" }),
      ];

      const result = getPlayersByType(players, "feminin");

      expect(result.map((player) => player.id)).toEqual(["p2", "p3"]);
    });
  });
});
