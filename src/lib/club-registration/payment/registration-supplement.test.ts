import {
  hasRegistrationOutstandingBalance,
  isRegistrationSupplementDue,
  resolveJerseyFollowUpForSupplement,
} from "./registration-supplement";

describe("registration-supplement", () => {
  it("détecte un reliquat ouvert", () => {
    expect(
      hasRegistrationOutstandingBalance({
        remainingAmountCents: 3_500,
        paymentStatus: "partially_paid",
      })
    ).toBe(true);
    expect(
      hasRegistrationOutstandingBalance({
        remainingAmountCents: 0,
        paymentStatus: "paid",
      })
    ).toBe(false);
  });

  it("détecte un complément après encaissement", () => {
    expect(
      isRegistrationSupplementDue({
        paidAmountCents: 23_900,
        remainingAmountCents: 3_500,
        paymentStatus: "partially_paid",
      })
    ).toBe(true);
    expect(
      isRegistrationSupplementDue({
        paidAmountCents: 0,
        remainingAmountCents: 23_900,
        paymentStatus: "waiting_payment",
      })
    ).toBe(false);
  });

  it("bascule le maillot en attente paiement quand un complément apparaît", () => {
    expect(
      resolveJerseyFollowUpForSupplement({
        wantsOptionalJersey: true,
        wantsCompetitorExtras: false,
        currentStatus: "to_do",
      })
    ).toBe("prepared_awaiting_payment");
  });

});
