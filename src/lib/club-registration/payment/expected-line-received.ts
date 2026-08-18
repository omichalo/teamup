import type { ExpectedPayment, ReceivedPayment } from "./types";

/** Montant réellement encaissé rattaché à une échéance prévue, s'il existe. */
export function resolveExpectedLineReceivedCents(
  line: Pick<ExpectedPayment, "id" | "status">,
  receivedPayments: Pick<ReceivedPayment, "expectedPaymentId" | "amountCents">[]
): number | null {
  if (line.status !== "received") {
    return null;
  }
  const linked = receivedPayments.filter((item) => item.expectedPaymentId === line.id);
  if (linked.length === 0) {
    return null;
  }
  return linked.reduce((sum, item) => sum + item.amountCents, 0);
}
