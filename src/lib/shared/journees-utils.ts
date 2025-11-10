export interface JourneeWithDates {
  journee: number;
  phase: "aller" | "retour";
  dates: Date[];
  label: string;
}

const createDefaultJournees = (): JourneeWithDates[] => {
  const phases: Array<"aller" | "retour"> = ["aller", "retour"];
  const results: JourneeWithDates[] = [];
  const today = new Date();

  phases.forEach((phase, phaseIndex) => {
    for (let i = 1; i <= 10; i += 1) {
      const date = new Date(today);
      const offsetWeeks = phaseIndex * 10 + (i - 1);
      date.setDate(today.getDate() + offsetWeeks * 7);

      const formattedDate = new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);

      results.push({
        journee: i,
        phase,
        dates: [date],
        label: `Journée ${i} · Phase ${phase === "aller" ? "aller" : "retour"} · ${formattedDate}`,
      });
    }
  });

  return results;
};

/**
 * Renvoie la liste des journées connues avec leurs dates associées.
 * Actuellement, cette implémentation retourne un jeu de données par défaut
 * basé sur la date du jour. Elle peut être remplacée par une récupération
 * Firestore/API lorsque les données seront disponibles.
 */
export const getJourneesWithDates = async (): Promise<JourneeWithDates[]> => {
  return createDefaultJournees();
};


