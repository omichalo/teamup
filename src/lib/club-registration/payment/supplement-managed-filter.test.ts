import {
  matchesPaymentSupplementFilter,
  summaryHasPaymentSupplementDue,
} from "./supplement-managed-filter";

describe("supplement-managed-filter", () => {
  it("détecte un complément dû sur un résumé", () => {
    expect(
      summaryHasPaymentSupplementDue({
        payment: {
          paymentMethod: "card",
          totalAmountCents: 27_400,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 27_400,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp_cb",
              method: "card",
              label: "Carte",
              amountCents: 23_900,
              receivedAt: "2026-08-20T10:00:00.000Z",
            },
          ],
          paidAmountCents: 23_900,
          remainingAmountCents: 3_500,
          paymentStatus: "partially_paid",
        },
      })
    ).toBe(true);
  });

  it("filtre les dossiers avec complément dû", () => {
    const summary = {
      payment: {
        paymentMethod: "card",
        totalAmountCents: 27_400,
        assistanceTotalAmountCents: 0,
        amountToPayCents: 27_400,
        aids: [],
        paymentInstallments: 1,
        expectedPayments: [],
        receivedPayments: [
          {
            id: "rp_cb",
            method: "card",
            label: "Carte",
            amountCents: 23_900,
            receivedAt: "2026-08-20T10:00:00.000Z",
          },
        ],
        paidAmountCents: 23_900,
        remainingAmountCents: 3_500,
        paymentStatus: "partially_paid",
      },
    };

    expect(matchesPaymentSupplementFilter(summary, "due")).toBe(true);
    expect(matchesPaymentSupplementFilter(summary, "all")).toBe(true);
    expect(matchesPaymentSupplementFilter({ paymentAmountCents: 1000 }, "due")).toBe(false);
  });
});
