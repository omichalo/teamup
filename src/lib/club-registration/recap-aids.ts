import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { getCheckboxAidRules, getToggleAidRules } from "@/lib/club-registration-config/aid-rules";
import { getReductionReferenceCode } from "@/lib/club-registration/reduction-reference-codes";
import {
  findPaymentAid,
  normalizePaymentAidList,
} from "@/lib/club-registration/payment/payment-draft-helpers";
import { formatCentsAsEuros } from "@/lib/pricing";
import type { RegistrationDraft } from "@/components/club-registration/registration-defaults";

function formatAidAmount(cents: number | undefined): string {
  if (cents === undefined || cents <= 0) return "0 €";
  return formatCentsAsEuros(cents);
}

export function buildAdminAidRecapFields(
  config: RegistrationConfigV1,
  draft: Pick<
    RegistrationDraft,
    "reductionTypes" | "reductionReferenceCodes" | "paymentAids"
  >,
  findReductionLabel: (id: string) => string
): Array<{ label: string; value: string }> {
  const paymentAids = normalizePaymentAidList(draft.paymentAids);
  const toggleAidRules = getToggleAidRules(config);
  const checkboxAidIds = new Set(getCheckboxAidRules(config).map((rule) => rule.id));
  const otherReductions = draft.reductionTypes
    .filter((id) => checkboxAidIds.has(id))
    .map((id) => {
      const amount = findPaymentAid(paymentAids, id)?.amountCents;
      const label = findReductionLabel(id);
      return `${label} — ${formatAidAmount(amount)}`;
    });

  const fields: Array<{ label: string; value: string }> = toggleAidRules.map((rule) => {
    const selected = draft.reductionTypes.includes(rule.id);
    const code = getReductionReferenceCode(draft.reductionReferenceCodes, rule.id);
    const amount = findPaymentAid(paymentAids, rule.id)?.amountCents;
    if (!selected) {
      return { label: rule.label, value: "Non" };
    }
    const parts = [formatAidAmount(amount)];
    if (code) parts.unshift(`code ${code}`);
    return {
      label: rule.label,
      value: parts.join(" — "),
    };
  });

  if (getCheckboxAidRules(config).length > 0) {
    fields.push({
      label: toggleAidRules.length > 0 ? "Autres aides et réductions" : "Aides et réductions",
      value: otherReductions.length > 0 ? otherReductions.join(" ; ") : "—",
    });
  }

  const otherAid = findPaymentAid(paymentAids, "other");
  if (otherAid && (otherAid.amountCents > 0 || otherAid.note?.trim())) {
    const detail = otherAid.note?.trim()
      ? `${formatAidAmount(otherAid.amountCents)} — ${otherAid.note.trim()}`
      : formatAidAmount(otherAid.amountCents);
    fields.push({ label: "Autre aide", value: detail });
  }

  return fields;
}
