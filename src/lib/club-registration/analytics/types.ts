import type { RegistrationStatus } from "@/lib/club-registration/registration-status";
import type { MedicalFollowUpKind } from "@/lib/club-registration/medical-certificate";
import type { PaymentMethodId, PaymentStatusId } from "@/lib/club-registration/payment-constants";

/** Aide anonymisée (montants + réception, sans référence nominative). */
export type AnalyticsPaymentAid = {
  type: string;
  amountCents: number;
  received: boolean;
  pendingReceipt: boolean;
};

/** Enregistrement minimal pour statistiques (sans données personnelles identifiantes). */
export type AnalyticsRegistrationRecord = {
  sex?: "female" | "male" | "other";
  birthDate?: string;
  ffttCategorie?: string;
  mainSectionId?: string;
  additionalSectionIds?: string[];
  city?: string;
  postalCode?: string;
  status?: RegistrationStatus;
  wasSqyMemberLastYear?: boolean;
  handisportPracticeLevel?: string;
  wantsCompetitorExtras?: boolean;
  /** @deprecated préférer paymentAids — conservé pour agrégats legacy. */
  paymentAidTypes?: string[];
  paymentAids?: AnalyticsPaymentAid[];
  isMinor?: boolean;
  /** Date de soumission du dossier (ISO 8601). */
  submittedAt?: string;
  slotIds?: string[];
  schoolPickupSlotIds?: string[];
  competitionIds?: string[];
  jerseyFollowUpStatus?: string;
  criteriumFederalRegistrationStatus?: string;
  registrationCertificateFollowUpStatus?: string;
  medicalFollowUpKind?: MedicalFollowUpKind;
  ppsFollowUpStatus?: string;
  paymentStatus?: PaymentStatusId;
  paymentMethod?: PaymentMethodId;
  quoteTotalCents?: number;
  voluntaryDonationCents?: number;
  holidayVoucherAmountCents?: number;
};

export type AnalyticsStatusFilter = RegistrationStatus | "all";

export type AnalyticsFilters = {
  status: AnalyticsStatusFilter;
  mainSectionId?: string;
  sex?: "female" | "male" | "other";
  wasSqyMemberLastYear?: "renewal" | "new";
};

export type AnalyticsFilterChange =
  | { type: "status"; value: AnalyticsStatusFilter }
  | { type: "mainSectionId"; value: string | null }
  | { type: "sex"; value: "female" | "male" | "other" | null }
  | { type: "wasSqyMemberLastYear"; value: "renewal" | "new" | null };

export type CountBucket = Record<string, number>;

export type TopCountBucket = {
  top: { label: string; count: number }[];
  other: number;
  unknown: number;
};

export type RegistrationAnalyticsSummary = {
  total: number;
  sex: CountBucket;
  ageBrackets: CountBucket;
  ffttCategory: CountBucket;
  mainSection: CountBucket;
  city: TopCountBucket;
  postalCode: TopCountBucket;
  wasSqyMemberLastYear: CountBucket;
  handisport: CountBucket;
  competitor: CountBucket;
  paymentAids: CountBucket;
  additionalSections: CountBucket;
  isMinor: CountBucket;
  status: CountBucket;
};

export type OrganizationOpsTodo = {
  medical: number;
  jersey: number;
  criterium: number;
  certificate: number;
  aidsPending: number;
};

export type OrganizationAnalyticsSummary = {
  slots: CountBucket;
  schoolPickupSlots: CountBucket;
  competitions: CountBucket;
  jerseyFollowUp: CountBucket;
  criteriumFollowUp: CountBucket;
  certificateFollowUp: CountBucket;
  medicalFollowUp: CountBucket;
  ppsFollowUp: CountBucket;
  opsTodo: OrganizationOpsTodo;
};

export type FinanceAnalyticsSummary = {
  paymentStatus: CountBucket;
  paymentMethod: CountBucket;
  quoteTotalCents: number;
  donationCents: number;
  holidayVoucherCents: number;
  aidsDeclaredCents: number;
  aidsReceivedCents: number;
  aidsPendingCount: number;
  aidsCollectableCount: number;
  recordsWithQuote: number;
  aidTypeCounts: CountBucket;
};

export type CrossTabAxis =
  | "sex"
  | "ageBracket"
  | "mainSection"
  | "ffttCategory"
  | "city"
  | "postalCode"
  | "wasSqyMemberLastYear"
  | "handisport"
  | "competitor"
  | "status"
  | "isMinor";

export type CrossTabResult = {
  rowLabels: string[];
  colLabels: string[];
  counts: number[][];
  rowTotals: number[];
  colTotals: number[];
};
