import { compareSageLines } from "./serialize";
import type { SageEntryLine } from "./types";

/** Structure officielle Sage 50 / Ciel XImport (champs de largeur fixe). */
const XIMPORT_FIELDS = {
  movement: 5,
  journal: 2,
  date: 8,
  dueDate: 8,
  piece: 12,
  account: 11,
  label: 25,
  amount: 13,
  sense: 1,
  reconciliation: 12,
  analytic: 6,
  accountLabel: 34,
  euro: 1,
} as const;

function padLeft(value: string, width: number): string {
  const trimmed = value.slice(0, width);
  return trimmed.length >= width ? trimmed : trimmed.padStart(width, " ");
}

function padRight(value: string, width: number): string {
  const trimmed = value.slice(0, width);
  return trimmed.length >= width ? trimmed : trimmed.padEnd(width, " ");
}

function toLatin1Safe(value: string): string {
  return [...value]
    .map((char) => (char.charCodeAt(0) <= 255 ? char : "?"))
    .join("");
}

function ximportAccount(line: SageEntryLine): string {
  const raw = line.auxiliary.trim() || line.account.trim();
  return padRight(toLatin1Safe(raw), XIMPORT_FIELDS.account);
}

function ximportAmount(cents: number): string {
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, "0");
  return padLeft(`${euros},${remainder}`, XIMPORT_FIELDS.amount);
}

function ximportSense(line: SageEntryLine): "D" | "C" {
  return line.debitCents > 0 ? "D" : "C";
}

function ximportCents(line: SageEntryLine): number {
  return line.debitCents > 0 ? line.debitCents : line.creditCents;
}

/**
 * Génère un fichier XIMPORT.TXT (format ASCII largeur fixe Sage 50 / Ciel).
 * Journaux TeamUp VE/BQ/CA/OD tiennent sur 2 caractères.
 * Sur les lignes 411, le compte exporté est l'auxiliaire TeamUp (A… / legacy).
 */
export function sageLinesToXImportTxt(lines: SageEntryLine[]): string {
  const sorted = [...lines].sort(compareSageLines);
  const movementByPiece = new Map<string, number>();
  let nextMovement = 0;
  const rows: string[] = [];

  for (const line of sorted) {
    let movement = movementByPiece.get(line.piece);
    if (movement == null) {
      nextMovement += 1;
      if (nextMovement > 99_999) {
        throw new Error("Trop de pièces pour le n° de mouvement XImport (max 99999)");
      }
      movement = nextMovement;
      movementByPiece.set(line.piece, movement);
    }

    const cents = ximportCents(line);
    if (cents <= 0) {
      continue;
    }

    const record =
      padLeft(String(movement), XIMPORT_FIELDS.movement) +
      padRight(toLatin1Safe(line.journal.trim()), XIMPORT_FIELDS.journal) +
      padRight(line.sortDate.trim(), XIMPORT_FIELDS.date) +
      padRight(line.sortDate.trim(), XIMPORT_FIELDS.dueDate) +
      padRight(toLatin1Safe(line.piece.trim()), XIMPORT_FIELDS.piece) +
      ximportAccount(line) +
      padRight(toLatin1Safe(line.label.trim()), XIMPORT_FIELDS.label) +
      ximportAmount(cents) +
      ximportSense(line) +
      padRight("", XIMPORT_FIELDS.reconciliation) +
      padRight("", XIMPORT_FIELDS.analytic) +
      padRight("", XIMPORT_FIELDS.accountLabel) +
      "E";

    rows.push(record);
  }

  return `${rows.join("\r\n")}${rows.length > 0 ? "\r\n" : ""}`;
}

/** Longueur d'une ligne XImport hors fin de ligne (spec Sage 50). */
export const XIMPORT_RECORD_LENGTH =
  XIMPORT_FIELDS.movement +
  XIMPORT_FIELDS.journal +
  XIMPORT_FIELDS.date +
  XIMPORT_FIELDS.dueDate +
  XIMPORT_FIELDS.piece +
  XIMPORT_FIELDS.account +
  XIMPORT_FIELDS.label +
  XIMPORT_FIELDS.amount +
  XIMPORT_FIELDS.sense +
  XIMPORT_FIELDS.reconciliation +
  XIMPORT_FIELDS.analytic +
  XIMPORT_FIELDS.accountLabel +
  XIMPORT_FIELDS.euro;
