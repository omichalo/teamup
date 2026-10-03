import { isCollectableAid } from "@/lib/club-registration/payment/aid-receipt";
import type { PaymentAid } from "@/lib/club-registration/payment/types";

/** Helpers purs (safe client) — pas de Firebase Admin. */

export function hasAidDocumentNumber(aid: PaymentAid): boolean {
  return typeof aid.documentNumber === "string" && aid.documentNumber.trim().length > 0;
}

export function isReceivedCollectableAid(aid: PaymentAid): boolean {
  return isCollectableAid(aid) && aid.received === true && aid.amountCents > 0;
}
