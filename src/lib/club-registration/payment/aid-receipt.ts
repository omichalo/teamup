import { isExceptionalDiscountAidType } from "./exceptional-discount";
import { normalizePaymentAidList } from "./payment-draft-helpers";
import type { PaymentAid } from "./types";

export const ZERO_DUE_APPROVED_MESSAGE = "Aucun paiement n'est dû pour ce dossier.";
export const ZERO_DUE_PENDING_AID_MESSAGE =
  "Aucun paiement n'est dû. Le dossier reste ouvert en attente de réception des aides.";

export type AidReceiptActor = {
  uid: string;
  at: string;
};

export function isCollectableAid(aid: PaymentAid): boolean {
  return aid.amountCents > 0 && !isExceptionalDiscountAidType(aid.type);
}

export function isAidReceiptPending(aid: PaymentAid): boolean {
  return isCollectableAid(aid) && aid.received !== true;
}

export function hasPendingAidReceipt(aids: PaymentAid[]): boolean {
  return aids.some(isAidReceiptPending);
}

export function pickAidReceiptFields(
  aid: PaymentAid
): Pick<PaymentAid, "received" | "receivedAt" | "receivedBy"> {
  const fields: Pick<PaymentAid, "received" | "receivedAt" | "receivedBy"> = {};
  if (aid.received === true) {
    fields.received = true;
    if (aid.receivedAt) fields.receivedAt = aid.receivedAt;
    if (aid.receivedBy) fields.receivedBy = aid.receivedBy;
  } else if (aid.received === false) {
    fields.received = false;
  }
  return fields;
}

export function markAidReceived(aid: PaymentAid, actor: AidReceiptActor): PaymentAid {
  return {
    ...aid,
    received: true,
    receivedAt: actor.at,
    receivedBy: actor.uid,
  };
}

export function markAidUnreceived(aid: PaymentAid): PaymentAid {
  const { received: _received, receivedAt: _receivedAt, receivedBy: _receivedBy, ...rest } = aid;
  void _received;
  void _receivedAt;
  void _receivedBy;
  return rest;
}

export function sanitizePaymentAidsForFamilySubmit(
  aids: Array<{
    type: string;
    label: string;
    amountCents: number;
    reference?: string | undefined;
    note?: string | undefined;
    received?: boolean | undefined;
    receivedAt?: string | undefined;
    receivedBy?: string | undefined;
  }>
): PaymentAid[] {
  return normalizePaymentAidList(aids).map(markAidUnreceived);
}

export function applyManagerAidReceiptMetadata(
  incoming: PaymentAid[],
  previous: PaymentAid[],
  actor: AidReceiptActor
): PaymentAid[] {
  return incoming.map((aid) => {
    if (!isCollectableAid(aid)) {
      return markAidUnreceived(aid);
    }
    if (aid.received !== true) {
      return markAidUnreceived(aid);
    }
    const prev = previous.find((item) => item.type === aid.type);
    if (prev?.received === true && prev.receivedAt && prev.receivedBy) {
      return markAidReceived(aid, { uid: prev.receivedBy, at: prev.receivedAt });
    }
    return markAidReceived(aid, actor);
  });
}

function aidAmountSnapshotKey(aid: PaymentAid): string {
  return [aid.type, String(aid.amountCents), aid.note ?? ""].join("\u0000");
}

/** True si seuls les flags de réception changent (montants / types / notes identiques). */
export function isAidReceiptOnlyChange(incoming: PaymentAid[], previous: PaymentAid[]): boolean {
  if (incoming.length === 0 || incoming.length !== previous.length) {
    return false;
  }
  const previousKeys = previous.map(aidAmountSnapshotKey).sort();
  const incomingKeys = incoming.map(aidAmountSnapshotKey).sort();
  return previousKeys.every((key, index) => key === incomingKeys[index]);
}

export function resolveZeroDueDossierStatus(aids: PaymentAid[]): {
  status: "approved" | "in_review";
  message: string;
} {
  if (hasPendingAidReceipt(aids)) {
    return { status: "in_review", message: ZERO_DUE_PENDING_AID_MESSAGE };
  }
  return { status: "approved", message: ZERO_DUE_APPROVED_MESSAGE };
}

export function resolveApprovedStatusAfterAidReceipt(params: {
  currentStatus: unknown;
  aids: PaymentAid[];
  amountToPayCents: number;
}): "approved" | null {
  if (params.currentStatus !== "in_review" && params.currentStatus !== "submitted") {
    return null;
  }
  if (params.amountToPayCents > 0) {
    return null;
  }
  if (hasPendingAidReceipt(params.aids)) {
    return null;
  }
  return "approved";
}

export function getRegistrationPaymentAids(record: Record<string, unknown>): PaymentAid[] {
  const paymentAids = record.paymentAids;
  if (Array.isArray(paymentAids) && paymentAids.length > 0) {
    return normalizePaymentAidList(paymentAids);
  }
  const payment = record.payment;
  if (
    payment &&
    typeof payment === "object" &&
    Array.isArray((payment as { aids?: unknown }).aids) &&
    (payment as { aids: unknown[] }).aids.length > 0
  ) {
    return normalizePaymentAidList((payment as { aids: PaymentAid[] }).aids);
  }
  return [];
}

export type ManagedListAidReceiptFilter = "all" | "pending";

export function resolveManagedListAidReceiptFilter(
  value: string | null | undefined
): ManagedListAidReceiptFilter {
  return value === "pending" ? "pending" : "all";
}

export function matchesManagedAidReceiptFilter(
  record: Record<string, unknown>,
  filter: ManagedListAidReceiptFilter
): boolean {
  if (filter === "all") {
    return true;
  }
  return hasPendingAidReceipt(getRegistrationPaymentAids(record));
}
