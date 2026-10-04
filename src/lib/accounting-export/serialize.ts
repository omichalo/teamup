import { formatCentsAsSageAmount } from "./format-sage";
import type { SageEntryLine, SageExportAnomaly, SageThirdParty } from "./types";

const SAGE_HEADERS = [
  "Journal",
  "Date",
  "Piece",
  "CompteGeneral",
  "CompteAuxiliaire",
  "Libelle",
  "Debit",
  "Credit",
] as const;

const DETAIL_HEADERS = [
  ...SAGE_HEADERS,
  "NumeroTeamUp",
  "Dossier",
  "Saison",
  "Adherent",
] as const;

function csvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(";");
}

function amountCell(cents: number): string {
  return cents > 0 ? formatCentsAsSageAmount(cents) : "";
}

export function compareSageLines(a: SageEntryLine, b: SageEntryLine): number {
  return (
    a.sortDate.localeCompare(b.sortDate) ||
    a.piece.localeCompare(b.piece) ||
    a.teamupDocumentNumber.localeCompare(b.teamupDocumentNumber) ||
    b.debitCents - a.debitCents ||
    a.account.localeCompare(b.account)
  );
}

export function sageLinesToImportCsv(lines: SageEntryLine[]): string {
  const rows = [csvRow([...SAGE_HEADERS])];
  for (const line of [...lines].sort(compareSageLines)) {
    rows.push(
      csvRow([
        line.journal,
        line.date,
        line.piece,
        line.account,
        line.auxiliary,
        line.label,
        amountCell(line.debitCents),
        amountCell(line.creditCents),
      ])
    );
  }
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

export function sageLinesToDetailCsv(lines: SageEntryLine[]): string {
  const rows = [csvRow([...DETAIL_HEADERS])];
  for (const line of [...lines].sort(compareSageLines)) {
    rows.push(
      csvRow([
        line.journal,
        line.date,
        line.piece,
        line.account,
        line.auxiliary,
        line.label,
        amountCell(line.debitCents),
        amountCell(line.creditCents),
        line.teamupDocumentNumber,
        line.registrationId,
        line.seasonLabel,
        line.adherentName,
      ])
    );
  }
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

export function anomaliesToCsv(anomalies: SageExportAnomaly[]): string {
  const rows = [
    csvRow([
      "Severite",
      "Code",
      "Saison",
      "Dossier",
      "Adherent",
      "Piece",
      "Montant",
      "Message",
    ]),
  ];
  for (const anomaly of anomalies) {
    rows.push(
      csvRow([
        anomaly.severity,
        anomaly.code,
        anomaly.seasonLabel,
        anomaly.registrationId,
        anomaly.adherentName,
        anomaly.documentNumber,
        anomaly.amountCents == null ? "" : formatCentsAsSageAmount(anomaly.amountCents),
        anomaly.message,
      ])
    );
  }
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

export function thirdPartiesToCsv(parties: SageThirdParty[]): string {
  const rows = [
    csvRow([
      "CodeTiers",
      "LicenceAbsente",
      "Nom",
      "Prenom",
      "Licence",
      "Adresse",
      "CodePostal",
      "Ville",
      "Email",
      "Saison",
      "Dossier",
    ]),
  ];
  for (const party of parties) {
    rows.push(
      csvRow([
        party.code,
        party.licenseMissing ? "oui" : "non",
        party.lastName,
        party.firstName,
        party.license,
        party.addressLine1,
        party.postalCode,
        party.city,
        party.email,
        party.seasonLabel,
        party.registrationId,
      ])
    );
  }
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

export type SageExportSummary = {
  lineCount: number;
  pieceCount: number;
  debitCents: number;
  creditCents: number;
  balanced: boolean;
  byJournal: Record<string, { debitCents: number; creditCents: number; lineCount: number }>;
  byAccount: Record<string, { debitCents: number; creditCents: number }>;
  unbalancedPieces: string[];
};

export function summarizeSageLines(lines: SageEntryLine[]): SageExportSummary {
  const byJournal: SageExportSummary["byJournal"] = {};
  const byAccount: SageExportSummary["byAccount"] = {};
  const byPiece = new Map<string, { debitCents: number; creditCents: number }>();
  let debitCents = 0;
  let creditCents = 0;

  for (const line of lines) {
    debitCents += line.debitCents;
    creditCents += line.creditCents;
    const journal = byJournal[line.journal] ?? { debitCents: 0, creditCents: 0, lineCount: 0 };
    journal.debitCents += line.debitCents;
    journal.creditCents += line.creditCents;
    journal.lineCount += 1;
    byJournal[line.journal] = journal;
    const account = byAccount[line.account] ?? { debitCents: 0, creditCents: 0 };
    account.debitCents += line.debitCents;
    account.creditCents += line.creditCents;
    byAccount[line.account] = account;
    const piece = byPiece.get(line.piece) ?? { debitCents: 0, creditCents: 0 };
    piece.debitCents += line.debitCents;
    piece.creditCents += line.creditCents;
    byPiece.set(line.piece, piece);
  }

  const unbalancedPieces = [...byPiece.entries()]
    .filter(([, totals]) => totals.debitCents !== totals.creditCents)
    .map(([piece]) => piece);

  return {
    lineCount: lines.length,
    pieceCount: byPiece.size,
    debitCents,
    creditCents,
    balanced: debitCents === creditCents && unbalancedPieces.length === 0,
    byJournal,
    byAccount,
    unbalancedPieces,
  };
}
