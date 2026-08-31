import {
  SECRETARIAT_INITIAL_PAYMENT_BUTTON,
  SECRETARIAT_REQUEST_SUPPLEMENT_BUTTON,
  SECRETARIAT_RESEND_PAYMENT_BUTTON,
  SECRETARIAT_VALIDATE_SETTLED_BUTTON,
  SECRETARIAT_VALIDATE_SETTLED_TOOLTIP,
} from "./bnpl-checkout-copy";
import { resolveSecretariatPaymentCta } from "./secretariat-payment-action";

describe("resolveSecretariatPaymentCta", () => {
  it("propose de valider sans lien si le paiement est déjà enregistré", () => {
    expect(
      resolveSecretariatPaymentCta({
        registrationStatus: "in_review",
        paymentSettled: true,
        paymentMethod: "card",
      })
    ).toEqual({
      visible: true,
      label: SECRETARIAT_VALIDATE_SETTLED_BUTTON,
      tooltip: SECRETARIAT_VALIDATE_SETTLED_TOOLTIP,
      kind: "validate_settled",
    });
  });

  it("masque l'action une fois le dossier clos sans reliquat", () => {
    expect(
      resolveSecretariatPaymentCta({
        registrationStatus: "paid",
        paymentSettled: true,
        paymentMethod: "card",
      })
    ).toEqual({ visible: false });
    expect(
      resolveSecretariatPaymentCta({
        registrationStatus: "approved",
        paymentSettled: true,
        paymentMethod: "cheque",
      })
    ).toEqual({ visible: false });
  });

  it("propose le complément CB après paiement initial", () => {
    expect(
      resolveSecretariatPaymentCta({
        registrationStatus: "paid",
        paymentSettled: false,
        paymentMethod: "card",
        remainingAmountCents: 3_500,
        paidAmountCents: 23_900,
      })
    ).toMatchObject({
      visible: true,
      label: SECRETARIAT_REQUEST_SUPPLEMENT_BUTTON,
      kind: "supplement",
    });
  });

  it("conserve la demande de paiement et le renvoi de lien", () => {
    expect(
      resolveSecretariatPaymentCta({
        registrationStatus: "submitted",
        paymentSettled: false,
        paymentMethod: "card",
      })
    ).toMatchObject({
      visible: true,
      label: SECRETARIAT_INITIAL_PAYMENT_BUTTON,
      kind: "request",
    });
    expect(
      resolveSecretariatPaymentCta({
        registrationStatus: "payment_requested",
        paymentSettled: false,
        paymentMethod: "card",
        remainingAmountCents: 23_900,
        paidAmountCents: 0,
      })
    ).toMatchObject({
      visible: true,
      label: SECRETARIAT_RESEND_PAYMENT_BUTTON,
      kind: "resend",
    });
  });
});
