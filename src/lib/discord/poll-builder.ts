import { ChampionshipType } from "@/types/championship";

/**
 * Construit le message Discord avec embed et boutons pour un sondage de disponibilité
 * @param isTeamChampionship - Si true, crée un sondage avec deux séries de boutons (masculin et féminin)
 * @param messageTemplate - Template personnalisé pour le message (optionnel)
 * @param fridayDate - Date du vendredi (optionnel, pour le championnat par équipes)
 * @param saturdayDate - Date du samedi (optionnel, pour le championnat par équipes)
 */
export function buildAvailabilityPollMessage(
  pollId: string,
  journee: number,
  phase: "aller" | "retour",
  championshipType: ChampionshipType,
  date?: string,
  isTeamChampionship?: boolean,
  messageTemplate?: string,
  fridayDate?: string,
  saturdayDate?: string
): {
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    footer?: { text: string };
  }>;
  components: Array<{
    type: number;
    components: Array<{
      type: number;
      style: number;
      label: string;
      custom_id: string;
      emoji?: { name: string };
    }>;
  }>;
} {
  const phaseLabel = phase === "aller" ? "Aller" : "Retour";
  const championshipLabel =
    championshipType === "masculin" ? "Masculin" : "Féminin";
  const dateLabel = date
    ? new Date(date).toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // Formater les dates vendredi et samedi si fournies
  const fridayDateLabel = fridayDate
    ? new Date(fridayDate).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "numeric",
      })
    : null;
  const saturdayDateLabel = saturdayDate
    ? new Date(saturdayDate).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "numeric",
      })
    : null;

  // Construire la description du message
  let description: string;
  if (messageTemplate) {
    // Utiliser le template personnalisé
    description = messageTemplate
      .replace(/\{journee\}/g, journee.toString())
      .replace(/\{phase\}/g, phaseLabel)
      .replace(
        /\{championshipType\}/g,
        isTeamChampionship ? "Par équipes" : championshipLabel
      )
      .replace(/\{date\}/g, dateLabel || "")
      .replace(/\{fridayDate\}/g, fridayDateLabel || "")
      .replace(/\{saturdayDate\}/g, saturdayDateLabel || "");
  } else if (isTeamChampionship && fridayDateLabel && saturdayDateLabel) {
    // Template par défaut pour le championnat par équipes avec dates vendredi/samedi
    description = `Bonjour,\n\nProchaine journée de championnat par équipes le ${fridayDateLabel} (${saturdayDateLabel} pour les rég et équipes filles).\n\nMerci de me dire si vous êtes disponibles!\n\nPour les filles, merci de préciser vendredi et/ou samedi.`;
  } else if (isTeamChampionship) {
    // Template par défaut pour le championnat par équipes sans dates spécifiques
    description = `Bonjour,\n\nProchaine journée de championnat par équipes - Journée ${journee}, Phase ${phaseLabel}.\n\nMerci de me dire si vous êtes disponibles!\n\nPour les filles, merci de préciser vendredi et/ou samedi.`;
  } else {
    // Template par défaut pour le championnat de Paris
    description = `Bonjour,\n\nProchaine journée de championnat de Paris - Journée ${journee}, Phase ${phaseLabel}${
      dateLabel ? `, ${dateLabel}` : ""
    }.\n\nMerci de me dire si vous êtes disponibles!`;
  }

  const embed = {
    title: `📋 Sondage de disponibilité - Journée ${journee}`,
    description,
    color: 0x5865f2, // Couleur Discord bleue
    footer: {
      text: "Vous pouvez modifier votre réponse à tout moment",
    },
  };

  const components: Array<{
    type: number;
    components: Array<{
      type: number;
      style: number;
      label: string;
      custom_id: string;
      emoji?: { name: string };
    }>;
  }> = [];

  if (isTeamChampionship) {
    // Championnat par équipes : un couple de boutons pour tous + boutons vendredi/samedi pour les filles

    // ActionRow 1 : Disponibilité générale (pour tous : hommes et femmes)
    const actionRowGeneral = {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 3, // SUCCESS (vert)
          label: "Disponible",
          custom_id: `availability_${pollId}_available`,
          emoji: { name: "✅" },
        },
        {
          type: 2, // BUTTON
          style: 4, // DANGER (rouge)
          label: "Indisponible",
          custom_id: `availability_${pollId}_unavailable`,
          emoji: { name: "❌" },
        },
      ],
    };

    // ActionRow 2 : Disponibilité Féminine Vendredi (uniquement si fridayDate est fournie)
    const actionRowFemininFriday = fridayDate
      ? {
          type: 1, // ACTION_ROW
          components: [
            {
              type: 2, // BUTTON
              style: 3, // SUCCESS (vert)
              label: `Disponible V (${new Date(fridayDate).toLocaleDateString(
                "fr-FR",
                { day: "numeric", month: "numeric" }
              )})`,
              custom_id: `availability_${pollId}_feminin_friday_available`,
              emoji: { name: "✅" },
            },
            {
              type: 2, // BUTTON
              style: 4, // DANGER (rouge)
              label: `Indisponible V (${new Date(fridayDate).toLocaleDateString(
                "fr-FR",
                { day: "numeric", month: "numeric" }
              )})`,
              custom_id: `availability_${pollId}_feminin_friday_unavailable`,
              emoji: { name: "❌" },
            },
          ],
        }
      : null;

    // ActionRow 3 : Disponibilité Féminine Samedi (uniquement si saturdayDate est fournie)
    const actionRowFemininSaturday = saturdayDate
      ? {
          type: 1, // ACTION_ROW
          components: [
            {
              type: 2, // BUTTON
              style: 3, // SUCCESS (vert)
              label: `Disponible S (${new Date(saturdayDate).toLocaleDateString(
                "fr-FR",
                { day: "numeric", month: "numeric" }
              )})`,
              custom_id: `availability_${pollId}_feminin_saturday_available`,
              emoji: { name: "✅" },
            },
            {
              type: 2, // BUTTON
              style: 4, // DANGER (rouge)
              label: `Indisponible S (${new Date(
                saturdayDate
              ).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "numeric",
              })})`,
              custom_id: `availability_${pollId}_feminin_saturday_unavailable`,
              emoji: { name: "❌" },
            },
          ],
        }
      : null;

    // ActionRow pour le commentaire
    const actionRowComments = {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 2, // SECONDARY (gris)
          label: "Ajouter un commentaire",
          custom_id: `availability_${pollId}_comment`,
          emoji: { name: "💬" },
        },
      ],
    };

    // Ajouter les boutons généraux (pour tous)
    components.push(actionRowGeneral);

    // Ajouter les boutons vendredi/samedi pour les filles (si dates fournies)
    if (actionRowFemininFriday) {
      components.push(actionRowFemininFriday);
    }
    if (actionRowFemininSaturday) {
      components.push(actionRowFemininSaturday);
    }

    components.push(actionRowComments);
  } else {
    // Championnat de Paris : un seul sondage avec les boutons classiques
    // ActionRow 1 : Boutons Disponible et Indisponible
    const actionRow1 = {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 3, // SUCCESS (vert)
          label: "Disponible",
          custom_id: `availability_${pollId}_available`,
          emoji: { name: "✅" },
        },
        {
          type: 2, // BUTTON
          style: 4, // DANGER (rouge)
          label: "Indisponible",
          custom_id: `availability_${pollId}_unavailable`,
          emoji: { name: "❌" },
        },
      ],
    };

    // ActionRow 2 : Bouton pour ajouter un commentaire
    const actionRow2 = {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 2, // SECONDARY (gris)
          label: "Ajouter un commentaire",
          custom_id: `availability_${pollId}_comment`,
          emoji: { name: "💬" },
        },
      ],
    };

    components.push(actionRow1, actionRow2);
  }

  return {
    embeds: [embed],
    components,
  };
}

