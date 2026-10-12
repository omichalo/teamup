import type { CampRegistration } from "@/lib/camps/types";
import { SAGE_ACCOUNTS, SAGE_JOURNALS, treasuryForReceivedMethod } from "./chart";
import { entryLine, settlementLines } from "./entry-lines";
import {
  compactPieceNumber,
  formatParisDate,
  sageEntryLabel,
} from "./format-sage";
import type {
  RegistrationSageExport,
  SageExportAnomaly,
  SagePartyContext,
  SageThirdParty,
} from "./types";

function auxiliaryForCamp(registration: CampRegistration): string {
  const base = registration.clubRegistrationId ?? registration.id;
  const compact = base.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return `S${compact || "CAMP"}`.slice(0, 13);
}

/**
 * Écritures Sage pour une inscription stage (produit 706100, pas cotisation).
 */
export function buildSageExportForCampRegistration(
  registration: CampRegistration,
  seasonLabel: string
): RegistrationSageExport {
  const anomalies: SageExportAnomaly[] = [];
  const adherentName = `${registration.firstName} ${registration.lastName}`.trim();
  const context: SagePartyContext = {
    registrationId: registration.id,
    adherentName,
    seasonLabel,
  };
  const auxiliary = auxiliaryForCamp(registration);
  const invoiceNumber = registration.payment.invoiceNumber;

  if (!invoiceNumber) {
    if (registration.pricingQuote.totalCents > 0 && registration.status !== "cancelled") {
      anomalies.push({
        ...context,
        code: "CAMP_MISSING_INVOICE",
        severity: "review",
        message: "Inscription stage sans STG-FAC.",
        documentNumber: "",
        amountCents: registration.pricingQuote.totalCents,
      });
    }
    return { lines: [], anomalies, thirdParty: null };
  }

  const date = formatParisDate(registration.submittedAt);
  if (!date) {
    anomalies.push({
      ...context,
      code: "date_manquante",
      severity: "blocking",
      message: "Date d'inscription stage invalide.",
      documentNumber: invoiceNumber,
      amountCents: registration.pricingQuote.totalCents,
    });
    return { lines: [], anomalies, thirdParty: null };
  }

  const lines = [];
  const amount = registration.pricingQuote.totalCents;
  if (amount > 0 && registration.status !== "cancelled") {
    const piece = compactPieceNumber(invoiceNumber);
    const label = sageEntryLabel(adherentName, "Facture stage", seasonLabel);
    lines.push(
      entryLine(
        {
          context,
          journal: SAGE_JOURNALS.sales,
          date,
          piece,
          teamupDocumentNumber: invoiceNumber,
        },
        {
          account: SAGE_ACCOUNTS.client,
          auxiliary,
          label,
          debitCents: amount,
          creditCents: 0,
        }
      ),
      entryLine(
        {
          context,
          journal: SAGE_JOURNALS.sales,
          date,
          piece,
          teamupDocumentNumber: invoiceNumber,
        },
        {
          account: SAGE_ACCOUNTS.stages,
          auxiliary: "",
          label,
          debitCents: 0,
          creditCents: amount,
        }
      )
    );
  }

  for (const received of registration.payment.receivedPayments) {
    if (!received.documentNumber || received.amountCents <= 0) continue;
    const paidDate = formatParisDate(received.paidAt);
    if (!paidDate) continue;
    const treasury = treasuryForReceivedMethod(received.method);
    lines.push(
      ...settlementLines({
        context,
        journal: treasury.journal,
        date: paidDate,
        piece: compactPieceNumber(received.documentNumber),
        teamupDocumentNumber: received.documentNumber,
        auxiliary,
        treasuryAccount: treasury.account,
        amountCents: received.amountCents,
        clientNature: "Règlement stage",
        treasuryNature: treasury.nature,
        reverse: false,
      })
    );
  }

  const thirdParty: SageThirdParty = {
    code: auxiliary,
    licenseMissing: true,
    lastName: registration.lastName,
    firstName: registration.firstName,
    license: "",
    addressLine1: "",
    postalCode: "",
    city: "",
    email: registration.email,
    registrationId: registration.id,
    seasonLabel,
  };

  return { lines, anomalies, thirdParty };
}
