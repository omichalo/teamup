import { useState, useEffect } from "react";
import { Match } from "@/types";

interface Journee {
  number: number;
  name: string;
  dates: Date[];
  phase: string;
  matches: Match[];
}

interface JourneesData {
  journees: Journee[];
  loading: boolean;
  error: string | null;
}

export const useJournees = (clubCode: string = "08781477") => {
  const [data, setData] = useState<JourneesData>({
    journees: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchJournees = async () => {
      try {
        console.log("🔄 useJournees: Début du chargement des journées...");
        setData((prev) => ({ ...prev, loading: true, error: null }));

        // Récupérer les matches depuis l'API FFTT
        const response = await fetch(
          `/api/fftt/real-matches?clubCode=${clubCode}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const matches: Match[] = await response.json();
        console.log(
          `📊 ${matches.length} matches récupérés pour calculer les journées`
        );

        // Calculer les journées basées sur les matches
        const journees = calculateJournees(matches);

        console.log(`✅ ${journees.length} journées calculées`);
        setData({
          journees,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("❌ useJournees: Erreur:", error);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    };

    fetchJournees();
  }, [clubCode]);

  return data;
};

function calculateJournees(matches: Match[]): Journee[] {
  if (matches.length === 0) {
    return [];
  }

  // Grouper les matches par journées et phases
  const journeesMap = new Map<
    string,
    {
      number: number;
      phase: string;
      dates: Set<string>;
      matches: Match[];
    }
  >();

  matches.forEach((match) => {
    const key = `${match.phase}_${match.journee}`;

    if (!journeesMap.has(key)) {
      journeesMap.set(key, {
        number: match.journee,
        phase: match.phase,
        dates: new Set(),
        matches: [],
      });
    }

    const journee = journeesMap.get(key)!;
    journee.matches.push(match);

    // Ajouter la date de ce match
    // Convertir en Date si c'est une chaîne
    const matchDate = typeof match.date === 'string' ? new Date(match.date) : match.date;
    const dateKey = matchDate.toISOString().split("T")[0]; // YYYY-MM-DD
    journee.dates.add(dateKey);
  });

  // Convertir en tableau et trier
  const journees: Journee[] = Array.from(journeesMap.values())
    .map((journee) => ({
      number: journee.number,
      name: generateJourneeName(journee.number, journee.phase),
      dates: Array.from(journee.dates)
        .map((dateStr) => new Date(dateStr))
        .sort((a, b) => a.getTime() - b.getTime()),
      phase: journee.phase,
      matches: journee.matches.sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      ),
    }))
    .sort((a, b) => {
      // Trier d'abord par phase, puis par numéro de journée
      const phaseOrder = { aller: 1, retour: 2, playoffs: 3 };
      const aPhaseOrder = phaseOrder[a.phase as keyof typeof phaseOrder] || 4;
      const bPhaseOrder = phaseOrder[b.phase as keyof typeof phaseOrder] || 4;

      if (aPhaseOrder !== bPhaseOrder) {
        return aPhaseOrder - bPhaseOrder;
      }

      return a.number - b.number;
    });

  return journees;
}

function generateJourneeName(journeeNumber: number, phase: string): string {
  const phaseNames = {
    aller: "Aller",
    retour: "Retour",
    playoffs: "Playoffs",
  };

  const phaseName = phaseNames[phase as keyof typeof phaseNames] || phase;
  return `Journée ${journeeNumber} - ${phaseName}`;
}
