import {
  isMesInscriptionFullyPaid,
  resolveMesInscriptionStatusPresentation,
} from "./mes-inscription-supplement-display";

describe("mes-inscription-supplement-display", () => {
  it("affiche le statut complément quand un reliquat existe", () => {
    const presentation = resolveMesInscriptionStatusPresentation(
      {
        status: "paid",
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
      },
      { paid: "Paiement reçu" },
      { paid: "success" }
    );

    expect(presentation.supplementDue).toBe(true);
    expect(presentation.label).toBe("Complément à régler");
    expect(presentation.payableLabel).toBe("35,00 €");
  });

  it("considère non soldé un dossier payé avec reliquat", () => {
    expect(
      isMesInscriptionFullyPaid({
        status: "paid",
        paymentStatus: "paid",
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
    ).toBe(false);
  });
});
