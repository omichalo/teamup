import {
  isSeasonLabel,
  seasonLabelFromDate,
  seasonStartDate,
} from "./calendar-season-label";

describe("seasonLabelFromDate", () => {
  it("classe septembre–décembre dans la saison qui démarre", () => {
    expect(seasonLabelFromDate(new Date(2026, 8, 1))).toBe("2026-2027");
    expect(seasonLabelFromDate(new Date(2026, 10, 14))).toBe("2026-2027");
    expect(seasonLabelFromDate(new Date(2026, 11, 31))).toBe("2026-2027");
  });

  it("classe janvier–août dans la saison précédente", () => {
    expect(seasonLabelFromDate(new Date(2027, 0, 1))).toBe("2026-2027");
    expect(seasonLabelFromDate(new Date(2027, 7, 31))).toBe("2026-2027");
    expect(seasonLabelFromDate(new Date(2026, 7, 31))).toBe("2025-2026");
  });
});

describe("isSeasonLabel", () => {
  it("accepte YYYY-YYYY+1", () => {
    expect(isSeasonLabel("2026-2027")).toBe(true);
    expect(isSeasonLabel("2025-2026")).toBe(true);
  });

  it("rejette les formats invalides", () => {
    expect(isSeasonLabel("2026-2028")).toBe(false);
    expect(isSeasonLabel("aller")).toBe(false);
    expect(isSeasonLabel("")).toBe(false);
  });
});

describe("seasonStartDate", () => {
  it("retourne le 1er septembre UTC", () => {
    const d = seasonStartDate("2026-2027");
    expect(d.toISOString().startsWith("2026-09-01")).toBe(true);
  });
});
