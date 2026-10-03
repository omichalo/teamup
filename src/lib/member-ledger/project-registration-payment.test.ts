import { projectRegistrationPaymentToLedger } from "./project-registration-payment";

describe("projectRegistrationPaymentToLedger", () => {
  it("projette devis + encaissements d'adhésion", () => {
    const view = projectRegistrationPaymentToLedger("reg-1", {
      seasonLabel: "2026-2027",
      status: "payment_requested",
      paymentStatus: "waiting_payment",
      teamupInvoiceNumber: "FAC-2026-2027-00001",
      pricingQuote: {
        catalogVersion: "v1",
        totalCents: 25000,
        lines: [
          { kind: "membership", label: "Cotisation adulte", amountCents: 25000 },
        ],
      },
      payment: {
        totalAmountCents: 25000,
        assistanceTotalAmountCents: 0,
        amountToPayCents: 25000,
        aids: [],
        paymentMethod: "card",
        paymentInstallments: 1,
        expectedPayments: [],
        receivedPayments: [
          {
            id: "rcv-1",
            method: "card",
            label: "Paiement Stripe",
            amountCents: 10000,
            receivedAt: "2026-09-01T10:00:00.000Z",
          },
        ],
        paidAmountCents: 10000,
        remainingAmountCents: 15000,
        paymentStatus: "partially_paid",
      },
    });

    expect(view.party.registrationId).toBe("reg-1");
    expect(view.party.seasonLabel).toBe("2026-2027");
    expect(view.party.memberAccountId).toBeNull();
    expect(view.charges).toHaveLength(1);
    expect(view.charges[0]?.kind).toBe("membership");
    expect(view.charges[0]?.documentNumber).toBe("FAC-2026-2027-00001");
    expect(view.charges[0]?.status).toBe("partially_paid");
    expect(view.payments).toHaveLength(1);
    expect(view.totals.invoicedCents).toBe(25000);
    expect(view.totals.receivedCents).toBe(10000);
    expect(view.totals.balanceCents).toBe(15000);
  });

  it("ignore les encaissements annulés dans les totaux", () => {
    const view = projectRegistrationPaymentToLedger("reg-2", {
      seasonLabel: "2026-2027",
      status: "paid",
      paymentStatus: "paid",
      pricingQuote: {
        catalogVersion: "v1",
        totalCents: 10000,
        lines: [{ kind: "membership", label: "Cotisation", amountCents: 10000 }],
      },
      payment: {
        totalAmountCents: 10000,
        assistanceTotalAmountCents: 0,
        amountToPayCents: 10000,
        aids: [],
        paymentMethod: "cheque",
        paymentInstallments: 1,
        expectedPayments: [],
        receivedPayments: [
          {
            id: "rcv-void",
            method: "cheque",
            label: "Chèque",
            amountCents: 10000,
            receivedAt: "2026-09-01T10:00:00.000Z",
            reversedAt: "2026-09-02T10:00:00.000Z",
          },
          {
            id: "rcv-ok",
            method: "cash",
            label: "Espèces",
            amountCents: 10000,
            receivedAt: "2026-09-03T10:00:00.000Z",
          },
        ],
        paidAmountCents: 10000,
        remainingAmountCents: 0,
        paymentStatus: "paid",
      },
    });

    expect(view.payments).toHaveLength(2);
    expect(view.totals.receivedCents).toBe(10000);
    expect(view.totals.balanceCents).toBe(0);
  });

  it("projette les aides reçues comme encaissements AID", () => {
    const view = projectRegistrationPaymentToLedger("reg-4", {
      seasonLabel: "2026-2027",
      status: "payment_requested",
      paymentStatus: "partially_paid",
      teamupInvoiceNumber: "FAC-2026-2027-00002",
      pricingQuote: {
        catalogVersion: "v1",
        totalCents: 25000,
        lines: [{ kind: "membership", label: "Cotisation", amountCents: 25000 }],
      },
      payment: {
        totalAmountCents: 25000,
        assistanceTotalAmountCents: 7000,
        amountToPayCents: 18000,
        aids: [
          {
            type: "pass_sport",
            label: "Pass Sport",
            amountCents: 7000,
            received: true,
            receivedAt: "2026-09-05T10:00:00.000Z",
            documentNumber: "AID-2026-2027-00001",
          },
        ],
        paymentMethod: "card",
        paymentInstallments: 1,
        expectedPayments: [],
        receivedPayments: [
          {
            id: "rcv-1",
            method: "card",
            label: "CB",
            amountCents: 18000,
            receivedAt: "2026-09-06T10:00:00.000Z",
            documentNumber: "REC-2026-2027-00002",
          },
        ],
        paidAmountCents: 18000,
        remainingAmountCents: 0,
        paymentStatus: "paid",
      },
    });

    expect(view.payments).toHaveLength(2);
    expect(view.payments.some((p) => p.method === "aid")).toBe(true);
    expect(view.totals.receivedCents).toBe(25000);
    expect(view.totals.balanceCents).toBe(0);
  });
});
