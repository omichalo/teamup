import type { FFTTRencontre } from "@/lib/shared/fftt-types";
import { convertToFFTTRencontre } from "@/lib/shared/team-matches-sync-fftt-converters";
import { extractJournee } from "@/lib/shared/fftt-utils";

export interface PoolScheduleMatch {
  journee: number;
  nomEquipeA: string;
  nomEquipeB: string;
  date: string | null;
  score: string | null;
  involvesSqyPing: boolean;
}

/** Match de poule considéré comme joué (au moins un point marqué). */
export function isRencontrePlayed(rencontre: Pick<FFTTRencontre, "scoreEquipeA" | "scoreEquipeB">): boolean {
  const a = rencontre.scoreEquipeA;
  const b = rencontre.scoreEquipeB;
  if (a === null || b === null) return false;
  return a > 0 || b > 0;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getRencontreDate(rencontre: FFTTRencontre): Date | null {
  const d = rencontre.dateReelle ?? rencontre.datePrevue;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d;
}

function isOnOrAfterToday(matchDate: Date, today: Date): boolean {
  return toLocalDateKey(matchDate) >= toLocalDateKey(today);
}

/**
 * Rencontre à venir : non jouée ET (date ≥ aujourd'hui, ou sans date mais journée > dernière journée jouée).
 */
export function isRencontreUpcoming(
  rencontre: FFTTRencontre,
  maxPlayedJournee: number,
  today: Date
): boolean {
  if (isRencontrePlayed(rencontre)) return false;

  const matchDate = getRencontreDate(rencontre);
  if (matchDate) {
    return isOnOrAfterToday(matchDate, today);
  }

  const journee = extractJournee(rencontre.libelle, rencontre.lien);
  return journee > maxPlayedJournee;
}

function formatRencontreDate(rencontre: FFTTRencontre): string | null {
  const d = rencontre.dateReelle ?? rencontre.datePrevue;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatRencontreScore(rencontre: FFTTRencontre): string | null {
  const a = rencontre.scoreEquipeA;
  const b = rencontre.scoreEquipeB;
  if (a === null || b === null) return null;
  return `${a}-${b}`;
}

export interface BuildUpcomingPoolScheduleOptions {
  /** Date de référence (tests) ; par défaut : maintenant. */
  now?: Date;
}

/** Transforme les rencontres FFTT brutes en matchs à venir, triés par journée puis date. */
export function buildUpcomingPoolSchedule(
  rawRencontres: unknown[],
  options?: BuildUpcomingPoolScheduleOptions
): PoolScheduleMatch[] {
  const today = options?.now ?? new Date();
  const all = rawRencontres.map((r) => convertToFFTTRencontre(r));

  const maxPlayedJournee = all.reduce((max, r) => {
    if (!isRencontrePlayed(r)) return max;
    return Math.max(max, extractJournee(r.libelle, r.lien));
  }, 0);

  const upcoming = all
    .filter((r) => isRencontreUpcoming(r, maxPlayedJournee, today))
    .map((r): PoolScheduleMatch => ({
      journee: extractJournee(r.libelle, r.lien),
      nomEquipeA: r.nomEquipeA,
      nomEquipeB: r.nomEquipeB,
      date: formatRencontreDate(r),
      score: formatRencontreScore(r),
      involvesSqyPing:
        r.nomEquipeA.includes("SQY PING") || r.nomEquipeB.includes("SQY PING"),
    }));

  upcoming.sort((a, b) => {
    if (a.journee !== b.journee) return a.journee - b.journee;
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateA - dateB;
  });

  return upcoming;
}

export function groupPoolScheduleByJournee(
  matches: PoolScheduleMatch[]
): Map<number, PoolScheduleMatch[]> {
  const byJournee = new Map<number, PoolScheduleMatch[]>();
  for (const match of matches) {
    const list = byJournee.get(match.journee) ?? [];
    list.push(match);
    byJournee.set(match.journee, list);
  }
  return byJournee;
}
