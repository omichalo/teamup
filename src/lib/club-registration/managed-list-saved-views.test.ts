import {
  getManagedListPipelineTabs,
  getManagedListFiltersForSavedView,
  inferManagedListQueueViewId,
  resolveManagedListQueueViewFromFilters,
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

  it("does not highlight a work queue for the certificate-only saved view", () => {
    expect(
      resolveManagedListQueueViewFromFilters("actionable", "required_not_received")
    ).toBeNull();
    expect(resolveManagedListQueueViewFromFilters("actionable", "all")).toBe("to_review");
    expect(resolveManagedListQueueViewFromFilters("payment_requested", "all")).toBe(
      "payment_pending"
    );
  });

  it("keeps À traiter when a pipeline stage is selected inside that queue", () => {
    expect(
      inferManagedListQueueViewId({
        vue: "to_review",
        statusFilter: "submitted",
        aidReceiptFilter: "all",
      })
    ).toBe("to_review");
    expect(
      inferManagedListQueueViewId({
        vue: "to_review",
        statusFilter: "payment_requested",
        aidReceiptFilter: "all",
      })
    ).toBe("to_review");
  });

  it("exposes pipeline tabs that refine a queue instead of copying it", () => {
    expect(getManagedListPipelineTabs("to_review").map((tab) => tab.value)).toEqual([
      "submitted",
      "in_review",
      "payment_requested",
    ]);
    expect(getManagedListPipelineTabs("payment_pending")).toEqual([]);
    expect(getManagedListPipelineTabs("all").map((tab) => tab.value)).toEqual([
      "submitted",
      "in_review",
      "payment_requested",
      "paid",
      "approved",
      "rejected",
    ]);
    expect(getManagedListPipelineTabs("pending_aid_receipt")).toEqual(
      getManagedListPipelineTabs("all")
    );
  });
});
