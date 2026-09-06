import {
  buildCampaignBarometer,
  buildNewcomerCityInsights,
} from "./campaign-insights";
import type { AnalyticsRegistrationRecord, RegistrationAnalyticsSummary } from "./types";

function emptySummary(overrides: Partial<RegistrationAnalyticsSummary> = {}): RegistrationAnalyticsSummary {
  return {
    total: 0,
    sex: {},
    ageBrackets: {},
    ffttCategory: {},
    mainSection: {},
    city: { top: [], other: 0, unknown: 0 },
    postalCode: { top: [], other: 0, unknown: 0 },
    wasSqyMemberLastYear: {},
    handisport: {},
    competitor: {},
    paymentAids: {},
    additionalSections: {},
    isMinor: {},
    status: {},
    ...overrides,
  };
}

describe("buildCampaignBarometer", () => {
  it("calcule dossiers clos (payés + à 0 €) et à traiter", () => {
    const barometer = buildCampaignBarometer(
      emptySummary({
        total: 10,
        status: {
          approved: 4,
          paid: 2,
          submitted: 2,
          in_review: 1,
          payment_requested: 1,
        },
      })
    );

    expect(barometer.approved).toBe(4);
    expect(barometer.paid).toBe(2);
    expect(barometer.settled).toBe(6);
    expect(barometer.actionable).toBe(4);
    expect(barometer.approvedPct).toBe(40);
    expect(barometer.paidPct).toBe(20);
    expect(barometer.settledPct).toBe(60);
    expect(barometer.actionablePct).toBe(40);
  });
});

describe("buildNewcomerCityInsights", () => {
  it("classe les villes des nouveaux adhérents", () => {
    const records: AnalyticsRegistrationRecord[] = [
      { city: "Trappes", wasSqyMemberLastYear: false },
      { city: "trappes", wasSqyMemberLastYear: false },
      { city: "Guyancourt", wasSqyMemberLastYear: false },
      { city: "Trappes", wasSqyMemberLastYear: true },
    ];

    expect(buildNewcomerCityInsights(records)).toEqual([
      { city: "Trappes", count: 2 },
      { city: "Guyancourt", count: 1 },
    ]);
  });
});
