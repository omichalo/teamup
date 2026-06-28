import { validateAdminAids } from "./validate-admin-aids";
import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";

const config = getDefaultRegistrationConfig();
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
    const issue = validateAdminAids(
      {
        ...baseDraft,
        reductionTypes: ["pass_sport"],
        paymentAids: [],
      },
      config
    );
    expect(issue?.message).toMatch(/0 €/);
    expect(issue?.focusSelector).toBe('[data-field="paymentAid.pass_sport"]');
  });

  it("refuse un montant nul pour une aide cochée", () => {
    const issue = validateAdminAids(
      {
        ...baseDraft,
        reductionTypes: ["pass_sport"],
        paymentAids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 0 }],
      },
      config
    );
    expect(issue?.message).toMatch(/0 €/);
  });

  it("refuse un montant au-delà du plafond configuré pour l'aide", () => {
    const cappedConfig = {
      ...config,
      aidRules: config.aidRules.map((rule) =>
        rule.id === "pass_sport" ? { ...rule, maxAmountCents: 5_000 } : rule
      ),
    };
    const issue = validateAdminAids(
      {
        ...baseDraft,
        reductionTypes: ["pass_sport"],
        paymentAids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 5_001 }],
      },
      cappedConfig
    );
    expect(issue?.message).toMatch(/50,00/);
    expect(issue?.focusSelector).toBe('[data-field="paymentAid.pass_sport"]');
  });
});
