import { createDragImage } from "@/lib/compositions/drag-utils";
import type { Player } from "@/types/team-management";

describe("createDragImage", () => {
  const basePlayer: Player = {
    id: "p1",
    name: "Doe",
    firstName: "Jane",
    license: "123",
    typeLicence: "T",
    gender: "F",
    nationality: "C",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    preferredTeams: { masculine: [], feminine: [] },
    participation: {},
    points: 850,
    highestFeminineTeamNumberByPhase: { aller: 3 },
  };

  it("renders drag preview with player name and badges", () => {
    const element = createDragImage(basePlayer, { championshipType: "feminin", phase: "aller" });

    expect(element.textContent).toContain("Jane Doe");
    expect(element.textContent).toContain("EUR");
    expect(element.textContent).toContain("Brûlé Éq. 3");
  });

  it("falls back to default labels when data is missing", () => {
    const element = createDragImage({ ...basePlayer, points: undefined, nationality: "FR", highestFeminineTeamNumberByPhase: {} });

    expect(element.textContent).toContain("Points non disponibles");
    expect(element.textContent).not.toContain("EUR");
    expect(element.textContent).not.toContain("Brûlé");
  });
});
