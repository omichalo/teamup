import {
  aggregateRegistrationAnalytics,
  filterAnalyticsRecords,
  matchesAnalyticsFilters,
} from "./aggregate";
import type { AnalyticsRegistrationRecord } from "./types";

const baseRecord = (overrides: Partial<AnalyticsRegistrationRecord> = {}): AnalyticsRegistrationRecord => ({
  sex: "female",
  birthDate: "2010-05-15",
  ffttCategorie: "Minime",
  mainSectionId: "guyancourt",
  additionalSectionIds: [],
  city: "guyancourt",
  postalCode: "78280",
  status: "approved",
  wasSqyMemberLastYear: true,
  wantsCompetitorExtras: false,
  paymentAidTypes: [],
  isMinor: true,
  ...overrides,
});

describe("matchesAnalyticsFilters", () => {
  it("filtre par statut", () => {
    const record = baseRecord({ status: "submitted" });
    expect(matchesAnalyticsFilters(record, { status: "approved" })).toBe(false);
    expect(matchesAnalyticsFilters(record, { status: "all" })).toBe(true);
  });

  it("filtre par section et sexe", () => {
    const record = baseRecord({ mainSectionId: "trappes", sex: "male" });
    expect(
      matchesAnalyticsFilters(record, { status: "all", mainSectionId: "trappes", sex: "male" })
    ).toBe(true);
    expect(matchesAnalyticsFilters(record, { status: "all", mainSectionId: "guyancourt" })).toBe(
      false
    );
  });
});

describe("aggregateRegistrationAnalytics", () => {
  it("agrège sexe, renouvellement et sections", () => {
    const records = [
      baseRecord(),
      baseRecord({ sex: "male", wasSqyMemberLastYear: false, mainSectionId: "trappes" }),
      baseRecord({ sex: "other", wasSqyMemberLastYear: undefined, additionalSectionIds: ["voisins"] }),
    ];

    const summary = aggregateRegistrationAnalytics(records, "2025-2026");

    expect(summary.total).toBe(3);
    expect(summary.sex.female).toBe(1);
    expect(summary.sex.male).toBe(1);
    expect(summary.sex.other).toBe(1);
    expect(summary.wasSqyMemberLastYear.renewal).toBe(1);
    expect(summary.wasSqyMemberLastYear.new).toBe(1);
    expect(summary.wasSqyMemberLastYear.unknown).toBe(1);
    expect(summary.additionalSections.voisins).toBe(1);
  });

  it("normalise les villes et regroupe le top", () => {
    const records = [
      baseRecord({ city: "GUYANCOURT" }),
      baseRecord({ city: "guyancourt" }),
      baseRecord({ city: "Trappes", postalCode: "78190" }),
    ];
    const summary = aggregateRegistrationAnalytics(records, "2025-2026");
    expect(summary.city.top[0]).toEqual({ label: "Guyancourt", count: 2 });
    expect(summary.postalCode.top.some((item) => item.label === "78190")).toBe(true);
  });
});

describe("filterAnalyticsRecords", () => {
  it("compose les filtres", () => {
    const records = [
      baseRecord({ status: "approved", wasSqyMemberLastYear: true }),
      baseRecord({ status: "approved", wasSqyMemberLastYear: false }),
    ];
    const filtered = filterAnalyticsRecords(records, {
      status: "approved",
      wasSqyMemberLastYear: "renewal",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.wasSqyMemberLastYear).toBe(true);
  });
});
