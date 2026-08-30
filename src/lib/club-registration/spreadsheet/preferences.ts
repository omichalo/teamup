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

const DEFAULT_HIDDEN_COLUMN_IDS = new Set<SpreadsheetColumnId>(["submitterUid", "submitterRole"]);

/** Ordre par défaut : champs utiles au secrétariat en tête, identifiants techniques à la fin. */
const DEFAULT_COLUMN_ORDER: SpreadsheetColumnId[] = [
  "lastName",
  "firstName",
  "ffttLicense",
  "ffttCategorie",
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
  "ppsFollowUpStatus",
  "paymentStatus",
  "paymentAmountCents",
  "paidAt",
  "submittedAt",
  "updatedAt",
  "adherentRole",
  "wasSqyMemberLastYear",
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
  "ppsFollowUpUpdatedAt",
  "ppsFollowUpUpdatedBy",
  "ppsFollowUpEvents",
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
  "criteriumFederalRegistrationStatus",
  "jerseyFollowUpStatus",
  "registrationCertificateFollowUpStatus",
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
    visible: defaultColumnVisible(id),
  }));
}

function defaultColumnVisible(id: SpreadsheetColumnId): boolean {
  return !DEFAULT_HIDDEN_COLUMN_IDS.has(id);
}

/** Place une colonne manquante selon l’ordre métier, pas à la fin de la liste sauvegardée. */
export function insertMissingSpreadsheetColumn(
  columns: SpreadsheetColumnPreference[],
  columnId: SpreadsheetColumnId
): SpreadsheetColumnPreference[] {
  if (columns.some((column) => column.id === columnId)) {
    return columns;
  }
  const pref: SpreadsheetColumnPreference = {
    id: columnId,
    visible: defaultColumnVisible(columnId),
  };
  const defaultIndex = DEFAULT_COLUMN_ORDER.indexOf(columnId);
  if (defaultIndex === -1) {
    return [...columns, pref];
  }
  if (defaultIndex === 0) {
    return [pref, ...columns];
  }
  for (let i = defaultIndex - 1; i >= 0; i--) {
    const predecessor = DEFAULT_COLUMN_ORDER[i];
    const idx = columns.findIndex((column) => column.id === predecessor);
    if (idx !== -1) {
      return [...columns.slice(0, idx + 1), pref, ...columns.slice(idx + 1)];
    }
  }
  return [...columns, pref];
}

function placeColumnAfter(
  columns: SpreadsheetColumnPreference[],
  columnId: SpreadsheetColumnId,
  afterId: SpreadsheetColumnId
): SpreadsheetColumnPreference[] {
  const from = columns.findIndex((column) => column.id === columnId);
  const after = columns.findIndex((column) => column.id === afterId);
  if (from === -1 || after === -1 || from === after + 1) {
    return columns;
  }
  const next = [...columns];
  const [moved] = next.splice(from, 1);
  if (!moved) {
    return columns;
  }
  const afterAfterMove = next.findIndex((column) => column.id === afterId);
  next.splice(afterAfterMove + 1, 0, moved);
  return next;
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
  let columns: SpreadsheetColumnPreference[] = [];

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
      columns = insertMissingSpreadsheetColumn(columns, columnId);
      seen.add(columnId);
    }
  }
  columns = placeColumnAfter(columns, "ffttCategorie", "ffttLicense");

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
