import {
  deriveLegacySageAuxiliaryCode,
  readFfttLicenseDigitsFromRegistration,
  readPersistedSageAuxiliaryCode,
} from "@/lib/club-registration/payment-documents/sage-auxiliary-code";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { SAGE_LABEL_MAX, SAGE_PIECE_MAX } from "./chart";

const PIECE_RE = /^(FAC|AVO|REC|AID)-(\d{4})-(\d{4})-(\d+)$/;

export function foldLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function formatParisDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  if (!day || !month || !year) {
    return null;
  }
  return `${day}/${month}/${year}`;
}

/** Pièce Sage ≤ 17 car. `FAC-2026-2027-00009` → `FAC262700009`. */
export function compactPieceNumber(documentNumber: string): string {
  const match = PIECE_RE.exec(documentNumber.trim());
  if (!match) {
    return documentNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, SAGE_PIECE_MAX);
  }
  const seq = match[4].padStart(5, "0").slice(-5);
  return `${match[1]}${match[2].slice(2)}${match[3].slice(2)}${seq}`;
}

export function reversalPieceNumber(documentNumber: string): string {
  return `X${compactPieceNumber(documentNumber)}`.slice(0, SAGE_PIECE_MAX);
}

export function truncateSageLabel(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= SAGE_LABEL_MAX) {
    return trimmed;
  }
  return trimmed.slice(0, SAGE_LABEL_MAX);
}

export function sageEntryLabel(name: string, nature: string, seasonLabel: string): string {
  const season = seasonLabel.trim();
  const text = season ? `${name} — ${nature} ${season}` : `${name} — ${nature}`;
  return truncateSageLabel(text);
}

export function formatCentsAsSageAmount(cents: number): string {
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, "0");
  return `${euros},${remainder}`;
}

export function readAdherentName(data: Record<string, unknown>): string {
  const firstName = typeof data.firstName === "string" ? data.firstName : "";
  const lastName = typeof data.lastName === "string" ? data.lastName : "";
  return formatPersonDisplayName(firstName, lastName) || "Adhérent";
}

export function readSeasonLabel(data: Record<string, unknown>): string {
  if (typeof data.seasonLabel === "string" && data.seasonLabel.trim()) {
    return data.seasonLabel.trim();
  }
  if (typeof data.season === "string" && data.season.trim()) {
    return data.season.trim();
  }
  return "";
}

export function readFfttLicenseDigits(data: Record<string, unknown>): string {
  return readFfttLicenseDigitsFromRegistration(data);
}

export type ResolvedSageThirdPartyCode = {
  code: string;
  /** Licence absente sur la fiche (attribut), pas un code provisoire. */
  licenseMissing: boolean;
  /** Code non encore persisté : repli legacy le temps du backfill. */
  unfrozen: boolean;
  license: string;
};

/**
 * Code auxiliaire pour l'export : champ figé prioritaire.
 * Repli legacy (C…/P…) uniquement si le backfill n'a pas encore tourné.
 */
export function buildThirdPartyCode(
  data: Record<string, unknown>,
  registrationId: string
): ResolvedSageThirdPartyCode {
  const license = readFfttLicenseDigits(data);
  const persisted = readPersistedSageAuxiliaryCode(data);
  if (persisted) {
    return {
      code: persisted,
      licenseMissing: !license,
      unfrozen: false,
      license,
    };
  }
  return {
    code: deriveLegacySageAuxiliaryCode(data, registrationId),
    licenseMissing: !license,
    unfrozen: true,
    license,
  };
}

export function readStringField(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}
