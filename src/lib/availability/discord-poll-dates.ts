import type { EpreuveType } from "@/lib/shared/epreuve-utils";

interface JourneeData {
  journee: number;
  phase: "aller" | "retour";
  dates: Date[];
}

interface GetDiscordPollDatesArgs {
  selectedEpreuve: EpreuveType | null;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;
  journeesByPhase: Map<string, Map<number, JourneeData>>;
}

type DiscordPollDates = {
  date?: string;
  fridayDate?: string;
  saturdayDate?: string;
};

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDiscordPollDates({
  selectedEpreuve,
  selectedPhase,
  selectedJournee,
  journeesByPhase,
}: GetDiscordPollDatesArgs): DiscordPollDates {
  const phaseToUse =
    selectedEpreuve === "championnat_paris" ? "aller" : selectedPhase;
  const journeeData =
    phaseToUse && selectedJournee !== null
      ? journeesByPhase.get(phaseToUse)?.get(selectedJournee)
      : undefined;

  if (
    selectedJournee === null ||
    !journeeData ||
    journeeData.dates.length === 0
  ) {
    return {};
  }

  const sortedDates = [...journeeData.dates].sort(
    (a, b) => a.getTime() - b.getTime()
  );

  if (selectedEpreuve === "championnat_paris") {
    return { date: formatDate(sortedDates[0]) };
  }

  let fridayDate: Date | null = null;
  let saturdayDate: Date | null = null;

  for (const date of sortedDates) {
    const normalizedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const dayOfWeek = normalizedDate.getDay();
    if (dayOfWeek === 5 && !fridayDate) {
      fridayDate = normalizedDate;
    } else if (dayOfWeek === 6 && !saturdayDate) {
      saturdayDate = normalizedDate;
    }
  }

  const result: DiscordPollDates = {};
  if (fridayDate) {
    result.fridayDate = formatDate(fridayDate);
  }
  if (saturdayDate) {
    result.saturdayDate = formatDate(saturdayDate);
  }
  return result;
}
