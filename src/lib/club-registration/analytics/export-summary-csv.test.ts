import { buildAnalyticsExportFilename, buildAnalyticsSummaryCsv } from "./export-summary-csv";
import type { RegistrationAnalyticsSummary } from "./types";

const summary: RegistrationAnalyticsSummary = {
  total: 2,
  sex: { female: 1, male: 1 },
  ageBrackets: {},
  ffttCategory: {},
  mainSection: { guyancourt: 2 },
  city: { top: [{ label: "Guyancourt", count: 2 }], other: 0, unknown: 0 },
  postalCode: { top: [], other: 0, unknown: 0 },
  wasSqyMemberLastYear: { new: 1, renewal: 1 },
  handisport: { no: 2 },
  competitor: { yes: 1, no: 1 },
  paymentAids: { none: 2 },
  additionalSections: {},
  isMinor: { minor: 1, adult: 1 },
  status: { approved: 2 },
};

describe("buildAnalyticsSummaryCsv", () => {
  it("exporte un CSV agrégé sans PII", () => {
    const csv = buildAnalyticsSummaryCsv(summary, { guyancourt: "Guyancourt" }, "2025-2026");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("metric;key;label;count");
    expect(csv).toContain("status;approved;Validé sans paiement;2");
    expect(csv).toContain("sex;female;Femme;1");
    expect(csv).not.toContain("@");
  });
});

describe("buildAnalyticsExportFilename", () => {
  it("inclut la saison et la date", () => {
    const name = buildAnalyticsExportFilename("2025-2026", new Date("2026-09-06T12:00:00.000Z"));
    expect(name).toBe("statistiques-adherents-2025-2026-2026-09-06.csv");
  });
});