/**
 * Construit un message Discord mis à jour avec la réponse d'un utilisateur
 * @deprecated Cette fonction n'est plus utilisée, les boutons restent toujours actifs
 */
export function buildUpdatedPollMessage(
  pollId: string,
  journee: number,
  phase: "aller" | "retour",
  championshipType: ChampionshipType,
  date: string | undefined,
  userResponse: {
    available: boolean;
    comment?: string;
    playerId: string;
    playerName: string;
  } | null
): {
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    footer?: { text: string };
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }>;
  components: Array<{
    type: number;
    components: Array<{
      type: number;
      style: number;
      label: string;
      custom_id: string;
      emoji?: { name: string };
      disabled?: boolean;
    }>;
  }>;
} {
  const phaseLabel = phase === "aller" ? "Aller" : "Retour";
  const championshipLabel =
    championshipType === "masculin" ? "Masculin" : "Féminin";
  const dateLabel = date
    ? new Date(date).toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const embed: {
    title: string;
    description: string;
    color: number;
    footer?: { text: string };
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  } = {
    title: `📋 Sondage de disponibilité - Journée ${journee}`,
    description: [
      `**Phase :** ${phaseLabel}`,
      `**Championnat :** ${championshipLabel}`,
      dateLabel ? `**Date :** ${dateLabel}` : null,
      "",
      "Répondez en cliquant sur les boutons ci-dessous :",
    ]
      .filter((line) => line !== null)
      .join("\n"),
    color: 0x5865f2, // Couleur Discord bleue
    footer: {
      text: "Vous pouvez modifier votre réponse à tout moment",
    },
  };

  // Note: On ne peut pas afficher la réponse d'un utilisateur spécifique dans le message partagé
  // La réponse sera affichée dans un message éphémère à l'utilisateur
  // Les boutons restent actifs pour permettre à tous de répondre
  // userResponse n'est pas utilisé car on ne peut pas personnaliser le message par utilisateur
  void userResponse;

  // ActionRow 1 : Boutons Disponible et Indisponible (toujours actifs)
  const actionRow1 = {
    type: 1, // ACTION_ROW
    components: [
      {
        type: 2, // BUTTON
        style: 3, // SUCCESS (vert)
        label: "Disponible",
        custom_id: `availability_${pollId}_available`,
        emoji: { name: "✅" },
      },
      {
        type: 2, // BUTTON
        style: 4, // DANGER (rouge)
        label: "Indisponible",
        custom_id: `availability_${pollId}_unavailable`,
        emoji: { name: "❌" },
      },
    ],
  };

  // ActionRow 2 : Bouton pour ajouter un commentaire + Bouton pour voir/modifier sa réponse
  const actionRow2Components: Array<{
    type: number;
    style: number;
    label: string;
    custom_id: string;
    emoji?: { name: string };
    disabled?: boolean;
  }> = [
    {
      type: 2, // BUTTON
      style: 2, // SECONDARY (gris)
      label: "Ajouter un commentaire",
      custom_id: `availability_${pollId}_comment`,
      emoji: { name: "💬" },
    },
    {
      type: 2, // BUTTON
      style: 1, // PRIMARY (bleu)
      label: "Voir/Modifier ma réponse",
      custom_id: `availability_${pollId}_view`,
      emoji: { name: "👁️" },
    },
  ];

  const actionRow2 = {
    type: 1, // ACTION_ROW
    components: actionRow2Components,
  };

  return {
    embeds: [embed],
    components: [actionRow1, actionRow2],
  };
}
