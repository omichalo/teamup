import {
  buildManagedListQueryString,
  managedListQueryStringsEqual,
  managedListUrlStatesEqual,
  parseManagedListUrlState,
  type ManagedListUrlState,
} from "./managed-list-url-state";
import { buildRegistrationManagerDetailUrl } from "./registration-manager-url";

const FOLLOW_UPS_ALL = {
  ppsFollowUpFilter: "all",
  criteriumFederalFilter: "all",
  jerseyFollowUpFilter: "all",
  registrationCertificateFollowUpFilter: "all",
} as const;

function listState(
  overrides: Partial<ManagedListUrlState> &
    Pick<ManagedListUrlState, "queueViewId" | "statusFilter" | "selectedId">
): ManagedListUrlState {
  return {
    medicalCertificateFilter: "all",
    aidReceiptFilter: "all",
    ...FOLLOW_UPS_ALL,
    ...overrides,
  };
}

describe("managed-list-url-state", () => {
  it("parses the secretary email deep link (?id= without vue)", () => {
    expect(parseManagedListUrlState(new URLSearchParams("id=reg_secretary"))).toEqual(
      listState({
        queueViewId: "to_review",
        statusFilter: "actionable",
        selectedId: "reg_secretary",
      })
    );
  });

  it("parses the treat-queue deep link used by new emails", () => {
    expect(
      parseManagedListUrlState(new URLSearchParams("status=actionable&id=reg_secretary"))
    ).toEqual(
      listState({
        queueViewId: "to_review",
        statusFilter: "actionable",
        selectedId: "reg_secretary",
      })
    );
  });

  it("keeps the dossier id from the manager email URL", () => {
    const href = buildRegistrationManagerDetailUrl("https://app.example", "reg_mail");
    const query = href.split("?")[1] ?? "";
    expect(parseManagedListUrlState(new URLSearchParams(query)).selectedId).toBe("reg_mail");
  });

  it("parses saved view params", () => {
    expect(parseManagedListUrlState(new URLSearchParams("vue=to_review&id=reg-1"))).toEqual(
      listState({
        queueViewId: "to_review",
        statusFilter: "actionable",
        selectedId: "reg-1",
      })
    );
  });

  it("keeps the À traiter queue when refining to a pipeline stage", () => {
    expect(
      parseManagedListUrlState(new URLSearchParams("vue=to_review&status=submitted&id=reg-1"))
    ).toEqual(
      listState({
        queueViewId: "to_review",
        statusFilter: "submitted",
        selectedId: "reg-1",
      })
    );
  });

  it("parses pps filter", () => {
    expect(parseManagedListUrlState(new URLSearchParams("status=all&pps=expected"))).toEqual(
      listState({
        queueViewId: "all",
        statusFilter: "all",
        ppsFollowUpFilter: "expected",
        selectedId: null,
      })
    );
  });

  it("parses criterium federal filter", () => {
    expect(parseManagedListUrlState(new URLSearchParams("status=all&criterium=to_do"))).toEqual(
      listState({
        queueViewId: "all",
        statusFilter: "all",
        criteriumFederalFilter: "to_do",
        selectedId: null,
      })
    );
  });

  it("parses jersey follow-up filter", () => {
    expect(parseManagedListUrlState(new URLSearchParams("status=all&maillot=to_do"))).toEqual(
      listState({
        queueViewId: "all",
        statusFilter: "all",
        jerseyFollowUpFilter: "to_do",
        selectedId: null,
      })
    );
  });

  it("parses registration certificate follow-up filter", () => {
    expect(parseManagedListUrlState(new URLSearchParams("status=all&attestation=sent"))).toEqual(
      listState({
        queueViewId: "all",
        statusFilter: "all",
        registrationCertificateFollowUpFilter: "sent",
        selectedId: null,
      })
    );
  });

  it("parses pending aid receipt saved view", () => {
    expect(parseManagedListUrlState(new URLSearchParams("vue=pending_aid_receipt"))).toEqual(
      listState({
        queueViewId: "pending_aid_receipt",
        statusFilter: "all",
        aidReceiptFilter: "pending",
        selectedId: null,
      })
    );
  });

  it("builds canonical vue param when filters match a saved view", () => {
    expect(
      buildManagedListQueryString(
        listState({
          queueViewId: "to_review",
          statusFilter: "actionable",
          selectedId: "reg-1",
        })
      )
    ).toBe("vue=to_review&id=reg-1");
  });

  it("builds a pipeline refine without leaving the treat queue", () => {
    expect(
      buildManagedListQueryString(
        listState({
          queueViewId: "to_review",
          statusFilter: "submitted",
          selectedId: "reg-1",
        })
      )
    ).toBe("vue=to_review&status=submitted&id=reg-1");
  });

  it("builds pending aid receipt view param", () => {
    expect(
      buildManagedListQueryString(
        listState({
          queueViewId: "pending_aid_receipt",
          statusFilter: "all",
          aidReceiptFilter: "pending",
          selectedId: null,
        })
      )
    ).toBe("vue=pending_aid_receipt");
  });

  it("keeps pps filter alongside saved view", () => {
    expect(
      buildManagedListQueryString(
        listState({
          queueViewId: "to_review",
          statusFilter: "actionable",
          ppsFollowUpFilter: "ok",
          selectedId: null,
        })
      )
    ).toBe("vue=to_review&pps=ok");
  });

  it("keeps criterium filter alongside saved view", () => {
    expect(
      buildManagedListQueryString(
        listState({
          queueViewId: "to_review",
          statusFilter: "actionable",
          criteriumFederalFilter: "validated",
          selectedId: null,
        })
      )
    ).toBe("vue=to_review&criterium=validated");
  });

  it("keeps jersey filter alongside saved view", () => {
    expect(
      buildManagedListQueryString(
        listState({
          queueViewId: "to_review",
          statusFilter: "actionable",
          jerseyFollowUpFilter: "given",
          selectedId: null,
        })
      )
    ).toBe("vue=to_review&maillot=given");
  });

  it("keeps attestation filter alongside saved view", () => {
    expect(
      buildManagedListQueryString(
        listState({
          queueViewId: "to_review",
          statusFilter: "actionable",
          registrationCertificateFollowUpFilter: "to_do",
          selectedId: null,
        })
      )
    ).toBe("vue=to_review&attestation=to_do");
  });

  it("compares query strings regardless of param order", () => {
    expect(
      managedListQueryStringsEqual("vue=to_review&id=reg-1", "id=reg-1&vue=to_review")
    ).toBe(true);
  });

  it("treats saved view and explicit status filters as equivalent", () => {
    expect(
      managedListUrlStatesEqual(
        listState({
          queueViewId: "to_review",
          statusFilter: "actionable",
          selectedId: "reg-1",
        }),
        parseManagedListUrlState(new URLSearchParams("status=actionable&id=reg-1"))
      )
    ).toBe(true);
  });

  it("does not confuse Paiement demandé inside À traiter with the Paiement queue", () => {
    expect(
      managedListUrlStatesEqual(
        listState({
          queueViewId: "to_review",
          statusFilter: "payment_requested",
          selectedId: null,
        }),
        parseManagedListUrlState(new URLSearchParams("vue=payment_pending"))
      )
    ).toBe(false);
  });
});
