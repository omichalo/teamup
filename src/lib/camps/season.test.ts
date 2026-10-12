import { seasonLabelFromYmd } from "./season";

describe("seasonLabelFromYmd", () => {
  it("place septembre–décembre dans la saison qui démarre", () => {
    expect(seasonLabelFromYmd("2026-09-01")).toBe("2026-2027");
    expect(seasonLabelFromYmd("2026-10-19")).toBe("2026-2027");
    expect(seasonLabelFromYmd("2026-12-31")).toBe("2026-2027");
  });

  it("place janvier–août dans la saison en cours", () => {
    expect(seasonLabelFromYmd("2027-01-01")).toBe("2026-2027");
    expect(seasonLabelFromYmd("2027-02-15")).toBe("2026-2027");
    expect(seasonLabelFromYmd("2027-08-31")).toBe("2026-2027");
  });
});
