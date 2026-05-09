import type { DiscordRole, MentionableItem } from "./types";

function formatDayMonthLabel(dateInput: string): string {
  const [year, month, day] = dateInput.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
  });
}

export function buildDefaultPollMessage(params: {
  epreuveType: "championnat_equipes" | "championnat_paris" | null | undefined;
  propFridayDate: string | undefined;
  propSaturdayDate: string | undefined;
  fridayDate: string;
  saturdayDate: string;
  journee: number | null;
  date: string | undefined;
}): string {
  const {
    epreuveType,
    propFridayDate,
    propSaturdayDate,
    fridayDate,
    saturdayDate,
    journee,
    date,
  } = params;

  if (epreuveType === "championnat_equipes") {
    const fridayLabel = propFridayDate
      ? formatDayMonthLabel(propFridayDate)
      : fridayDate
      ? formatDayMonthLabel(fridayDate)
      : "{fridayDate}";
    const saturdayLabel = propSaturdayDate
      ? formatDayMonthLabel(propSaturdayDate)
      : saturdayDate
      ? formatDayMonthLabel(saturdayDate)
      : "{saturdayDate}";
    return `Bonjour,\n\nProchaine journée de championnat par équipes le ${fridayLabel} (${saturdayLabel} pour les rég et équipes filles).\n\nMerci de me dire si vous êtes disponibles!\n\nPour les filles, merci de préciser vendredi et/ou samedi.`;
  }

  const parisDateLabel = date
    ? (() => {
        const dateObj = new Date(date);
        const weekday = dateObj.toLocaleDateString("fr-FR", {
          weekday: "long",
        });
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString("fr-FR", {
          month: "long",
        });
        return `ce ${weekday} ${day} ${month}`;
      })()
    : "{date}";

  return `Bonjour,\n\nProchaine journée de championnat de Paris - Journée ${
    journee || "{journee}"
  }${date ? ` ${parisDateLabel}` : ""}.\n\nMerci de me dire si vous êtes disponibles!`;
}

export function filterMentionItems(params: {
  discordMembers: Array<{ id: string; displayName: string; username?: string }>;
  discordRoles: DiscordRole[];
  query: string;
}): MentionableItem[] {
  const allMentions: MentionableItem[] = [
    ...params.discordMembers.map((m) => ({ ...m, type: "user" as const })),
    ...params.discordRoles.map((r) => ({
      id: r.id,
      displayName: r.name,
      type: "role" as const,
    })),
  ];

  const searchQuery = params.query.toLowerCase();
  return allMentions
    .filter((item) => {
      if (item.displayName.toLowerCase().includes(searchQuery)) {
        return true;
      }

      return item.type === "user" && !!item.username?.toLowerCase().includes(searchQuery);
    })
    .slice(0, 10);
}
