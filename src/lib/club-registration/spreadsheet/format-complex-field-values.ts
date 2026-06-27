import type { PriceQuote } from "@/lib/pricing/types";
import type { PaymentAid } from "@/lib/club-registration/payment/types";
import type { StripeCheckoutLineItem } from "@/lib/pricing/stripe-checkout-lines";

function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function formatYesNo(value: unknown): string {
  if (value === "yes") return "Oui";
  if (value === "no") return "Non";
  return "";
}

const MEDICAL_QUESTIONNAIRE_SUMMARY_LABELS: Record<string, string> = {
  all_no: "Aucune réponse Oui",
  has_yes: "Au moins une réponse Oui",
};

export function formatMedicalQuestionnaireForSpreadsheet(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const data = value as { summary?: unknown; answers?: unknown };
  const parts: string[] = [];

  if (typeof data.summary === "string" && data.summary in MEDICAL_QUESTIONNAIRE_SUMMARY_LABELS) {
    parts.push(MEDICAL_QUESTIONNAIRE_SUMMARY_LABELS[data.summary]!);
  }

  if (data.answers && typeof data.answers === "object" && !Array.isArray(data.answers)) {
    const answerParts = Object.entries(data.answers as Record<string, unknown>)
      .map(([key, answer]) => {
        const label = formatYesNo(answer);
        return label ? `${key} : ${label}` : null;
      })
      .filter((entry): entry is string => Boolean(entry));
    if (answerParts.length > 0) {
      parts.push(answerParts.join(" ; "));
    }
  }

  return parts.join(" — ");
}

export function formatMedicalVeteranPathForSpreadsheet(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const data = value as { hadFfttLicense?: unknown; categoryChanged?: unknown };
  const parts: string[] = [];

  const hadLicense = formatYesNo(data.hadFfttLicense);
  if (hadLicense) {
    parts.push(`Licence FFTT antérieure : ${hadLicense}`);
  }

  const categoryChanged = formatYesNo(data.categoryChanged);
  if (categoryChanged) {
    parts.push(`Changement de catégorie : ${categoryChanged}`);
  }

  return parts.join(" — ");
}

export function formatFfttLicenseLookupForSpreadsheet(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const data = value as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof data.licence === "string" && data.licence.length > 0) {
    parts.push(`Licence ${data.licence}`);
  }

  const name = [data.prenom, data.nom]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ");
  if (name) {
    parts.push(name);
  }

  if (typeof data.nomClub === "string" && data.nomClub.trim().length > 0) {
    parts.push(data.nomClub.trim());
  }

  if (typeof data.categorie === "string" && data.categorie.trim().length > 0) {
    parts.push(`Cat. ${data.categorie.trim()}`);
  }

  if (typeof data.pointsLicence === "number" && Number.isFinite(data.pointsLicence)) {
    parts.push(`${data.pointsLicence} pts`);
  }

  return parts.join(" — ");
}

export function formatPricingQuoteForSpreadsheet(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const quote = value as PriceQuote;
  const parts: string[] = [];

  if (typeof quote.segmentLabel === "string" && quote.segmentLabel.trim().length > 0) {
    parts.push(quote.segmentLabel.trim());
  }

  if (typeof quote.totalCents === "number" && Number.isFinite(quote.totalCents)) {
    parts.push(`Total : ${formatEuros(quote.totalCents)}`);
  }

  if (Array.isArray(quote.lines) && quote.lines.length > 0) {
    const lineSummary = quote.lines
      .filter((line) => line.kind !== "info" || line.amountCents !== 0)
      .map((line) => {
        const amount =
          line.amountCents === 0 ? "0 €" : formatEuros(Math.abs(line.amountCents));
        const signedAmount = line.amountCents < 0 ? `−${amount}` : amount;
        return `${line.label} : ${signedAmount}`;
      })
      .join(" ; ");
    if (lineSummary) {
      parts.push(lineSummary);
    }
  }

  if (Array.isArray(quote.warnings) && quote.warnings.length > 0) {
    parts.push(`Alertes : ${quote.warnings.join(", ")}`);
  }

  if (quote.requiresAdminReview === true) {
    parts.push("Relecture admin requise");
  }

  return parts.join(" — ");
}

export function formatPaymentStripeLineItemsForSpreadsheet(value: unknown): string {
  if (!Array.isArray(value)) return "";

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const item = entry as StripeCheckoutLineItem;
      if (typeof item.name !== "string" || typeof item.amountCents !== "number") {
        return "";
      }
      return `${item.name} : ${formatEuros(item.amountCents)}`;
    })
    .filter(Boolean)
    .join(" ; ");
}

export function formatPaymentAidsForSpreadsheet(value: unknown): string {
  if (!Array.isArray(value)) return "";

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const aid = entry as PaymentAid;
      const label = typeof aid.label === "string" && aid.label.trim().length > 0
        ? aid.label.trim()
        : typeof aid.type === "string"
          ? aid.type
          : "Aide";
      const amount =
        typeof aid.amountCents === "number" && Number.isFinite(aid.amountCents)
          ? formatEuros(aid.amountCents)
          : null;
      const reference =
        typeof aid.reference === "string" && aid.reference.trim().length > 0
          ? ` (${aid.reference.trim()})`
          : "";
      const note =
        typeof aid.note === "string" && aid.note.trim().length > 0 ? ` — ${aid.note.trim()}` : "";
      return [label, amount, reference, note].filter(Boolean).join("") || label;
    })
    .filter(Boolean)
    .join(" ; ");
}

export function formatPaymentInstallmentsForSpreadsheet(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return "";
  }
  return value === 1 ? "1 échéance" : `${value} échéances`;
}

export const PRICING_QUOTE_STATUS_LABELS: Record<string, string> = {
  proposed: "Proposé",
  validated: "Validé",
};

export const HANDISPORT_PRACTICE_LEVEL_LABELS: Record<string, string> = {
  leisure: "Loisir",
  competition: "Compétition",
};
