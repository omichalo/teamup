import {
  getManagedListFiltersForSavedView,
  resolveManagedListSavedViewFromFilters,
} from "./managed-list-saved-views";

describe("managed-list-saved-views", () => {
  it("maps saved views to managed list filters", () => {
    expect(getManagedListFiltersForSavedView("to_review")).toEqual({
      statusFilter: "actionable",
      medicalCertificateFilter: "all",
    });
    expect(getManagedListFiltersForSavedView("missing_certificate")).toEqual({
      statusFilter: "actionable",
      medicalCertificateFilter: "required_not_received",
    });
  });

  it("resolves active view from current filters", () => {
    expect(
      resolveManagedListSavedViewFromFilters("actionable", "required_not_received")
    ).toBe("missing_certificate");
    expect(resolveManagedListSavedViewFromFilters("payment_requested", "all")).toBe(
      "payment_pending"
    );
  });
});
