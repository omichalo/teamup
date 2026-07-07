import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { z } from "zod";
import { mergePaymentAidsFromDraft } from "@/lib/club-registration/payment/build-payment-from-draft";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import { normalizePaymentAidList } from "@/lib/club-registration/payment/payment-draft-helpers";
import { recalculateRegistrationPayment } from "@/lib/club-registration/payment/payment-mutations";
import type { PaymentAid } from "@/lib/club-registration/payment/types";
import { paymentAidPayloadSchema } from "@/lib/club-registration/payment-payload-schema";
import { validateAdminAids } from "@/lib/club-registration/validate-admin-aids";
import { PRICING_CATALOG_VERSION, type FamilyRegistrationOrder, type PriceQuote } from "@/lib/pricing/types";

const EMPTY_QUOTE: PriceQuote = {
  catalogVersion: PRICING_CATALOG_VERSION,
  segmentLabel: "",
  lines: [],
  subtotalCents: 0,
  totalCents: 0,
  warnings: [],
  requiresAdminReview: false,
};

export function parseManagerPaymentAidsInput(
  raw: unknown
): { ok: true; data: PaymentAid[] } | { ok: false; error: string } {
  const parsed = z.array(paymentAidPayloadSchema).safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Montants d'aides invalides" };
  }
  return { ok: true, data: normalizePaymentAidList(parsed.data) };
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readFamilyRegistrationOrder(value: unknown): FamilyRegistrationOrder {
  if (value === "second" || value === "third_or_more") return value;
  return "none";
}

function readSex(value: unknown): "female" | "male" | "other" {
  if (value === "female" || value === "male" || value === "other") return value;
  return "other";
}

function buildAidValidationDraft(
  mergedData: Record<string, unknown>,
  paymentAids: PaymentAid[]
) {
  return {
    birthDate: typeof mergedData.birthDate === "string" ? mergedData.birthDate : "",
    mainSectionId:
      typeof mergedData.mainSectionId === "string" ? mergedData.mainSectionId : "",
    slotIds: readStringArray(mergedData.slotIds),
    additionalSectionIds: readStringArray(mergedData.additionalSectionIds),
    wantsCompetitorExtras: mergedData.wantsCompetitorExtras === true,
    wantsOptionalJersey: mergedData.wantsOptionalJersey === true,
    competitionIds: readStringArray(mergedData.competitionIds),
    familyRegistrationOrder: readFamilyRegistrationOrder(mergedData.familyRegistrationOrder),
    sex: readSex(mergedData.sex),
    firstFemaleRegistrationSqy:
      mergedData.firstFemaleRegistrationSqy === true ? true : undefined,
    reductionTypes: readStringArray(mergedData.reductionTypes),
    paymentAids,
  };
}

export function resolveManagerPaymentAidsUpdate(
  mergedData: Record<string, unknown>,
  currentData: Record<string, unknown>,
  rawPaymentAids: unknown,
  config: RegistrationConfigV1
): { ok: true; patch: Record<string, unknown> } | { ok: false; error: string } {
  const parsedAids = parseManagerPaymentAidsInput(rawPaymentAids);
  if (!parsedAids.ok) {
    return parsedAids;
  }

  const aidIssue = validateAdminAids(buildAidValidationDraft(mergedData, parsedAids.data), config);
  if (aidIssue) {
    return { ok: false, error: aidIssue.message };
  }

  return {
    ok: true,
    patch: buildManagerRegistrationAidsPatch(
      mergedData,
      currentData,
      config,
      parsedAids.data
    ),
  };
}

function readReductionReferenceCodes(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {};
  const next: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string" && raw.trim()) {
      next[key] = raw.trim();
    }
  }
  return next;
}

/** Persiste `paymentAids` et recalcule `payment.aids` si un suivi paiement existe déjà. */
export function buildManagerRegistrationAidsPatch(
  mergedData: Record<string, unknown>,
  currentData: Record<string, unknown>,
  config: RegistrationConfigV1,
  normalizedPaymentAids: PaymentAid[]
): Record<string, unknown> {
  const reductionTypes = readStringArray(mergedData.reductionTypes);
  const reductionReferenceCodes = readReductionReferenceCodes(
    mergedData.reductionReferenceCodes
  );

  const mergedAids = mergePaymentAidsFromDraft({
    paymentAids: normalizedPaymentAids,
    reductionTypes,
    reductionReferenceCodes,
    config,
    quote: EMPTY_QUOTE,
    paymentMethod: "card",
    paymentInstallments: 1,
    holidayVoucherAmountCents: null,
    remainingPaymentMethod: "",
    paymentNote: "",
    specialPaymentNote: "",
  }).map((aid) => {
    const reference = reductionReferenceCodes[aid.type]?.trim();
    return reference ? { ...aid, reference } : aid;
  });

  const patch: Record<string, unknown> = {
    paymentAids: normalizedPaymentAids,
  };

  const payment = normalizeRegistrationPayment(currentData);
  if (payment) {
    const nextPayment = recalculateRegistrationPayment(
      { ...payment, aids: mergedAids },
      { preserveManualFollowUp: true }
    );
    Object.assign(patch, paymentToFirestoreUpdate(nextPayment));
  }

  return patch;
}
