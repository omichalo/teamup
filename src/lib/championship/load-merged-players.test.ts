import { splitMergedPlayersByTab } from "./load-merged-players";
import type { Player } from "@/types/team-management";

function player(partial: Partial<Player> & Pick<Player, "id" | "name" | "firstName">): Player {
  return {
    license: partial.id,
    typeLicence: "",
    gender: "M",
    nationality: "FR",
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    preferredTeams: { masculine: [], feminine: [] },
    participation: {},
    ...partial,
  };
}

describe("splitMergedPlayersByTab", () => {
  it("drops leftover players licensed at another club", () => {
    const split = splitMergedPlayersByTab([
      player({
        id: "7859322",
        name: "LECHEMINANT",
        firstName: "Claude",
        listedInClub: false,
        nomClub: "CHESNAY 78 AS",
        championshipAlerts: ["other_club"],
      }),
      player({
        id: "5984668",
        name: "NEMACIUC",
        firstName: "Mihai",
        listedInClub: true,
        championshipAlerts: ["fftt_sqy_unlicensed"],
      }),
    ]);
    expect(split.withoutLicense.map((item) => item.id)).toEqual(["5984668"]);
    expect(split.active).toHaveLength(0);
    expect(split.temporary).toHaveLength(0);
  });
});
