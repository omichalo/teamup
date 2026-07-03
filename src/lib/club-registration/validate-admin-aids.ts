import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { findAidRuleById, getAidRuleFixedAmountCents, getAidRuleMaxAmountCents } from "@/lib/club-registration-config/aid-rules";
import { buildPricingContext, calculateQuote, formatCentsAsEuros } from "@/lib/pricing";
import { calculatePaymentSummary } from "@/lib/club-registration/payment/calculate-payment-summary";
import { findPaymentAid, normalizePaymentAidList } from "@/lib/club-registration/payment/payment-draft-helpers";
import type { RegistrationDraft } from "@/components/club-registration/registration-defaults";

export type AdminAidValidationIssue = {
  message: string;
  focusSelector: string;
};

type DraftSlice = Pick<
  RegistrationDraft,
  | "birthDate"
  | "mainSectionId"
  | "slotIds"
  | "additionalSectionIds"
  | "wantsCompetitorExtras"
  | "wantsOptionalJersey"
  | "competitionIds"
  | "familyRegistrationOrder"
  | "sex"
  | "firstFemaleRegistrationSqy"
  | "reductionTypes"
  | "paymentAids"
>;

function quoteTotalCents(
  draft: DraftSlice,
  config: RegistrationConfigV1
): number | null {
  if (!draft.birthDate) return null;
  const sex = draft.sex === "" ? ("other" as const) : draft.sex;
  const quote = calculateQuote(
    buildPricingContext({
      birthDate: draft.birthDate,
      mainSectionId: draft.mainSectionId,
      slotIds: draft.slotIds ?? [],
      additionalSectionIds: draft.additionalSectionIds ?? [],
      wantsCompetitorExtras: draft.wantsCompetitorExtras,
      wantsOptionalJersey: draft.wantsOptionalJersey,
      competitionIds: draft.competitionIds,
      familyRegistrationOrder: draft.familyRegistrationOrder,
      sex,
      firstFemaleRegistrationSqy: draft.firstFemaleRegistrationSqy,
      reductionTypes: draft.reductionTypes,
    }),
    config
  );
  return quote.totalCents;
}

/** Valide les montants d’aides saisis à l’étape dossier administratif. */
export function validateAdminAids(
  draft: DraftSlice,
  config: RegistrationConfigV1
): AdminAidValidationIssue | null {
  const aids = normalizePaymentAidList(draft.paymentAids);

  for (const reductionId of draft.reductionTypes) {
    const entry = findPaymentAid(aids, reductionId);
    if (!entry || entry.amountCents <= 0) {
      return {
        message:
          "Indiquez un montant supérieur à 0 € pour chaque aide sélectionnée.",
        focusSelector: `[data-field="paymentAid.${reductionId}"]`,
      };
    }

    const rule = findAidRuleById(config, reductionId);
    const fixedAmountCents = rule ? getAidRuleFixedAmountCents(rule) : undefined;
    if (fixedAmountCents !== undefined && entry.amountCents !== fixedAmountCents) {
      const label = rule?.label ?? reductionId;
      return {
        message: `Le montant pour « ${label} » doit être de ${formatCentsAsEuros(fixedAmountCents)}.`,
        focusSelector: `[data-field="paymentAid.${reductionId}"]`,
      };
    }

    const maxAmountCents = rule ? getAidRuleMaxAmountCents(rule) : undefined;
    if (maxAmountCents !== undefined && entry.amountCents > maxAmountCents) {
      const label = rule?.label ?? reductionId;
      return {
        message: `Le montant pour « ${label} » ne peut pas dépasser ${formatCentsAsEuros(maxAmountCents)}.`,
        focusSelector: `[data-field="paymentAid.${reductionId}"]`,
      };
    }
  }

  const totalCents = quoteTotalCents(draft, config);
  if (totalCents !== null) {
    const summary = calculatePaymentSummary({
      totalAmountCents: totalCents,
      aids,
      receivedPayments: [],
    });
    if (summary.aidsExceedTotal) {
      return {
        message: `Le total des aides (${formatCentsAsEuros(summary.assistanceTotalAmountCents)}) ne peut pas dépasser le montant de l'inscription (${formatCentsAsEuros(totalCents)}).`,
        focusSelector: '[data-field="paymentAids"]',
      };
    }
  }

  return null;
}
