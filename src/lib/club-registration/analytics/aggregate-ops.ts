import type {
  AnalyticsRegistrationRecord,
  CountBucket,
  FinanceAnalyticsSummary,
  OrganizationAnalyticsSummary,
  OrganizationOpsTodo,
} from "./types";

function increment(bucket: CountBucket, key: string): void {
  bucket[key] = (bucket[key] ?? 0) + 1;
}

function incrementIds(bucket: CountBucket, ids: string[] | undefined): void {
  if (!ids || ids.length === 0) return;
  for (const id of ids) {
    increment(bucket, id);
  }
}

const MEDICAL_TODO_KINDS = new Set([
  "pps_expected",
  "pps_checked_incomplete",
  "certificate_expected",
  "certificate_received",
]);

export function aggregateOrganizationAnalytics(
  records: AnalyticsRegistrationRecord[]
): OrganizationAnalyticsSummary {
  const slots: CountBucket = {};
  const schoolPickupSlots: CountBucket = {};
  const competitions: CountBucket = {};
  const jerseyFollowUp: CountBucket = {};
  const criteriumFollowUp: CountBucket = {};
  const certificateFollowUp: CountBucket = {};
  const medicalFollowUp: CountBucket = {};
  const ppsFollowUp: CountBucket = {};
  const opsTodo: OrganizationOpsTodo = {
    medical: 0,
    jersey: 0,
    criterium: 0,
    certificate: 0,
    aidsPending: 0,
  };

  for (const record of records) {
    incrementIds(slots, record.slotIds);
    incrementIds(schoolPickupSlots, record.schoolPickupSlotIds);
    incrementIds(competitions, record.competitionIds);

    const jersey = record.jerseyFollowUpStatus ?? "unknown";
    increment(jerseyFollowUp, jersey);
    if (jersey === "to_do" || jersey === "prepared_awaiting_payment") {
      opsTodo.jersey += 1;
    }

    const criterium = record.criteriumFederalRegistrationStatus ?? "unknown";
    increment(criteriumFollowUp, criterium);
    if (criterium === "to_do") opsTodo.criterium += 1;

    const certificate = record.registrationCertificateFollowUpStatus ?? "unknown";
    increment(certificateFollowUp, certificate);
    if (certificate === "to_do") opsTodo.certificate += 1;

    if (record.medicalFollowUpKind) {
      increment(medicalFollowUp, record.medicalFollowUpKind);
      if (MEDICAL_TODO_KINDS.has(record.medicalFollowUpKind)) {
        opsTodo.medical += 1;
      }
    }

    const pps = record.ppsFollowUpStatus ?? "unknown";
    increment(ppsFollowUp, pps);

    if (record.paymentAids?.some((aid) => aid.pendingReceipt)) {
      opsTodo.aidsPending += 1;
    }
  }

  return {
    slots,
    schoolPickupSlots,
    competitions,
    jerseyFollowUp,
    criteriumFollowUp,
    certificateFollowUp,
    medicalFollowUp,
    ppsFollowUp,
    opsTodo,
  };
}

export function aggregateFinanceAnalytics(
  records: AnalyticsRegistrationRecord[]
): FinanceAnalyticsSummary {
  const paymentStatus: CountBucket = {};
  const paymentMethod: CountBucket = {};
  const aidTypeCounts: CountBucket = {};
  let quoteTotalCents = 0;
  let donationCents = 0;
  let holidayVoucherCents = 0;
  let aidsDeclaredCents = 0;
  let aidsReceivedCents = 0;
  let aidsPendingCount = 0;
  let aidsCollectableCount = 0;
  let recordsWithQuote = 0;

  for (const record of records) {
    increment(paymentStatus, record.paymentStatus ?? "unknown");
    if (record.paymentMethod) {
      increment(paymentMethod, record.paymentMethod);
    }

    if (typeof record.quoteTotalCents === "number") {
      quoteTotalCents += record.quoteTotalCents;
      recordsWithQuote += 1;
    }
    if (typeof record.voluntaryDonationCents === "number") {
      donationCents += record.voluntaryDonationCents;
    }
    if (typeof record.holidayVoucherAmountCents === "number") {
      holidayVoucherCents += record.holidayVoucherAmountCents;
    }

    for (const aid of record.paymentAids ?? []) {
      if (aid.amountCents <= 0) continue;
      aidsCollectableCount += 1;
      aidsDeclaredCents += aid.amountCents;
      increment(aidTypeCounts, aid.type);
      if (aid.received) {
        aidsReceivedCents += aid.amountCents;
      }
      if (aid.pendingReceipt) {
        aidsPendingCount += 1;
      }
    }
  }

  return {
    paymentStatus,
    paymentMethod,
    quoteTotalCents,
    donationCents,
    holidayVoucherCents,
    aidsDeclaredCents,
    aidsReceivedCents,
    aidsPendingCount,
    aidsCollectableCount,
    recordsWithQuote,
    aidTypeCounts,
  };
}

export function formatCentsEur(cents: number): string {
  return `${(cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}
