import type { PriceQuote } from "@/lib/pricing/types";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { calculatePaymentSummary } from "./calculate-payment-summary";
import { generateExpectedPayments } from "./generate-expected-payments";
import type { PaymentAid, PaymentDraftFields, RegistrationPayment } from "./types";
import type { PaymentMethodId } from "../payment-constants";

export type BuildPaymentFromDraftInput = PaymentDraftFields & {
  quote: PriceQuote;
  config: RegistrationConfigV1;
  reductionTypes: string[];
  reductionReferenceCodes: Record<string, string>;
};

function findAidLabel(config: RegistrationConfigV1, aidType: string): string {
  const rule = config.aidRules.find((r) => r.id === aidType);
  return rule?.label ?? aidType;
}

/** Construit les aides à partir du draft (déclarations admin + montants saisis à l'étape paiement). */
export function mergePaymentAidsFromDraft(
  input: BuildPaymentFromDraftInput
): PaymentAid[] {
  const byType = new Map<string, PaymentAid>();

  for (const draftAid of input.paymentAids) {
    if (draftAid.amountCents <= 0 && !draftAid.note?.trim()) {
      continue;
    }
    byType.set(draftAid.type, {
      ...draftAid,
      label: draftAid.label || findAidLabel(input.config, draftAid.type),
    });
  }

  for (const reductionId of input.reductionTypes) {
    if (byType.has(reductionId)) continue;
    const amountEntry = input.paymentAids.find((a) => a.type === reductionId);
    if (!amountEntry || amountEntry.amountCents <= 0) continue;
    byType.set(reductionId, {
      type: reductionId,
      label: findAidLabel(input.config, reductionId),
      amountCents: amountEntry.amountCents,
      ...(input.reductionReferenceCodes[reductionId]
        ? { reference: input.reductionReferenceCodes[reductionId] }
        : {}),
      ...(amountEntry.note ? { note: amountEntry.note } : {}),
    });
  }

  return Array.from(byType.values());
}

export function buildPaymentFromDraft(
  input: BuildPaymentFromDraftInput
): RegistrationPayment {
  const aids = mergePaymentAidsFromDraft(input);
  const totalAmountCents = Math.max(0, input.quote.totalCents);
  const summary = calculatePaymentSummary({
    totalAmountCents,
    aids,
    receivedPayments: [],
    currentPaymentStatus: "pending_validation",
  });

  const paymentMethod = input.paymentMethod as PaymentMethodId;
  const paymentInstallments =
    paymentMethod === "cheque" ? Math.max(1, input.paymentInstallments) : 1;

  const expectedPayments = generateExpectedPayments({
    amountToPayCents: summary.amountToPayCents,
    paymentMethod,
    paymentInstallments,
  });

  const built: RegistrationPayment = {
    totalAmountCents,
    assistanceTotalAmountCents: summary.assistanceTotalAmountCents,
    amountToPayCents: summary.amountToPayCents,
    aids,
    paymentMethod,
    paymentInstallments,
    expectedPayments,
    receivedPayments: [],
    paidAmountCents: 0,
    remainingAmountCents: summary.remainingAmountCents,
    paymentStatus: summary.paymentStatus,
  };

  if (input.holidayVoucherAmountCents != null && input.holidayVoucherAmountCents > 0) {
    built.holidayVoucherAmountCents = input.holidayVoucherAmountCents;
  }
  if (input.remainingPaymentMethod !== "") {
    built.remainingPaymentMethod = input.remainingPaymentMethod;
  }
  const paymentNote = input.paymentNote.trim();
  if (paymentNote) built.paymentNote = paymentNote;
  const specialPaymentNote = input.specialPaymentNote.trim();
  if (specialPaymentNote) built.specialPaymentNote = specialPaymentNote;

  return built;
}
