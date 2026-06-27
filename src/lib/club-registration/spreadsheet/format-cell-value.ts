import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { getEnabledSections, getEnabledSites } from "@/lib/club-registration-config/helpers";
import { formatRegistrationSiteLabel } from "@/lib/club-registration-config/site-display";
import { toFrenchPhoneMaskedDisplay } from "@/lib/club-registration/phone-fr";
import {
  MEDICAL_CERTIFICATE_STATUS_LABELS,
  type MedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  REMAINING_PAYMENT_METHOD_LABELS,
  type PaymentMethodId,
  type PaymentStatusId,
  type RemainingPaymentMethodId,
} from "@/lib/club-registration/payment-constants";
import {
  REGISTRATION_STATUS_LABELS,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";
import type { SpreadsheetColumnId } from "./column-ids";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import {
  EMPTY_SPREADSHEET_FORMAT_CONTEXT,
  resolveSpreadsheetUserLabel,
  type SpreadsheetFormatContext,
} from "./format-context";
import { formatPaymentForSpreadsheet } from "./format-payment-spreadsheet";
import {
  formatFfttLicenseLookupForSpreadsheet,
  formatMedicalQuestionnaireForSpreadsheet,
  formatMedicalVeteranPathForSpreadsheet,
  formatPaymentAidsForSpreadsheet,
  formatPaymentInstallmentsForSpreadsheet,
  formatPaymentStripeLineItemsForSpreadsheet,
  formatPricingQuoteForSpreadsheet,
  HANDISPORT_PRACTICE_LEVEL_LABELS,
  PRICING_QUOTE_STATUS_LABELS,
} from "./format-complex-field-values";

const ADHERENT_ROLE_LABELS: Record<string, string> = {
  self: "L'adhérent lui-même",
  minor_dependent: "Mineur représenté légalement",
  other_adult: "Autre adulte",
};

const SEX_LABELS: Record<string, string> = {
  female: "Femme",
  male: "Homme",
  other: "Autre / Ne pas préciser",
};

const MEDICAL_DECLARATION_LABELS: Record<string, string> = {
  under_40_all_no: "Moins de 40 ans : aucune réponse Oui",
  over_40_cert_unchanged_all_no: "40 ans et plus, certificat déjà fourni",
  over_40_first_or_changed_certificate_required: "40 ans et plus : certificat requis",
  questionnaire_yes_certificate_required: "Au moins une réponse Oui : certificat requis",
};

const FAMILY_ORDER_LABELS: Record<string, string> = {
  none: "Première inscription dans la famille",
  second: "Deuxième inscription dans la famille",
  third_or_more: "Troisième inscription ou plus",
};

const PHOTO_LABELS: Record<string, string> = {
  accept: "Accepte la diffusion",
  refuse: "Refuse la diffusion",
};

const REPRESENTATIVE_ROLE_LABELS: Record<string, string> = {
  mother: "Mère",
  father: "Père",
  guardian: "Tuteur / Tutrice",
  self: "Adhérent(e) lui/elle-même",
  other: "Autre",
};

function formatIsoDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR");
}

function formatBoolean(value: unknown): string {
  if (value === true) return "Oui";
  if (value === false) return "Non";
  return "";
}

function formatCents(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return `${(value / 100).toFixed(2).replace(".", ",")} €`;
}

function findSectionLabel(config: RegistrationConfigV1 | null, id: string): string {
  if (!config) return id;
  return getEnabledSections(config).find((section) => section.id === id)?.label ?? id;
}

function findSlotLabel(config: RegistrationConfigV1 | null, id: string): string {
  if (!config) return id;
  for (const site of getEnabledSites(config)) {
    const slot = site.slots.find((entry) => entry.id === id);
    if (slot) return `${formatRegistrationSiteLabel(site)} — ${slot.label}`;
  }
  return id;
}

function findReductionLabel(config: RegistrationConfigV1 | null, id: string): string {
  if (!config) return id;
  return config.aidRules.find((rule) => rule.id === id)?.label ?? id;
}

function findCompetitionLabel(config: RegistrationConfigV1 | null, id: string): string {
  if (!config) return id;
  const competition = config.competitions.find((entry) => entry.id === id);
  return competition?.formLabel ?? competition?.stripeLabel ?? id;
}

function formatStringArray(
  values: unknown,
  resolveLabel: (id: string) => string
): string {
  if (!Array.isArray(values)) return "";
  return values
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(resolveLabel)
    .join(" ; ");
}

function formatRepresentatives(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const rep = entry as Record<string, unknown>;
      const role =
        typeof rep.role === "string"
          ? (REPRESENTATIVE_ROLE_LABELS[rep.role] ?? rep.role)
          : "";
      const name = [rep.firstName, rep.lastName]
        .filter((part) => typeof part === "string" && part.trim().length > 0)
        .join(" ");
      const email = typeof rep.email === "string" ? rep.email : "";
      const phone =
        typeof rep.phone === "string" ? toFrenchPhoneMaskedDisplay(rep.phone) : "";
      return [role, name, email, phone].filter(Boolean).join(" — ");
    })
    .filter(Boolean)
    .join(" | ");
}

function formatReductionCodes(value: unknown, config: RegistrationConfigV1 | null): string {
  if (!value || typeof value !== "object") return "";
  return Object.entries(value as Record<string, string>)
    .filter(([, code]) => typeof code === "string" && code.trim().length > 0)
    .map(([aidId, code]) => `${findReductionLabel(config, aidId)} : ${code}`)
    .join(" ; ");
}

function formatUnknownStructuredValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function formatMinorConsent(value: unknown, kind: "medical" | "supervision"): string {
  if (value === "yes") {
    return kind === "medical" ? "Autorisée" : "Engagement confirmé";
  }
  if (value === "not_applicable_adult") return "Non applicable adulte";
  return "";
}

/** Valeur texte affichée dans une cellule du tableau. */
export function formatSpreadsheetCellValue(
  columnId: SpreadsheetColumnId,
  row: RegistrationClientRecord,
  config: RegistrationConfigV1 | null,
  context: SpreadsheetFormatContext = EMPTY_SPREADSHEET_FORMAT_CONTEXT
): string {
  const value = row[columnId];

  switch (columnId) {
    case "submitterUid":
      return resolveSpreadsheetUserLabel(value, context, row.submitterAccountEmail);
    case "paymentRequestedBy":
    case "medicalCertificateStatusUpdatedBy":
      return resolveSpreadsheetUserLabel(value, context);
    case "adherentRole":
      return typeof value === "string" ? (ADHERENT_ROLE_LABELS[value] ?? value) : "";
    case "wasSqyMemberLastYear":
    case "wantsRegistrationCertificate":
    case "firstFemaleRegistrationSqy":
    case "internalRulesAccepted":
    case "wantsCompetitorExtras":
    case "wantsOptionalJersey":
    case "isMinor":
      return formatBoolean(value);
    case "sex":
      return typeof value === "string" ? (SEX_LABELS[value] ?? value) : "";
    case "birthDate":
      return typeof value === "string" ? value : "";
    case "adherentPhonePrimary":
    case "adherentPhoneSecondary":
      return typeof value === "string" ? toFrenchPhoneMaskedDisplay(value) : "";
    case "representatives":
      return formatRepresentatives(value);
    case "mainSectionId":
      return typeof value === "string" ? findSectionLabel(config, value) : "";
    case "additionalSectionIds":
      return formatStringArray(value, (id) => findSectionLabel(config, id));
    case "slotIds":
    case "schoolPickupSlotIds":
      return formatStringArray(value, (id) => findSlotLabel(config, id));
    case "medicalCertificateDeclaration":
      return typeof value === "string"
        ? (MEDICAL_DECLARATION_LABELS[value] ?? value)
        : "";
    case "medicalCertificateStatus":
      return typeof value === "string"
        ? (MEDICAL_CERTIFICATE_STATUS_LABELS[value as MedicalCertificateStatus] ?? value)
        : "";
    case "familyRegistrationOrder":
      return typeof value === "string" ? (FAMILY_ORDER_LABELS[value] ?? value) : "";
    case "reductionTypes":
      return formatStringArray(value, (id) => findReductionLabel(config, id));
    case "reductionReferenceCodes":
      return formatReductionCodes(value, config);
    case "photoConsent":
      return typeof value === "string" ? (PHOTO_LABELS[value] ?? value) : "";
    case "emergencyMedicalAuthorization":
      return formatMinorConsent(value, "medical");
    case "supervisionAcknowledgement":
      return formatMinorConsent(value, "supervision");
    case "competitionIds":
      return formatStringArray(value, (id) => findCompetitionLabel(config, id));
    case "status":
      return typeof value === "string"
        ? (REGISTRATION_STATUS_LABELS[value as RegistrationStatus] ?? value)
        : "";
    case "paymentStatus":
      return typeof value === "string"
        ? (PAYMENT_STATUS_LABELS[value as PaymentStatusId] ?? value)
        : "";
    case "paymentMethod":
      return typeof value === "string"
        ? (PAYMENT_METHOD_LABELS[value as PaymentMethodId] ?? value)
        : "";
    case "remainingPaymentMethod":
      return typeof value === "string"
        ? (REMAINING_PAYMENT_METHOD_LABELS[value as RemainingPaymentMethodId] ?? value)
        : "";
    case "paymentAmountCents":
    case "holidayVoucherAmountCents":
      return formatCents(value);
    case "submittedAt":
    case "updatedAt":
    case "medicalCertificateStatusUpdatedAt":
    case "paymentRequestedAt":
    case "paidAt":
    case "pricingQuoteComputedAt":
      return formatIsoDate(value);
    case "medicalQuestionnaire":
      return formatMedicalQuestionnaireForSpreadsheet(value);
    case "medicalVeteranPath":
      return formatMedicalVeteranPathForSpreadsheet(value);
    case "ffttLicenseLookup":
      return formatFfttLicenseLookupForSpreadsheet(value);
    case "pricingQuote":
      return formatPricingQuoteForSpreadsheet(value);
    case "paymentStripeLineItems":
      return formatPaymentStripeLineItemsForSpreadsheet(value);
    case "paymentInstallments":
      return formatPaymentInstallmentsForSpreadsheet(value);
    case "paymentAids":
      return formatPaymentAidsForSpreadsheet(value);
    case "pricingQuoteStatus":
      return typeof value === "string"
        ? (PRICING_QUOTE_STATUS_LABELS[value] ?? value)
        : "";
    case "handisportPracticeLevel":
      return typeof value === "string"
        ? (HANDISPORT_PRACTICE_LEVEL_LABELS[value] ?? value)
        : "";
    case "payment":
      return formatPaymentForSpreadsheet(value, context);
    default:
      return formatUnknownStructuredValue(value);
  }
}

/** Valeur utilisée pour le tri (chaîne normalisée). */
export function getSpreadsheetSortValue(
  columnId: SpreadsheetColumnId,
  row: RegistrationClientRecord,
  config: RegistrationConfigV1 | null,
  context: SpreadsheetFormatContext = EMPTY_SPREADSHEET_FORMAT_CONTEXT
): string {
  return formatSpreadsheetCellValue(columnId, row, config, context).toLocaleLowerCase("fr");
}
