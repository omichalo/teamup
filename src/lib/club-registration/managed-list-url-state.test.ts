import {
  buildManagedListQueryString,
  managedListQueryStringsEqual,
  managedListUrlStatesEqual,
  parseManagedListUrlState,
} from "./managed-list-url-state";

describe("managed-list-url-state", () => {
  it("parses saved view params", () => {
    const params = new URLSearchParams("vue=to_review&id=reg-1");
    expect(parseManagedListUrlState(params)).toEqual({
      statusFilter: "actionable",
      medicalCertificateFilter: "all",
      ppsFollowUpFilter: "all",
      aidReceiptFilter: "all",
      selectedId: "reg-1",
    });
  });

  it("parses pps filter", () => {
    const params = new URLSearchParams("status=all&pps=expected");
    expect(parseManagedListUrlState(params)).toEqual({
      statusFilter: "all",
      medicalCertificateFilter: "all",
      ppsFollowUpFilter: "expected",
      aidReceiptFilter: "all",
      selectedId: null,
    });
  });

  it("parses pending aid receipt saved view", () => {
    expect(parseManagedListUrlState(new URLSearchParams("vue=pending_aid_receipt"))).toEqual({
      statusFilter: "all",
      medicalCertificateFilter: "all",
      ppsFollowUpFilter: "all",
      aidReceiptFilter: "pending",
      selectedId: null,
    });
  });

  it("builds canonical vue param when filters match a saved view", () => {
    expect(
      buildManagedListQueryString({
        statusFilter: "actionable",
        medicalCertificateFilter: "all",
        ppsFollowUpFilter: "all",
        aidReceiptFilter: "all",
        selectedId: "reg-1",
      })
    ).toBe("vue=to_review&id=reg-1");
  });

  it("builds pending aid receipt view param", () => {
    expect(
      buildManagedListQueryString({
        statusFilter: "all",
        medicalCertificateFilter: "all",
        ppsFollowUpFilter: "all",
        aidReceiptFilter: "pending",
        selectedId: null,
      })
    ).toBe("vue=pending_aid_receipt");
  });

  it("keeps pps filter alongside saved view", () => {
    expect(
      buildManagedListQueryString({
        statusFilter: "actionable",
        medicalCertificateFilter: "all",
        ppsFollowUpFilter: "ok",
        aidReceiptFilter: "all",
        selectedId: null,
      })
    ).toBe("vue=to_review&pps=ok");
  });

  it("compares query strings regardless of param order", () => {
    expect(
      managedListQueryStringsEqual("vue=to_review&id=reg-1", "id=reg-1&vue=to_review")
    ).toBe(true);
  });

  it("treats saved view and explicit status filters as equivalent", () => {
    expect(
      managedListUrlStatesEqual(
        {
          statusFilter: "actionable",
          medicalCertificateFilter: "all",
          ppsFollowUpFilter: "all",
          aidReceiptFilter: "all",
          selectedId: "reg-1",
        },
        parseManagedListUrlState(new URLSearchParams("status=actionable&id=reg-1"))
      )
    ).toBe(true);
  });
});
