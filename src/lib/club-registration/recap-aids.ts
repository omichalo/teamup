import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { getCheckboxAidRules, getToggleAidRules } from "@/lib/club-registration-config/aid-rules";
import { getReductionReferenceCode } from "@/lib/club-registration/reduction-reference-codes";
import type { RegistrationDraft } from "@/components/club-registration/registration-defaults";

export function buildAdminAidRecapFields(
  config: RegistrationConfigV1,
  draft: Pick<RegistrationDraft, "reductionTypes" | "reductionReferenceCodes">,
  findReductionLabel: (id: string) => string
): Array<{ label: string; value: string }> {
  const toggleAidRules = getToggleAidRules(config);
  const checkboxAidIds = new Set(getCheckboxAidRules(config).map((rule) => rule.id));
  const otherReductions = draft.reductionTypes
    .filter((id) => checkboxAidIds.has(id))
    .map((id) => findReductionLabel(id));

  const fields: Array<{ label: string; value: string }> = toggleAidRules.map((rule) => {
    const selected = draft.reductionTypes.includes(rule.id);
    const code = getReductionReferenceCode(draft.reductionReferenceCodes, rule.id);
    return {
      label: rule.label,
      value: selected ? (code ? `Oui — code ${code}` : "Oui (code à transmettre)") : "Non",
    };
  });

  if (getCheckboxAidRules(config).length > 0) {
    fields.push({
      label: toggleAidRules.length > 0 ? "Autres aides et réductions" : "Aides et réductions",
      value: otherReductions.length > 0 ? otherReductions.join(", ") : "—",
    });
  }

  return fields;
}
