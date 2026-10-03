import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import type { PaymentAid } from "@/lib/club-registration/payment/types";
import type { PaymentAidReceiptViewModel } from "./types";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function resolveSeasonLabel(data: Record<string, unknown>): string | null {
  if (typeof data.seasonLabel === "string" && data.seasonLabel.trim()) {
    return data.seasonLabel.trim();
  }
  if (typeof data.season === "string" && data.season.trim()) {
    return data.season.trim();
  }
  return null;
}

export function buildPaymentAidReceiptViewModel(
  registrationId: string,
  data: Record<string, unknown>,
  aid: PaymentAid,
  options: { documentNumber: string; clubName?: string }
): PaymentAidReceiptViewModel | null {
  if (aid.amountCents <= 0) {
    return null;
  }

  let issuedAtLabel: string;
  try {
    issuedAtLabel = aid.receivedAt
      ? dateFormatter.format(new Date(aid.receivedAt))
      : dateFormatter.format(new Date());
  } catch {
    issuedAtLabel = dateFormatter.format(new Date());
  }

  return {
    registrationId,
    aidType: aid.type,
    documentNumber: options.documentNumber,
    clubName: options.clubName ?? "SQY Ping",
    title: "Justificatif d'aide",
    adherentName:
      formatPersonDisplayName(
        typeof data.firstName === "string" ? data.firstName : undefined,
        typeof data.lastName === "string" ? data.lastName : undefined
      ) || "Adhérent",
    seasonLabel: resolveSeasonLabel(data),
    issuedAtLabel,
    aidLabel: aid.label || aid.type,
    amountCents: aid.amountCents,
    ...(aid.reference ? { reference: aid.reference } : {}),
    ...(aid.note ? { note: aid.note } : {}),
  };
}
