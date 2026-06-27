import {
  SPREADSHEET_COLUMN_IDS,
  isSpreadsheetColumnId,
  type SpreadsheetColumnId,
} from "./column-ids";
import {
  normalizeSpreadsheetColumnWidths,
  type SpreadsheetColumnWidths,
} from "./format-context";
import type { SpreadsheetSavedViewId } from "./quick-filters";
import { resolveSpreadsheetSavedViewId } from "./quick-filters";
import {
  resolveSpreadsheetTableDensity,
  type SpreadsheetTableDensity,
} from "./table-density";

export type { SpreadsheetTableDensity };

export const SPREADSHEET_PREFERENCES_COLLECTION = "userUiPreferences";
export const SPREADSHEET_PREFERENCES_FIELD = "registrationsSpreadsheet";

export type SpreadsheetColumnPreference = {
  id: SpreadsheetColumnId;
  visible: boolean;
};

export type RegistrationsSpreadsheetPreferences = {
  columns: SpreadsheetColumnPreference[];
  columnWidths?: SpreadsheetColumnWidths;
  activeViewId?: SpreadsheetSavedViewId | null;
  tableDensity?: SpreadsheetTableDensity;
  updatedAt?: string | null;
};

const DEFAULT_HIDDEN_COLUMN_IDS = new Set<SpreadsheetColumnId>(["submitterUid"]);

/** Ordre par défaut : champs utiles au secrétariat en tête, identifiants techniques à la fin. */
const DEFAULT_COLUMN_ORDER: SpreadsheetColumnId[] = [
  "lastName",
  "firstName",
  "status",
  "mainSectionId",
  "adherentEmail",
  "adherentPhonePrimary",
  "adherentPhoneSecondary",
  "birthDate",
  "sex",
  "city",
  "postalCode",
  "medicalCertificateStatus",
  "paymentStatus",
  "paymentAmountCents",
  "paidAt",
  "submittedAt",
  "updatedAt",
  "adherentRole",
  "wasSqyMemberLastYear",
  "ffttLicense",
  "ffttLicenseLookup",
  "birthCity",
  "addressLine1",
  "addressLine2",
  "representatives",
  "additionalSectionIds",
  "slotIds",
  "schoolPickupSlotIds",
  "medicalCertificateDeclaration",
  "medicalQuestionnaire",
  "medicalVeteranPath",
  "medicalCertificateStatusUpdatedAt",
  "medicalCertificateStatusUpdatedBy",
  "wantsRegistrationCertificate",
  "familyRegistrationOrder",
  "reductionTypes",
  "reductionReferenceCodes",
  "firstFemaleRegistrationSqy",
  "photoConsent",
  "emergencyMedicalAuthorization",
  "supervisionAcknowledgement",
  "internalRulesAccepted",
  "wantsCompetitorExtras",
  "competitionJerseySize",
  "wantsOptionalJersey",
  "optionalJerseySize",
  "competitionIds",
  "applicantNotes",
  "isMinor",
  "submitterAccountEmail",
  "reviewNotes",
  "paymentRequestedAt",
  "paymentRequestedBy",
  "paymentEmailSentTo",
  "stripeCheckoutSessionId",
  "stripeCheckoutUrl",
  "stripeInvoiceId",
  "pricingQuote",
  "pricingQuoteStatus",
  "pricingQuoteComputedAt",
  "handisportPracticeLevel",
  "paymentStripeLineItems",
  "payment",
  "paymentMethod",
  "paymentInstallments",
  "paymentAids",
  "holidayVoucherAmountCents",
  "remainingPaymentMethod",
  "paymentNote",
  "specialPaymentNote",
  "submitterUid",
  "schemaVersion",
  "id",
];

function buildDefaultColumnList(): SpreadsheetColumnPreference[] {
  const orderedSet = new Set(DEFAULT_COLUMN_ORDER);
  const ordered = [
    ...DEFAULT_COLUMN_ORDER.filter((id) => SPREADSHEET_COLUMN_IDS.includes(id)),
    ...SPREADSHEET_COLUMN_IDS.filter((id) => !orderedSet.has(id)),
  ];
  return ordered.map((id) => ({
    id,
    visible: !DEFAULT_HIDDEN_COLUMN_IDS.has(id),
  }));
}

export function getDefaultSpreadsheetPreferences(): RegistrationsSpreadsheetPreferences {
  return { columns: buildDefaultColumnList() };
}

export function normalizeSpreadsheetPreferences(
  raw: unknown
): RegistrationsSpreadsheetPreferences {
  const defaults = getDefaultSpreadsheetPreferences();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const input = raw as Record<string, unknown>;
  const columnsRaw = input.columns;
  if (!Array.isArray(columnsRaw)) {
    return defaults;
  }

  const seen = new Set<SpreadsheetColumnId>();
  const columns: SpreadsheetColumnPreference[] = [];

  for (const entry of columnsRaw) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as { id?: unknown }).id;
    const visible = (entry as { visible?: unknown }).visible;
    if (typeof id !== "string" || !isSpreadsheetColumnId(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    columns.push({ id, visible: visible === true });
  }

  for (const columnId of SPREADSHEET_COLUMN_IDS) {
    if (!seen.has(columnId)) {
      columns.push({ id: columnId, visible: false });
    }
  }

  if (columns.every((column) => !column.visible)) {
    return defaults;
  }

  return {
    columns,
    columnWidths: normalizeSpreadsheetColumnWidths(input.columnWidths),
    activeViewId: resolveSpreadsheetSavedViewId(
      typeof input.activeViewId === "string" ? input.activeViewId : null
    ),
    tableDensity: resolveSpreadsheetTableDensity(input.tableDensity),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : null,
  };
}

export function getVisibleColumnsInOrder(
  preferences: RegistrationsSpreadsheetPreferences
): SpreadsheetColumnId[] {
  return preferences.columns.filter((column) => column.visible).map((column) => column.id);
}

export function validateSpreadsheetPreferencesPayload(
  body: unknown
): { ok: true; preferences: RegistrationsSpreadsheetPreferences } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Corps de requête invalide" };
  }

  const columns = (body as { columns?: unknown }).columns;
  if (!Array.isArray(columns) || columns.length === 0) {
    return { ok: false, error: "columns requis" };
  }

  const hasVisibleColumn = columns.some(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      (entry as { visible?: unknown }).visible === true
  );
  if (!hasVisibleColumn) {
    return { ok: false, error: "Au moins une colonne visible est requise" };
  }

  const normalized = normalizeSpreadsheetPreferences({
    columns,
    columnWidths: (body as { columnWidths?: unknown }).columnWidths,
    activeViewId: (body as { activeViewId?: unknown }).activeViewId,
    tableDensity: (body as { tableDensity?: unknown }).tableDensity,
  });

  return { ok: true, preferences: normalized };
}

export function setAllColumnsVisibility(
  columns: SpreadsheetColumnPreference[],
  visible: boolean
): SpreadsheetColumnPreference[] {
  return columns.map((column) => ({ ...column, visible }));
}
