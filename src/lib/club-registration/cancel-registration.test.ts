import {
  ACTIVE_RECEIPTS_CANCEL_ERROR,
  ALREADY_CANCELLED_ERROR,
} from "./cancel-registration";
import {
  coerceRegistrationStatus,
  resolveManagedListStatusFilter,
  REGISTRATION_STATUS_VALUES,
  REGISTRATION_STATUS_LABELS,
  registrationStatusLabel,
} from "./registration-status";

describe("registration cancellation status model", () => {
  it("expose cancelled et plus rejected", () => {
    expect(REGISTRATION_STATUS_VALUES).toContain("cancelled");
    expect(REGISTRATION_STATUS_VALUES).not.toContain("rejected");
    expect(REGISTRATION_STATUS_LABELS.cancelled).toBe("Annulé");
  });

  it("mappe l'ancien filtre rejected vers cancelled", () => {
    expect(resolveManagedListStatusFilter("rejected")).toBe("cancelled");
    expect(resolveManagedListStatusFilter("cancelled")).toBe("cancelled");
  });

  it("coerceRegistrationStatus normalise le legacy rejected", () => {
    expect(coerceRegistrationStatus("rejected")).toBe("cancelled");
    expect(registrationStatusLabel("rejected")).toBe("Annulé");
  });

  it("expose les messages d'erreur métier", () => {
    expect(ACTIVE_RECEIPTS_CANCEL_ERROR).toMatch(/encaissements/i);
    expect(ALREADY_CANCELLED_ERROR).toMatch(/déjà annulé/i);
  });
});
