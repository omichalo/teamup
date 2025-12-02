import { useMemo } from "react";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import { getMatchEpreuve } from "@/lib/shared/epreuve-utils";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

interface JourneeData {
  journee: number;
  phase: "aller" | "retour";
  dates: Date[];
}

/**
 * Hook pour calculer les journées disponibles par épreuve et phase
 */
export function useCompositionJournees(equipes: EquipeWithMatches[]) {
  const journeesByEpreuveAndPhase = useMemo(() => {
    const journeesMap = new Map<
      EpreuveType,
      Map<"aller" | "retour", Map<number, JourneeData>>
    >();

    equipes.forEach((equipe) => {
      equipe.matches.forEach((match) => {
        const epreuve = getMatchEpreuve(match, equipe.team);

        if (!epreuve || !match.journee || !match.phase) {
          return;
        }

        // Pour le championnat de Paris, accepter toutes les phases (il n'y en a qu'une)
        // Pour le championnat par équipes, accepter uniquement "aller" et "retour"
        const phaseLower = match.phase.toLowerCase();
        let phase: "aller" | "retour";

        if (epreuve === "championnat_paris") {
          // Pour Paris, normaliser toutes les phases en "aller" (car il n'y a qu'une phase)
          phase = "aller";
        } else if (phaseLower === "aller" || phaseLower === "retour") {
          phase = phaseLower as "aller" | "retour";
        } else {
          // Phase non reconnue pour le championnat par équipes
          return;
        }

        if (!journeesMap.has(epreuve)) {
          journeesMap.set(epreuve, new Map());
        }
        const epreuveMap = journeesMap.get(epreuve)!;

        if (!epreuveMap.has(phase)) {
          epreuveMap.set(phase, new Map());
        }
        const phaseMap = epreuveMap.get(phase)!;

        const matchDate =
          match.date instanceof Date ? match.date : new Date(match.date);

        if (!phaseMap.has(match.journee)) {
          phaseMap.set(match.journee, {
            journee: match.journee,
            phase,
            dates: [matchDate],
          });
        } else {
          const journeeData = phaseMap.get(match.journee)!;
          // Ajouter la date si elle n'existe pas déjà (même jour)
          const dateStr = matchDate.toDateString();
          const exists = journeeData.dates.some(
            (d) => d.toDateString() === dateStr
          );
          if (!exists) {
            journeeData.dates.push(matchDate);
          }
        }
      });
    });

    // Trier les dates pour chaque journée
    journeesMap.forEach((epreuveMap) => {
      epreuveMap.forEach((phaseMap) => {
        phaseMap.forEach((journeeData) => {
          journeeData.dates.sort((a, b) => a.getTime() - b.getTime());
        });
      });
    });

    return journeesMap;
  }, [equipes]);

  return { journeesByEpreuveAndPhase };
}

