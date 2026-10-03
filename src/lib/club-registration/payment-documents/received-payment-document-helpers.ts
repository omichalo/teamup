import type { ReceivedPayment } from "@/lib/club-registration/payment/types";

export function isActiveReceivedPayment(line: ReceivedPayment): boolean {
  return !line.reversedAt && line.amountCents > 0;
}

export function hasReceivedPaymentDocumentNumber(line: ReceivedPayment): boolean {
  return typeof line.documentNumber === "string" && line.documentNumber.trim().length > 0;
}
