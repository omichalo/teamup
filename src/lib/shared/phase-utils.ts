import { Match, Team } from "@/types";
import { getMatchEpreuve } from "@/lib/shared/epreuve-utils";

interface EquipeWithMatches {
  team: Team;
  matches: Match[];
}

/**
 * Détermine la phase en cours en analysant les équipes et leurs matchs
 * La logique : la phase aller se termine le jour du dernier match des équipes "Phase 1"
 *
 * @param equipesWithMatches - Liste des équipes avec leurs matchs
 * @returns La phase en cours ("aller" ou "retour") ou "aller" par défaut
 */
export function getCurrentPhase(
  equipesWithMatches: EquipeWithMatches[]
): "aller" | "retour" {
  if (!equipesWithMatches || equipesWithMatches.length === 0) {
    return "aller"; // Par défaut, retourner "aller"
  }

  const now = new Date();

  // Séparer les équipes Phase 1 (aller) et Phase 2 (retour)
  const phase1Equipes = equipesWithMatches.filter(
    (eq) =>
      eq.team.name.includes("Phase 1") || eq.team.division.includes("Phase 1")
  );
  const phase2Equipes = equipesWithMatches.filter(
    (eq) =>
      eq.team.name.includes("Phase 2") || eq.team.division.includes("Phase 2")
  );

  // Si aucune équipe Phase 1, considérer qu'on est en phase retour
  if (phase1Equipes.length === 0) {
    // Si on a des équipes Phase 2, on est en retour
    if (phase2Equipes.length > 0) {
      return "retour";
    }
    // Sinon, par défaut aller
    return "aller";
  }

  // Si pas d'équipes Phase 2 mais des équipes Phase 1, on est en aller
  if (phase2Equipes.length === 0) {
    return "aller";
  }

  // Trouver le dernier match des équipes Phase 1 (fin de la phase aller)
  let lastPhase1MatchDate: Date | null = null;

  phase1Equipes.forEach((eq) => {
    if (eq.matches && eq.matches.length > 0) {
      eq.matches.forEach((match) => {
        const matchDate = new Date(match.date);
        if (!lastPhase1MatchDate || matchDate > lastPhase1MatchDate) {
          lastPhase1MatchDate = matchDate;
        }
      });
    }
  });

  // Si on n'a pas trouvé de match Phase 1, on est probablement en phase aller
  if (!lastPhase1MatchDate) {
    return "aller";
  }

  // Si la date actuelle est avant ou égale au dernier match Phase 1, on est en phase aller
  // Sinon, on est en phase retour
  // À ce stade, lastPhase1MatchDate ne peut pas être null (vérifié ci-dessus)
  const lastPhase1Date: Date = lastPhase1MatchDate;
  if (now <= lastPhase1Date) {
    return "aller";
  } else {
    return "retour";
  }
}

/**
 * Retourne la phase (aller/retour) du prochain match de championnat par équipes à jouer.
 * Utilisé pour pré-sélectionner la phase sur les pages compositions et compositions par défaut.
 *
 * @param equipesWithMatches - Liste des équipes avec leurs matchs
 * @returns "aller" | "retour" si un prochain match existe, null sinon
 */
export function getPhaseOfNextChampionnatEquipesMatch(
  equipesWithMatches: EquipeWithMatches[]
): "aller" | "retour" | null {
  if (!equipesWithMatches?.length) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const upcoming: { date: Date; phase: "aller" | "retour" }[] = [];

  for (const eq of equipesWithMatches) {
    for (const m of eq.matches) {
      if (getMatchEpreuve(m, eq.team) !== "championnat_equipes") continue;
      const d = new Date(m.date);
      if (d < startOfToday) continue;
      const ph = (m.phase || "").toLowerCase();
      if (ph !== "aller" && ph !== "retour") continue;
      upcoming.push({ date: d, phase: ph as "aller" | "retour" });
    }
  }

  if (upcoming.length === 0) return null;
  upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
  return upcoming[0].phase;
}
