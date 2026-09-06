import {
  aggregateFinanceAnalytics,
  aggregateOrganizationAnalytics,
  formatCentsEur,
} from "./aggregate-ops";
import type { AnalyticsRegistrationRecord } from "./types";

const base = (
  overrides: Partial<AnalyticsRegistrationRecord> = {}
): AnalyticsRegistrationRecord => ({
  status: "approved",
  slotIds: ["slot-a"],
  schoolPickupSlotIds: [],
  competitionIds: [],
  jerseyFollowUpStatus: "not_applicable",
  criteriumFederalRegistrationStatus: "not_applicable",
  registrationCertificateFollowUpStatus: "not_applicable",
  paymentAids: [],
  ...overrides,
});

describe("aggregateOrganizationAnalytics", () => {
  it("compte créneaux et files secrétariat", () => {
    const summary = aggregateOrganizationAnalytics([
      base({
        slotIds: ["s1", "s2"],
        schoolPickupSlotIds: ["s1"],
        competitionIds: ["crit"],
        jerseyFollowUpStatus: "to_do",
        criteriumFederalRegistrationStatus: "to_do",
        medicalFollowUpKind: "certificate_expected",
        paymentAids: [{ type: "pass_sport", amountCents: 7000, received: false, pendingReceipt: true }],
      }),
      base({
        slotIds: ["s1"],
        jerseyFollowUpStatus: "given",
        medicalFollowUpKind: "ok",
      }),
    ]);

    expect(summary.slots.s1).toBe(2);
    expect(summary.slots.s2).toBe(1);
    expect(summary.schoolPickupSlots.s1).toBe(1);
    expect(summary.competitions.crit).toBe(1);
    expect(summary.opsTodo.jersey).toBe(1);
    expect(summary.opsTodo.criterium).toBe(1);
    expect(summary.opsTodo.medical).toBe(1);
    expect(summary.opsTodo.aidsPending).toBe(1);
  });
});

describe("aggregateFinanceAnalytics", () => {
  it("somme devis, dons et aides", () => {
    const finance = aggregateFinanceAnalytics([
      base({
        quoteTotalCents: 25000,
        voluntaryDonationCents: 1000,
        paymentStatus: "paid",
        paymentMethod: "card",
        paymentAids: [
          { type: "pass_sport", amountCents: 7000, received: true, pendingReceipt: false },
          { type: "labaz", amountCents: 3000, received: false, pendingReceipt: true },
        ],
      }),
      base({
        quoteTotalCents: 15000,
        holidayVoucherAmountCents: 5000,
        paymentStatus: "waiting_payment",
        paymentMethod: "cheque",
      }),
    ]);

    expect(finance.quoteTotalCents).toBe(40000);
    expect(finance.donationCents).toBe(1000);
    expect(finance.holidayVoucherCents).toBe(5000);
    expect(finance.aidsDeclaredCents).toBe(10000);
    expect(finance.aidsReceivedCents).toBe(7000);
    expect(finance.aidsPendingCount).toBe(1);
    expect(finance.paymentStatus.paid).toBe(1);
    expect(finance.paymentMethod.card).toBe(1);
  });
});

describe("formatCentsEur", () => {
  it("formate en euros FR", () => {
    expect(formatCentsEur(12345)).toMatch(/123[,.]45/);
  });
});
