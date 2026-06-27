import { describe, expect, it } from "@jest/globals";
import type { RegistrationSummary } from "./types";
import {
  getQueueMetrics,
  pickAdjacentRegistrationId,
  resolveSelectionAfterQueueReload,
} from "./queue-navigation";

const list: RegistrationSummary[] = [
  { id: "a", firstName: "Alice" },
  { id: "b", firstName: "Bob" },
  { id: "c", firstName: "Claire" },
];

describe("queue navigation", () => {
  it("calcule position et restants", () => {
    expect(getQueueMetrics(list, "b")).toEqual({
      position: 2,
      total: 3,
      remaining: 1,
      selectedIndex: 1,
    });
  });

  it("avance au dossier suivant après action always", () => {
    expect(resolveSelectionAfterQueueReload("a", 0, list, "always")).toBe("b");
  });

  it("reste sur le dossier si toujours présent en mode if_removed", () => {
    expect(resolveSelectionAfterQueueReload("b", 1, list, "if_removed")).toBe("b");
  });

  it("sélectionne le voisin suivant", () => {
    expect(pickAdjacentRegistrationId("a", list, "next")).toBe("b");
    expect(pickAdjacentRegistrationId("c", list, "previous")).toBe("b");
  });
});
