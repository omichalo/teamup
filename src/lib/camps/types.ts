import type {
  CampAttendanceMarkKind,
  CampPaymentMethodId,
  CampPricingMode,
  CampRegistrationStatus,
  CampStatus,
} from "./constants";

export type CampPricingRates = {
  memberDayCents: number;
  memberWeekCents: number;
  nonMemberDayCents: number;
  nonMemberWeekCents: number;
  session2hCents: number;
  twoSessionsSameDayCents: number;
};

export type CampSessionTemplate = {
  label: string;
  startMinutes: number;
  endMinutes: number;
};

export type CampCatalogSite = {
  id: string;
  label: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CampCatalogFormula = {
  id: string;
  label: string;
  pricingMode: CampPricingMode;
  sessions: CampSessionTemplate[];
  /**
   * Sites catalogue pour lesquels la formule est proposée à l’assignation.
   * Tableau vide = disponible pour tous les sites (réutilisable).
   */
  catalogSiteIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CampCatalogPricing = {
  id: string;
  label: string;
  rates: CampPricingRates;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CampFormulaConfig = {
  id: string;
  /** Réf. catalogue (snapshot copié à l’assignation). */
  catalogFormulaId?: string;
  label: string;
  pricingMode: CampPricingMode;
  sessions: CampSessionTemplate[];
};

export type CampSiteConfig = {
  id: string;
  /** Réf. catalogue (snapshot copié à l’assignation). */
  catalogSiteId?: string;
  label: string;
  formulas: CampFormulaConfig[];
};

export type Camp = {
  id: string;
  title: string;
  description: string;
  seasonLabel: string;
  status: CampStatus;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  startDate: string;
  endDate: string;
  sites: CampSiteConfig[];
  pricing: CampPricingRates;
  /** Réf. grille catalogue (snapshot copié à l’assignation). */
  catalogPricingId?: string;
  createdAt: string;
  updatedAt: string;
  createdByUid: string;
  updatedByUid: string;
};

export type CampSlot = {
  id: string;
  campId: string;
  siteId: string;
  siteLabel: string;
  formulaId: string;
  formulaLabel: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  label: string;
  capacity: number | null;
  cancelled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CampPricingLine = {
  kind: "day" | "week" | "session" | "two_sessions";
  label: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
};

export type CampPricingQuote = {
  currency: "EUR";
  isClubMember: boolean;
  lines: CampPricingLine[];
  totalCents: number;
  computedAt: string;
};

export type CampReceivedPayment = {
  id: string;
  method: CampPaymentMethodId;
  amountCents: number;
  paidAt: string;
  recordedByUid: string;
  reference?: string | null;
  documentNumber?: string | null;
  stripeCheckoutSessionId?: string | null;
};

export type CampPaymentState = {
  chosenMethod: CampPaymentMethodId | null;
  status: "pending" | "waiting_payment" | "partially_paid" | "paid";
  invoiceNumber?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripeCheckoutUrl?: string | null;
  receivedPayments: CampReceivedPayment[];
};

export type CampRegistration = {
  id: string;
  campId: string;
  schemaVersion: 1;
  status: CampRegistrationStatus;
  ownerUid: string;
  createdByUid: string;
  createdByRole: string;
  source: "self" | "staff";
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  email: string;
  isClubMember: boolean;
  clubRegistrationId?: string | null;
  formulaId: string;
  formulaLabel: string;
  siteId: string;
  siteLabel: string;
  slotIds: string[];
  pricingQuote: CampPricingQuote;
  payment: CampPaymentState;
  submittedAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
};

export type CampAttendanceMark = {
  id: string;
  campId: string;
  slotId: string;
  date: string;
  kind: CampAttendanceMarkKind;
  /** Inscrit stage (A/C). */
  campRegistrationId?: string | null;
  /** Adhérent club hors inscription stage (B). */
  clubRegistrationId?: string | null;
  /** Identifiant local de l’extérieur (D). */
  externalId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  note?: string | null;
  displayName: string;
  markedByUid: string;
  markedAt: string;
};

export type CampListItem = {
  id: string;
  title: string;
  status: CampStatus;
  startDate: string;
  endDate: string;
  seasonLabel: string;
  updatedAt: string;
};
