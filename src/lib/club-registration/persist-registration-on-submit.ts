import { FieldValue } from "firebase-admin/firestore";
import type { UserRole } from "@/lib/auth/roles";
import type { MedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { calculateQuoteWithConfig } from "@/lib/club-registration-config/pricing-resolve";
import { buildPricingContext } from "@/lib/pricing/build-context";
import type { ClubRegistrationPayload } from "./build-payload-schema";
import { buildPaymentFromDraft } from "./payment/build-payment-from-draft";
import { paymentToFirestoreUpdate } from "./payment/normalize-payment";

export function buildRegistrationSubmitDocument(params: {
  payload: ClubRegistrationPayload;
  config: RegistrationConfigV1;
  submitterUid: string;
  submitterAccountEmail: string | null;
  submitterRole: UserRole;
  isMinor: boolean;
  medicalCertificateStatus: MedicalCertificateStatus;
  now: ReturnType<typeof FieldValue.serverTimestamp>;
}): Record<string, unknown> {
  const {
    payload,
    config,
    submitterUid,
    submitterAccountEmail,
    submitterRole,
    isMinor,
    medicalCertificateStatus,
    now,
  } = params;

  const pricingCtx = buildPricingContext({
    birthDate: payload.birthDate,
    mainSectionId: payload.mainSectionId,
    slotIds: payload.slotIds,
    additionalSectionIds: payload.additionalSectionIds,
    wantsCompetitorExtras: payload.wantsCompetitorExtras,
    wantsOptionalJersey: payload.wantsOptionalJersey,
    competitionIds: payload.competitionIds,
    familyRegistrationOrder: payload.familyRegistrationOrder,
    sex: payload.sex,
    firstFemaleRegistrationSqy: payload.firstFemaleRegistrationSqy,
    reductionTypes: payload.reductionTypes,
  });
  const quote = calculateQuoteWithConfig(pricingCtx, config);
  const payment = buildPaymentFromDraft({
    quote,
    config,
    reductionTypes: payload.reductionTypes,
    reductionReferenceCodes: payload.reductionReferenceCodes,
    paymentMethod: payload.paymentMethod,
    paymentInstallments: payload.paymentInstallments,
    paymentAids: payload.paymentAids.map((aid) => ({
      type: aid.type,
      label: aid.label,
      amountCents: aid.amountCents,
      ...(aid.reference ? { reference: aid.reference } : {}),
      ...(aid.note ? { note: aid.note } : {}),
    })),
    holidayVoucherAmountCents: payload.holidayVoucherAmountCents ?? null,
    remainingPaymentMethod: payload.remainingPaymentMethod ?? "",
    paymentNote: payload.paymentNote ?? "",
    specialPaymentNote: payload.specialPaymentNote ?? "",
    voluntaryDonationCents: payload.voluntaryDonationCents,
  });

  const {
    paymentMethod: _paymentMethod,
    paymentInstallments: _paymentInstallments,
    paymentAids: _paymentAids,
    holidayVoucherAmountCents: _holidayVoucherAmountCents,
    remainingPaymentMethod: _remainingPaymentMethod,
    paymentNote: _paymentNote,
    specialPaymentNote: _specialPaymentNote,
    ...storedPayload
  } = payload;

  void _paymentMethod;
  void _paymentInstallments;
  void _paymentAids;
  void _holidayVoucherAmountCents;
  void _remainingPaymentMethod;
  void _paymentNote;
  void _specialPaymentNote;

  return {
    ...storedPayload,
    voluntaryDonationCents: payload.voluntaryDonationCents,
    ...paymentToFirestoreUpdate(payment),
    pricingQuote: quote,
    pricingQuoteStatus: "proposed",
    pricingQuoteComputedAt: now,
    isMinor,
    medicalCertificateStatus,
    submitterUid,
    submitterAccountEmail,
    submitterRole,
    schemaVersion: 1,
    status: "submitted",
    submittedAt: now,
    updatedAt: now,
    createdAt: now,
  };
}
