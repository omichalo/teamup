import { validatePaymentDraft } from "./validate-payment-draft";

const baseDraft = {
  paymentMethod: "card" as const,
  paymentInstallments: 4,
  specialPaymentNote: "",
};

describe("validatePaymentDraft", () => {
  it("exige un mode de paiement", () => {
    const issue = validatePaymentDraft({ ...baseDraft, paymentMethod: "" });
    expect(issue?.message).toMatch(/mode de paiement/i);
  });

  it("exige une précision pour un cas particulier", () => {
    const issue = validatePaymentDraft({
      ...baseDraft,
      paymentMethod: "other",
      specialPaymentNote: "",
    });
    expect(issue?.message).toMatch(/cas particulier/i);
  });
});
