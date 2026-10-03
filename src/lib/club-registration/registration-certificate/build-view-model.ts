import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { resolveRegistrationInvoiceLines } from "@/lib/club-registration/payment-documents/build-invoice-view-model";
import { formatCentsAsEuros } from "@/lib/pricing/format";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { isRegistrationCertificateAvailable } from "./availability";
import {
  resolveCertificateCivility,
  resolveCertificateEnrolledParticiple,
} from "./civility";
import { REGISTRATION_CERTIFICATE_IDENTITY } from "./identity";
import { resolvePrimaryPaymentMethodLabel } from "./primary-payment-method";
import type { RegistrationCertificateViewModel } from "./types";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return dateFormatter.format(date);
}

function resolveSeasonLabel(data: Record<string, unknown>): string {
  if (typeof data.seasonLabel === "string" && data.seasonLabel.trim()) {
    return data.seasonLabel.trim();
  }
  if (typeof data.season === "string" && data.season.trim()) {
    return data.season.trim();
  }
  return "en cours";
}

function resolvePaidAtIso(
  data: Record<string, unknown>,
  fallbackIso: string
): string {
  const paidAt = data.paidAt;
  if (typeof paidAt === "string" && paidAt.trim()) {
    return paidAt.trim();
  }
  if (
    paidAt != null &&
    typeof paidAt === "object" &&
    typeof (paidAt as { toDate?: () => Date }).toDate === "function"
  ) {
    return (paidAt as { toDate: () => Date }).toDate().toISOString();
  }
  return fallbackIso;
}

/**
 * View-model attestation d’inscription — null si le dossier n’est pas éligible.
 */
export function buildRegistrationCertificateViewModel(
  registrationId: string,
  data: Record<string, unknown>,
  options?: { now?: Date }
): RegistrationCertificateViewModel | null {
  if (!isRegistrationCertificateAvailable(data)) {
    return null;
  }

  const now = options?.now ?? new Date();
  const payment = normalizeRegistrationPayment(data);
  const activePayments = (payment?.receivedPayments ?? []).filter(
    (line) => !line.reversedAt && line.amountCents > 0
  );

  const { totalCents: invoiceTotalCents } = resolveRegistrationInvoiceLines(data);
  const inscriptionAmountCents =
    payment && payment.totalAmountCents > 0
      ? payment.totalAmountCents
      : invoiceTotalCents > 0
        ? invoiceTotalCents
        : typeof data.paymentAmountCents === "number"
          ? data.paymentAmountCents
          : 0;

  if (inscriptionAmountCents <= 0) {
    return null;
  }

  const mostRecentReceivedAt =
    activePayments.length > 0
      ? activePayments
          .map((line) => line.receivedAt)
          .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))[0]!
      : now.toISOString();

  const settledAtIso = resolvePaidAtIso(data, mostRecentReceivedAt);
  const adherentName =
    formatPersonDisplayName(
      typeof data.firstName === "string" ? data.firstName : undefined,
      typeof data.lastName === "string" ? data.lastName : undefined
    ) || "Adhérent";
  const sex = data.sex;

  return {
    registrationId,
    title: "Attestation d'inscription",
    clubName: REGISTRATION_CERTIFICATE_IDENTITY.legalName,
    civilityLabel: resolveCertificateCivility(sex),
    adherentName,
    enrolledParticiple: resolveCertificateEnrolledParticiple(sex),
    seasonLabel: resolveSeasonLabel(data),
    inscriptionAmountCents,
    inscriptionAmountLabel: formatCentsAsEuros(inscriptionAmountCents),
    settledAtLabel: formatDateLabel(settledAtIso),
    primaryPaymentMethodLabel: resolvePrimaryPaymentMethodLabel(
      activePayments,
      payment?.paymentMethod
        ? { declaredPaymentMethod: payment.paymentMethod }
        : undefined
    ),
    issuedAtLabel: formatDateLabel(now.toISOString()),
    signatoryName: REGISTRATION_CERTIFICATE_IDENTITY.signatoryName,
    activityLabel: REGISTRATION_CERTIFICATE_IDENTITY.activityLabel,
  };
}
