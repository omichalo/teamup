import {
  ALREADY_FINALIZED_NO_LINK_MESSAGE,
  ALREADY_PAID_RESEND_ERROR,
  VALIDATED_ALREADY_PAID_MESSAGE,
  buildPaidDossierValidationPatch,
  isRegistrationPaymentSettled,
  resolveSettledRequestPaymentAction,
} from "./resolve-settled-request-payment";
import type { RegistrationPayment } from "./payment/types";

const paidPayment = (
  overrides: Partial<RegistrationPayment> = {}
): RegistrationPayment => ({
  totalAmountCents: 20_000,
  assistanceTotalAmountCents: 5_000,
  amountToPayCents: 15_000,
  aids: [],
  paymentMethod: "cheque",
  paymentInstallments: 1,
  expectedPayments: [],
  receivedPayments: [
    {
      id: "rp-1",
      method: "cheque",
      label: "Chèque",
      amountCents: 15_000,
      receivedAt: "2026-08-17T10:00:00.000Z",
    },
  ],
  paidAmountCents: 15_000,
  remainingAmountCents: 0,
  paymentStatus: "paid",
  ...overrides,
});

describe("isRegistrationPaymentSettled", () => {
  it("détecte un paiement enregistré même si le dossier n'est pas encore payé", () => {
    expect(
      isRegistrationPaymentSettled(
        { status: "in_review", paymentStatus: "paid" },
        paidPayment()
      )
    ).toBe(true);
  });

  it("détecte un solde soldé via l'objet payment imbriqué", () => {
    expect(
      isRegistrationPaymentSettled({ status: "submitted", paymentStatus: "pending" }, paidPayment())
    ).toBe(true);
  });

  it("détecte une remise qui solde le dossier sans encaissement", () => {
    expect(
      isRegistrationPaymentSettled(
        { status: "in_review", paymentStatus: "paid" },
        paidPayment({
          assistanceTotalAmountCents: 20_000,
          amountToPayCents: 0,
          receivedPayments: [],
          paidAmountCents: 0,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        })
      )
    ).toBe(true);
  });

  it("laisse ouverts les dossiers encore dus", () => {
    expect(
      isRegistrationPaymentSettled(
        { status: "in_review", paymentStatus: "pending" },
        paidPayment({
          paidAmountCents: 5_000,
          remainingAmountCents: 10_000,
          paymentStatus: "partially_paid",
        })
      )
    ).toBe(false);
  });

  it("ne considère pas soldé un dossier payé avec reliquat", () => {
    expect(
      isRegistrationPaymentSettled(
        { status: "paid", paymentStatus: "pending", paidAt: "2026-08-20T10:00:00.000Z" },
        paidPayment({
          paidAmountCents: 23_900,
          remainingAmountCents: 3_500,
          paymentStatus: "partially_paid",
        })
      )
    ).toBe(false);
  });
});

describe("resolveSettledRequestPaymentAction", () => {
  it("finalise un dossier encore ouvert", () => {
    expect(resolveSettledRequestPaymentAction("in_review")).toEqual({
      kind: "finalize_paid",
      message: VALIDATED_ALREADY_PAID_MESSAGE,
    });
    expect(resolveSettledRequestPaymentAction("submitted")).toEqual({
      kind: "finalize_paid",
      message: VALIDATED_ALREADY_PAID_MESSAGE,
    });
    expect(resolveSettledRequestPaymentAction("payment_requested")).toEqual({
      kind: "finalize_paid",
      message: VALIDATED_ALREADY_PAID_MESSAGE,
    });
  });

  it("reste idempotent si le dossier est déjà clos", () => {
    expect(resolveSettledRequestPaymentAction("paid")).toEqual({
      kind: "already_finalized",
      message: ALREADY_FINALIZED_NO_LINK_MESSAGE,
    });
    expect(resolveSettledRequestPaymentAction("approved")).toEqual({
      kind: "already_finalized",
      message: ALREADY_FINALIZED_NO_LINK_MESSAGE,
    });
  });

  it("refuse de valider un dossier rejeté", () => {
    expect(resolveSettledRequestPaymentAction("rejected")).toEqual({
      kind: "reject",
      error: ALREADY_PAID_RESEND_ERROR,
    });
  });
});

describe("buildPaidDossierValidationPatch", () => {
  it("passe le dossier en payé en conservant le suivi de paiement", () => {
    const payment = paidPayment();
    expect(buildPaidDossierValidationPatch(payment)).toMatchObject({
      status: "paid",
      paymentStatus: "paid",
      payment,
    });
  });
});
