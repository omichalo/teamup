import { computeAgeAt } from "@/lib/club-registration/age";
import type {
  ClassicAgeBand,
  HandisportCompetitionAgeBand,
  SportAdapteAgeBand,
} from "./catalog/sqyping-2025";

function parsePricingDate(isoDate?: string): Date {
  if (!isoDate) {
    return new Date();
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return new Date();
  }
  const y = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  const d = Number.parseInt(match[3], 10);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function resolveClassicAgeBand(
  birthDate: string,
  at?: string
): ClassicAgeBand | null {
  const age = computeAgeAt(birthDate, parsePricingDate(at));
  if (age === null) {
    return null;
  }
  if (age < 7) {
    return "baby_ping";
  }
  if (age < 15) {
    return "under_15";
  }
  return "adult_15_plus";
}

export function resolveHandisportCompetitionAgeBand(
  birthDate: string,
  at?: string
): HandisportCompetitionAgeBand | null {
  const age = computeAgeAt(birthDate, parsePricingDate(at));
  if (age === null) {
    return null;
  }
  return age < 20 ? "under_20" : "adult_20_plus";
}

export function resolveSportAdapteAgeBand(
  birthDate: string,
  at?: string
): SportAdapteAgeBand | null {
  const age = computeAgeAt(birthDate, parsePricingDate(at));
  if (age === null) {
    return null;
  }
  return age < 21 ? "under_21" : "adult_21_plus";
}
