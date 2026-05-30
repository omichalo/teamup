import { validateAdminAids } from "./validate-admin-aids";

const baseDraft = {
  birthDate: "2000-04-12",
  mainSectionId: "voisins",
  wantsCompetitorExtras: false,
  competitionIds: [] as string[],
  familyRegistrationOrder: "none" as const,
  sex: "male" as const,
  reductionTypes: [] as string[],
  paymentAids: [] as { type: string; label: string; amountCents: number; note?: string }[],
};

describe("validateAdminAids", () => {
  it("exige une entrée de paiement pour chaque aide cochée", () => {
    const issue = validateAdminAids({
      ...baseDraft,
      reductionTypes: ["pass_sport"],
      paymentAids: [],
    });
    expect(issue?.message).toMatch(/0 €/);
    expect(issue?.focusSelector).toBe('[data-field="paymentAid.pass_sport"]');
  });

  it("refuse un montant nul pour une aide cochée", () => {
    const issue = validateAdminAids({
      ...baseDraft,
      reductionTypes: ["pass_sport"],
      paymentAids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 0 }],
    });
    expect(issue?.message).toMatch(/0 €/);
  });
});
