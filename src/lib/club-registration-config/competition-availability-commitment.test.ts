import { getDefaultRegistrationConfig } from "./default-config";
import {
  getCompetitionAvailabilityCommitmentNotice,
  getCompetitionsRequiringAvailabilityCommitment,
} from "./competition-availability-commitment";

describe("competition availability commitment", () => {
  it("retourne les compétitions sélectionnées marquées engagement disponibilité", () => {
    const config = getDefaultRegistrationConfig();
    const withFlag = config.competitions.find((c) => c.requiresAvailabilityCommitment);
    expect(withFlag).toBeDefined();
    if (!withFlag) return;

    const result = getCompetitionsRequiringAvailabilityCommitment(config, [
      withFlag.id,
      "unknown",
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(withFlag.id);
  });

  it("ignore les compétitions sans engagement de disponibilité", () => {
    const config = getDefaultRegistrationConfig();
    const withoutFlag = config.competitions.find(
      (c) => !c.requiresAvailabilityCommitment
    );
    if (!withoutFlag) {
      config.competitions.push({
        id: "leisure_only",
        formLabel: "Loisir",
        stripeLabel: "Loisir",
        priceCents: 0,
        formGroup: "other",
        enabled: true,
        requiresAvailabilityCommitment: false,
      });
    }
    const targetId = withoutFlag?.id ?? "leisure_only";
    expect(
      getCompetitionsRequiringAvailabilityCommitment(config, [targetId])
    ).toHaveLength(0);
  });

  it("expose le texte d'engagement depuis uiCopy ou la valeur par défaut", () => {
    const config = getDefaultRegistrationConfig();
    expect(getCompetitionAvailabilityCommitmentNotice(config)).toContain(
      "règlement intérieur du club"
    );
  });
});
