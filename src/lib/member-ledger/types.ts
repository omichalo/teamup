/**
 * Contrat de projection financière adhérent (préparation Sage / charges futures).
 * v1 : lecture seule ; seules les charges d'adhésion sont projetées depuis
 * `clubRegistrations`. Pas d'écriture de stages / matériel ici.
 */

export const LEDGER_CHARGE_KINDS = [
  "membership",
  "camp",
  "equipment",
  "other",
] as const;
export type LedgerChargeKind = (typeof LEDGER_CHARGE_KINDS)[number];

export const LEDGER_CHARGE_SOURCES = ["registration", "manual", "system"] as const;
export type LedgerChargeSource = (typeof LEDGER_CHARGE_SOURCES)[number];

export const LEDGER_PAYMENT_SOURCES = [
  "registration",
  "manual",
  "stripe",
  "system",
] as const;
export type LedgerPaymentSource = (typeof LEDGER_PAYMENT_SOURCES)[number];

export const LEDGER_CHARGE_STATUSES = [
  "open",
  "partially_paid",
  "paid",
  "voided",
] as const;
export type LedgerChargeStatus = (typeof LEDGER_CHARGE_STATUSES)[number];

/** Référence partie / tiers — `memberAccountId` réservé au multi-saisons futur. */
export type LedgerPartyRef = {
  registrationId: string;
  seasonLabel: string;
  memberAccountId?: string | null;
};

export type LedgerCharge = {
  id: string;
  kind: LedgerChargeKind;
  label: string;
  amountCents: number;
  currency: "EUR";
  status: LedgerChargeStatus;
  occurredAt: string | null;
  source: LedgerChargeSource;
  documentNumber?: string | null;
  accountingAccountCode?: string | null;
  thirdPartyCode?: string | null;
  journalCode?: string | null;
  exportedAt?: string | null;
  exportBatchId?: string | null;
};

export type LedgerPayment = {
  id: string;
  label: string;
  amountCents: number;
  currency: "EUR";
  method: string;
  paidAt: string | null;
  reference?: string | null;
  source: LedgerPaymentSource;
  allocatedToChargeIds: string[];
  documentNumber?: string | null;
  accountingAccountCode?: string | null;
  thirdPartyCode?: string | null;
  journalCode?: string | null;
  exportedAt?: string | null;
  exportBatchId?: string | null;
  reversedAt?: string | null;
};

export type MemberLedgerTotals = {
  invoicedCents: number;
  receivedCents: number;
  balanceCents: number;
};

export type MemberLedgerView = {
  party: LedgerPartyRef;
  charges: LedgerCharge[];
  payments: LedgerPayment[];
  totals: MemberLedgerTotals;
};
