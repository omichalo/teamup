import { matchesLicenseStatusFilter } from "@/lib/license-validation/license-validation-status";
import { normalizeLicenseValidationStatus } from "@/lib/license-validation/license-validation-status";
import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";
import {
  matchesPaymentStatusFilter,
  resolveLicenseValidationPaymentListFilter,
} from "@/lib/license-validation/payment-status-filter";

function item(
  overrides: Partial<LicenseValidationListItem> = {}
): LicenseValidationListItem {
  return {
    id: "reg_1",
    firstName: "Ada",
    lastName: "Lovelace",
    adherentEmail: "ada@example.com",
    birthDate: null,
    ffttLicense: null,
    licenseValidationStatus: "to_do",
    wantsCompetitorExtras: false,
    paymentStatus: null,
    status: "submitted",
    submittedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("matchesLicenseStatusFilter", () => {
  it("treats normalized missing status as to_do", () => {
    const legacy = item({
      licenseValidationStatus: normalizeLicenseValidationStatus(undefined),
    });
    expect(legacy.licenseValidationStatus).toBe("to_do");
    expect(matchesLicenseStatusFilter(legacy, "to_do")).toBe(true);
    expect(matchesLicenseStatusFilter(legacy, "done")).toBe(false);
    expect(matchesLicenseStatusFilter(legacy, "all")).toBe(true);
  });
});

describe("payment status list filter", () => {
  it("resolves compact payment filters and falls back to all", () => {
    expect(resolveLicenseValidationPaymentListFilter("paid")).toBe("paid");
    expect(resolveLicenseValidationPaymentListFilter("partially_paid")).toBe(
      "partially_paid"
    );
    expect(resolveLicenseValidationPaymentListFilter("unpaid")).toBe("unpaid");
    expect(resolveLicenseValidationPaymentListFilter("waiting_payment")).toBe(
      "all"
    );
    expect(resolveLicenseValidationPaymentListFilter("unknown")).toBe("all");
    expect(resolveLicenseValidationPaymentListFilter(null)).toBe("all");
  });

  it("keeps partially_paid separate from unpaid", () => {
    expect(matchesPaymentStatusFilter("paid", "paid")).toBe(true);
    expect(matchesPaymentStatusFilter("partially_paid", "partially_paid")).toBe(
      true
    );
    expect(matchesPaymentStatusFilter("partially_paid", "unpaid")).toBe(false);
    expect(matchesPaymentStatusFilter("partially_paid", "paid")).toBe(false);
    expect(matchesPaymentStatusFilter("waiting_payment", "unpaid")).toBe(true);
    expect(matchesPaymentStatusFilter("pending_validation", "unpaid")).toBe(true);
    expect(matchesPaymentStatusFilter("manual_follow_up", "unpaid")).toBe(true);
    expect(matchesPaymentStatusFilter("paid", "unpaid")).toBe(false);
    expect(matchesPaymentStatusFilter(null, "unpaid")).toBe(false);
    expect(matchesPaymentStatusFilter(null, "all")).toBe(true);
  });
});
