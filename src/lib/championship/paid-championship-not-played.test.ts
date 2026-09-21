import {
  isPaidChampionshipRegistration,
} from "./paid-championship-not-played";

describe("isPaidChampionshipRegistration", () => {
  it("accepts paid, approved, and payment proof fields", () => {
    expect(isPaidChampionshipRegistration({ status: "paid" })).toBe(true);
    expect(isPaidChampionshipRegistration({ status: "approved" })).toBe(true);
    expect(
      isPaidChampionshipRegistration({
        status: "payment_requested",
        paymentStatus: "paid",
      })
    ).toBe(true);
    expect(
      isPaidChampionshipRegistration({
        status: "in_review",
        paidAt: "2026-09-01T00:00:00.000Z",
      })
    ).toBe(true);
  });

  it("rejects unpaid or rejected dossiers", () => {
    expect(isPaidChampionshipRegistration({ status: "rejected" })).toBe(false);
    expect(
      isPaidChampionshipRegistration({ status: "payment_requested" })
    ).toBe(false);
    expect(isPaidChampionshipRegistration({ status: "submitted" })).toBe(false);
  });
});
