import { buildCrossTab } from "./cross-tab";
import type { AnalyticsRegistrationRecord } from "./types";

const records: AnalyticsRegistrationRecord[] = [
  {
    sex: "female",
    birthDate: "2010-01-01",
    mainSectionId: "guyancourt",
    status: "approved",
    wasSqyMemberLastYear: true,
  },
  {
    sex: "male",
    birthDate: "2010-06-01",
    mainSectionId: "guyancourt",
    status: "approved",
    wasSqyMemberLastYear: false,
  },
  {
    sex: "female",
    birthDate: "2000-01-01",
    mainSectionId: "trappes",
    status: "approved",
    wasSqyMemberLastYear: true,
  },
];

describe("buildCrossTab", () => {
  it("construit une matrice sexe × section", () => {
    const result = buildCrossTab(records, "sex", "mainSection", "2025-2026", {
      guyancourt: "Guyancourt",
      trappes: "Trappes",
    });

    expect(result.rowLabels.length).toBeGreaterThan(0);
    expect(result.colLabels).toContain("Guyancourt");
    expect(result.counts.flat().reduce((sum, n) => sum + n, 0)).toBe(3);
  });
});
