import type { RegistrationStatus } from "@/lib/club-registration/registration-status";

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
  paymentAidTypes?: string[];
  isMinor?: boolean;
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

export type CrossTabAxis =
  | "sex"
  | "ageBracket"
  | "mainSection"
  | "ffttCategory"
  | "city"
  | "postalCode"
  | "wasSqyMemberLastYear"
  | "handisport"
  | "competitor";

export type CrossTabResult = {
  rowLabels: string[];
  colLabels: string[];
  counts: number[][];
  rowTotals: number[];
  colTotals: number[];
};
