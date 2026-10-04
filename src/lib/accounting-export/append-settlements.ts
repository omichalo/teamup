import type { PaymentAid, ReceivedPayment } from "@/lib/club-registration/payment/types";
import { isExceptionalDiscountAidType } from "@/lib/club-registration/payment/exceptional-discount";
import { hasAidDocumentNumber, isReceivedCollectableAid } from "@/lib/club-registration/payment-documents/aid-document-helpers";
import {
  SAGE_JOURNALS,
  aidAccountForType,
  classifyOtherReceivedMethod,
  treasuryForReceivedMethod,
} from "./chart";
import { settlementLines } from "./entry-lines";
import { compactPieceNumber, formatParisDate, reversalPieceNumber } from "./format-sage";
import type { SageEntryLine, SageExportAnomaly, SagePartyContext } from "./types";

function resolveSettlementMethod(received: ReceivedPayment): {
  method: string;
  inferred: boolean;
  nonSettlement: boolean;
} {
  if (received.method !== "other") {
    return { method: received.method, inferred: false, nonSettlement: false };
  }
  const classified = classifyOtherReceivedMethod({
    label: received.label,
    note: received.note,
  });
  if (classified === "non_settlement") {
    return { method: "other", inferred: false, nonSettlement: true };
  }
  if (classified) {
    return { method: classified, inferred: true, nonSettlement: false };
  }
  return { method: "other", inferred: false, nonSettlement: false };
}

export function appendReceipt(
  lines: SageEntryLine[],
  anomalies: SageExportAnomaly[],
  context: SagePartyContext,
  received: ReceivedPayment,
  auxiliary: string
): void {
  if (received.amountCents <= 0) {
    return;
  }
  const documentNumber = received.documentNumber?.trim() ?? "";
  if (!documentNumber) {
    // Annulation d'un encaissement jamais numéroté : hors chaîne comptable, pas d'écriture.
    if (received.reversedAt) {
      return;
    }
    anomalies.push({
      ...context,
      code: "piece_manquante",
      severity: "blocking",
      message: "Encaissement sans numéro REC : exclu de l'export.",
      documentNumber: "",
      amountCents: received.amountCents,
    });
    return;
  }

  const resolved = resolveSettlementMethod(received);
  if (resolved.nonSettlement) {
    // Déjà annulé : la correction métier (remise / AVO) a été faite, pas d'écriture.
    if (received.reversedAt) {
      return;
    }
    anomalies.push({
      ...context,
      code: "encaissement_non_financier",
      severity: "blocking",
      message:
        "Encaissement « other » qui ressemble à une remise / trop-perçu, pas à un règlement. À convertir en remise exceptionnelle (AVO) ou à reclasser.",
      documentNumber,
      amountCents: received.amountCents,
    });
    return;
  }

  const treasury = treasuryForReceivedMethod(resolved.method);
  if (!treasury.known) {
    anomalies.push({
      ...context,
      code: "moyen_inconnu",
      severity: "review",
      message: `Moyen « ${received.method} » passé au compte d'attente ${treasury.account}.`,
      documentNumber,
      amountCents: received.amountCents,
    });
  } else if (resolved.inferred) {
    anomalies.push({
      ...context,
      code: "moyen_reclasse",
      severity: "info",
      message: `Moyen « other » interprété comme « ${resolved.method} » d'après le libellé « ${received.label || "—"} ».`,
      documentNumber,
      amountCents: received.amountCents,
    });
  }

  const date = formatParisDate(received.receivedAt);
  if (!date) {
    anomalies.push({
      ...context,
      code: "date_manquante",
      severity: "blocking",
      message: "Date d'encaissement invalide : reçu exclu.",
      documentNumber,
      amountCents: received.amountCents,
    });
    return;
  }

  lines.push(
    ...settlementLines({
      context,
      journal: treasury.journal,
      date,
      piece: compactPieceNumber(documentNumber),
      teamupDocumentNumber: documentNumber,
      auxiliary,
      treasuryAccount: treasury.account,
      amountCents: received.amountCents,
      clientNature: treasury.nature,
      treasuryNature: treasury.nature,
      reverse: false,
    })
  );

  if (!received.reversedAt) {
    return;
  }
  const reversalDate = formatParisDate(received.reversedAt);
  if (!reversalDate) {
    anomalies.push({
      ...context,
      code: "date_manquante",
      severity: "blocking",
      message: "Annulation sans date exploitable : contrepassation exclue.",
      documentNumber,
      amountCents: received.amountCents,
    });
    return;
  }
  lines.push(
    ...settlementLines({
      context,
      journal: treasury.journal,
      date: reversalDate,
      piece: reversalPieceNumber(documentNumber),
      teamupDocumentNumber: documentNumber,
      auxiliary,
      treasuryAccount: treasury.account,
      amountCents: received.amountCents,
      clientNature: `Annulation ${treasury.nature}`,
      treasuryNature: `Annulation ${treasury.nature}`,
      reverse: true,
    })
  );
}

export function appendAid(
  lines: SageEntryLine[],
  anomalies: SageExportAnomaly[],
  context: SagePartyContext,
  aid: PaymentAid,
  auxiliary: string
): void {
  if (aid.amountCents <= 0) {
    return;
  }
  if (isExceptionalDiscountAidType(aid.type)) {
    // La détection d'écart FAC/AVO est centralisée dans build-sage-entries.
    return;
  }
  if (!isReceivedCollectableAid(aid)) {
    anomalies.push({
      ...context,
      code: "aide_non_recue",
      severity: "pending",
      message: `Aide « ${aid.label || aid.type} » déclarée mais non reçue : pas d'écriture (attente secrétariat).`,
      documentNumber: "",
      amountCents: aid.amountCents,
    });
    return;
  }
  const rawNumber = aid.documentNumber;
  const documentNumber =
    hasAidDocumentNumber(aid) && typeof rawNumber === "string" ? rawNumber.trim() : "";
  if (!documentNumber) {
    anomalies.push({
      ...context,
      code: "piece_manquante",
      severity: "blocking",
      message: "Aide reçue sans numéro AID : exclue de l'export.",
      documentNumber: "",
      amountCents: aid.amountCents,
    });
    return;
  }
  const date = aid.receivedAt ? formatParisDate(aid.receivedAt) : null;
  if (!date) {
    anomalies.push({
      ...context,
      code: "date_manquante",
      severity: "blocking",
      message: "Aide reçue sans date : exclue de l'export.",
      documentNumber,
      amountCents: aid.amountCents,
    });
    return;
  }
  const account = aidAccountForType(aid.type);
  if (!account.known) {
    anomalies.push({
      ...context,
      code: "aide_inconnue",
      severity: "review",
      message: `Type d'aide « ${aid.type} » passé au compte d'attente ${account.account}.`,
      documentNumber,
      amountCents: aid.amountCents,
    });
  }
  const nature = `Aide ${aid.label || aid.type}`;
  lines.push(
    ...settlementLines({
      context,
      journal: SAGE_JOURNALS.general,
      date,
      piece: compactPieceNumber(documentNumber),
      teamupDocumentNumber: documentNumber,
      auxiliary,
      treasuryAccount: account.account,
      amountCents: aid.amountCents,
      clientNature: nature,
      treasuryNature: nature,
      reverse: false,
    })
  );
}
