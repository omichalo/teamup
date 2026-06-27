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
      selectedId: "reg-1",
    });
  });

  it("builds canonical vue param when filters match a saved view", () => {
    expect(
      buildManagedListQueryString({
        statusFilter: "actionable",
        medicalCertificateFilter: "all",
        selectedId: "reg-1",
      })
    ).toBe("vue=to_review&id=reg-1");
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
          selectedId: "reg-1",
        },
        parseManagedListUrlState(new URLSearchParams("status=actionable&id=reg-1"))
      )
    ).toBe(true);
  });
});
