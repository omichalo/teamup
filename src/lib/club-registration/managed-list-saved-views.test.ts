import {
  getManagedListFiltersForSavedView,
  resolveManagedListSavedViewFromFilters,
} from "./managed-list-saved-views";

describe("managed-list-saved-views", () => {
  it("maps saved views to managed list filters", () => {
    expect(getManagedListFiltersForSavedView("to_review")).toEqual({
      statusFilter: "actionable",
      medicalCertificateFilter: "all",
      aidReceiptFilter: "all",
    });
    expect(getManagedListFiltersForSavedView("missing_certificate")).toEqual({
      statusFilter: "actionable",
      medicalCertificateFilter: "required_not_received",
      aidReceiptFilter: "all",
    });
    expect(getManagedListFiltersForSavedView("pending_aid_receipt")).toEqual({
      statusFilter: "all",
      medicalCertificateFilter: "all",
      aidReceiptFilter: "pending",
    });
  });

  it("resolves active view from current filters", () => {
    expect(
      resolveManagedListSavedViewFromFilters("actionable", "required_not_received")
    ).toBe("missing_certificate");
    expect(resolveManagedListSavedViewFromFilters("payment_requested", "all")).toBe(
      "payment_pending"
    );
    expect(resolveManagedListSavedViewFromFilters("all", "all")).toBe("all");
    expect(resolveManagedListSavedViewFromFilters("all", "all", "pending")).toBe(
      "pending_aid_receipt"
    );
  });
});
