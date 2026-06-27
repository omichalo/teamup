import { REGISTRATION_CLIENT_FIELDS } from "@/lib/club-registration/registration-api-fields";

/** Champs métadonnées en plus des champs dossier. */
export const SPREADSHEET_META_FIELDS = ["id", "submittedAt", "updatedAt"] as const;

export const SPREADSHEET_COLUMN_IDS = [
  ...SPREADSHEET_META_FIELDS,
  ...REGISTRATION_CLIENT_FIELDS,
] as const;

export type SpreadsheetColumnId = (typeof SPREADSHEET_COLUMN_IDS)[number];

const COLUMN_ID_SET = new Set<string>(SPREADSHEET_COLUMN_IDS);

export function isSpreadsheetColumnId(value: string): value is SpreadsheetColumnId {
  return COLUMN_ID_SET.has(value);
}
