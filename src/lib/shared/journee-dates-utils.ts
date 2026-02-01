import type { EpreuveType } from "./epreuve-utils";
import { getMatchEpreuve } from "./epreuve-utils";

export interface JourneeData {
  journee: number;
  phase: "aller" | "retour";
  dates: Date[];
}

export interface EquipeWithMatches {
  team: { id?: string; division?: string; idEpreuve?: number; epreuve?: string };
  matches: Array<{
    journee?: number;
    phase?: string;
    date: Date | string;
    idEpreuve?: number;
    division?: string;
  }>;
}

/**
 * Constante pour une division par défaut (championnat de Paris ou équipes sans division).
 */
const DEFAULT_DIVISION = "_default";

function getDivision(match: { division?: string }, team: { division?: string }): string {
  return match.division || team.division || DEFAULT_DIVISION;
}

/**
 * Pour le championnat par équipes : normalise la division pour regrouper M et F
 * d'une même poule (ex. "D78_Pre-Regionale (Phase 2) Poule 1" et
 * "D78_Pre-Regionale Dames (Phase 2) Poule 1" → même clé pour inclure 06/02 et 07/02).
 */
function getDivisionGroup(
  division: string,
  epreuve: EpreuveType
): string {
  if (!division || epreuve === "championnat_paris") {
    return division || DEFAULT_DIVISION;
  }
  return division
    .replace(/\s+Dames\s+/gi, " ")
    .replace(/\s+Messieurs\s+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(date: Date | string): Date {
  if (date instanceof Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export interface JourneesByEpreuvePhaseDivision {
  /** epreuve -> phase -> division -> journee -> JourneeData */
  data: Map<
    EpreuveType,
    Map<"aller" | "retour", Map<string, Map<number, JourneeData>>>
  >;
  /** epreuve -> liste des divisions */
  divisionsByEpreuve: Map<EpreuveType, string[]>;
  /** (epreuve, phase) -> division avec la prochaine journée la plus proche */
  defaultDivisionByEpreuvePhase: Map<
    string,
    string
  >; /* key: `${epreuve}|${phase}` */
}

/**
 * Construit les journées groupées par épreuve, phase et division.
 * Le numéro de journée est celui fourni par le match (position après tri par date dans la sync).
 */
export function buildJourneesByEpreuvePhaseDivision(
  equipes: EquipeWithMatches[]
): JourneesByEpreuvePhaseDivision {
  const data = new Map<
    EpreuveType,
    Map<"aller" | "retour", Map<string, Map<number, JourneeData>>>
  >();
  const divisionsByEpreuve = new Map<EpreuveType, Set<string>>();
  const journeeDatesByKey = new Map<
    string,
    { division: string; debut: Date; dates: Date[] }
  >(); /* key: `${epreuve}|${phase}|${division}|${journee}` */

  for (const equipe of equipes) {
    for (const match of equipe.matches) {
      const epreuve = getMatchEpreuve(match, equipe.team);
      if (!epreuve || !match.journee || !match.phase) continue;

      const phaseLower = match.phase.toLowerCase();
      let phase: "aller" | "retour";
      if (epreuve === "championnat_paris") {
        phase = "aller";
      } else if (phaseLower === "aller" || phaseLower === "retour") {
        phase = phaseLower as "aller" | "retour";
      } else {
        continue;
      }

      const rawDivision = getDivision(match, equipe.team);
      const division = getDivisionGroup(rawDivision, epreuve);
      const matchDate = normalizeDate(match.date);

      if (!data.has(epreuve)) {
        data.set(
          epreuve,
          new Map([
            ["aller", new Map()],
            ["retour", new Map()],
          ])
        );
      }
      const epreuveMap = data.get(epreuve)!;
      const phaseMap = epreuveMap.get(phase)!;
      if (!phaseMap.has(division)) {
        phaseMap.set(division, new Map());
      }
      const divisionMap = phaseMap.get(division)!;

      if (!divisionMap.has(match.journee)) {
        divisionMap.set(match.journee, {
          journee: match.journee,
          phase,
          dates: [matchDate],
        });
      } else {
        const journeeData = divisionMap.get(match.journee)!;
        const dateStr = matchDate.toDateString();
        if (!journeeData.dates.some((d) => d.toDateString() === dateStr)) {
          journeeData.dates.push(matchDate);
        }
      }

      if (!divisionsByEpreuve.has(epreuve)) {
        divisionsByEpreuve.set(epreuve, new Set());
      }
      divisionsByEpreuve.get(epreuve)!.add(division);

      const key = `${epreuve}|${phase}|${division}|${match.journee}`;
      if (!journeeDatesByKey.has(key)) {
        journeeDatesByKey.set(key, {
          division,
          debut: matchDate,
          dates: [matchDate],
        });
      } else {
        const entry = journeeDatesByKey.get(key)!;
        if (!entry.dates.some((d) => d.toDateString() === matchDate.toDateString())) {
          entry.dates.push(matchDate);
          const minDate = new Date(Math.min(...entry.dates.map((d) => d.getTime())));
          entry.debut = minDate;
        }
      }
    }
  }

  // Trier les dates pour chaque journée
  data.forEach((epreuveMap) => {
    epreuveMap.forEach((phaseMap) => {
      phaseMap.forEach((divisionMap) => {
        divisionMap.forEach((journeeData) => {
          journeeData.dates.sort((a, b) => a.getTime() - b.getTime());
        });
      });
    });
  });

  // Calculer la division par défaut (celle avec la prochaine journée la plus proche)
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const defaultDivisionByEpreuvePhase = new Map<string, string>();

  const epreuvePhaseToClosest = new Map<
    string,
    { division: string; debut: Date }
  >();

  for (const [key, entry] of journeeDatesByKey) {
    const debutNorm = new Date(entry.debut);
    debutNorm.setHours(0, 0, 0, 0);
    if (debutNorm < now) continue;

    const epreuvePhaseKey = key.split("|").slice(0, 2).join("|");
    const current = epreuvePhaseToClosest.get(epreuvePhaseKey);
    if (!current || debutNorm < current.debut) {
      epreuvePhaseToClosest.set(epreuvePhaseKey, {
        division: entry.division,
        debut: debutNorm,
      });
    }
  }

  epreuvePhaseToClosest.forEach((val, key) => {
    defaultDivisionByEpreuvePhase.set(key, val.division);
  });

  // Fallback : si aucune division n'a de match futur, prendre la première division
  data.forEach((epreuveMap, epreuve) => {
    for (const phase of ["aller", "retour"] as const) {
      const key = `${epreuve}|${phase}`;
      if (!defaultDivisionByEpreuvePhase.has(key)) {
        const phaseMap = epreuveMap.get(phase);
        const divisions = phaseMap ? Array.from(phaseMap.keys()) : [];
        if (divisions.length > 0) {
          defaultDivisionByEpreuvePhase.set(key, divisions[0]);
        }
      }
    }
  });

  return {
    data,
    divisionsByEpreuve: new Map(
      Array.from(divisionsByEpreuve.entries()).map(([e, set]) => [
        e,
        Array.from(set),
      ])
    ),
    defaultDivisionByEpreuvePhase,
  };
}

/**
 * Retourne les journées pour une épreuve et une division données.
 */
export function getJourneesByPhaseForDivision(
  journeesData: JourneesByEpreuvePhaseDivision,
  epreuve: EpreuveType | null,
  division: string | null
): Map<"aller" | "retour", Map<number, JourneeData>> {
  const empty = new Map<
    "aller" | "retour",
    Map<number, JourneeData>
  >() as Map<"aller" | "retour", Map<number, JourneeData>>;
  if (!epreuve || !division) return empty;

  const epreuveMap = journeesData.data.get(epreuve);
  if (!epreuveMap) return empty;

  const result = new Map<"aller" | "retour", Map<number, JourneeData>>();
  for (const phase of ["aller", "retour"] as const) {
    const phaseMap = epreuveMap.get(phase);
    const divisionMap = phaseMap?.get(division);
    result.set(phase, divisionMap ? new Map(divisionMap) : new Map());
  }
  return result;
}

/**
 * Retourne la division par défaut pour une épreuve et une phase.
 * C'est la division dont la prochaine journée est la plus proche.
 */
export function getDefaultDivision(
  journeesData: JourneesByEpreuvePhaseDivision,
  epreuve: EpreuveType | null,
  phase: "aller" | "retour" | null
): string | null {
  if (!epreuve || !phase) return null;
  const key = `${epreuve}|${phase}`;
  const div = journeesData.defaultDivisionByEpreuvePhase.get(key);
  if (div) return div;
  const divisions = journeesData.divisionsByEpreuve.get(epreuve);
  return divisions && divisions.length > 0 ? divisions[0] : null;
}

/**
 * Calcule l'épreuve dont la prochaine journée est la plus proche (toutes divisions confondues).
 */
export function getDefaultEpreuve(
  journeesData: JourneesByEpreuvePhaseDivision
): EpreuveType {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let closestEpreuve: EpreuveType | null = null;
  let closestDate: Date | null = null;

  journeesData.data.forEach((epreuveMap, epreuve) => {
    epreuveMap.forEach((phaseMap) => {
      phaseMap.forEach((divisionMap) => {
        divisionMap.forEach((journeeData) => {
          if (journeeData.dates.length > 0) {
            const debut = new Date(
              Math.min(...journeeData.dates.map((d) => d.getTime()))
            );
            debut.setHours(0, 0, 0, 0);
            if (debut >= now && (!closestDate || debut < closestDate)) {
              closestDate = debut;
              closestEpreuve = epreuve;
            }
          }
        });
      });
    });
  });

  return (closestEpreuve || "championnat_equipes") as EpreuveType;
}
