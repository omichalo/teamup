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
  _championshipType: ChampionshipType,
  date?: string,
  isTeamChampionship?: boolean,
  messageTemplate?: string,
  fridayDate?: string,
  saturdayDate?: string,
  mention?: string | null
): {
  content?: string;
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

  // Formater la date pour le championnat de Paris : "ce vendredi 24 mai"
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
    // Utiliser le template personnalisé tel quel
    description = messageTemplate;
    
    // Vérifier si la mention est déjà présente dans le messageTemplate
    // Si oui, ne pas l'ajouter à nouveau
    const mentionAlreadyPresent = mention && description.trim().startsWith(mention.trim());
    if (mention && !mentionAlreadyPresent) {
      description = `${mention}\n\n${description}`;
    }
  } else if (isTeamChampionship && fridayDateLabel && saturdayDateLabel) {
    // Template par défaut pour le championnat par équipes avec dates vendredi/samedi
    description = `Bonjour,\n\nProchaine journée de championnat par équipes le ${fridayDateLabel} (${saturdayDateLabel} pour les rég et équipes filles).\n\nMerci de me dire si vous êtes disponibles!\n\nPour les filles, merci de préciser vendredi et/ou samedi.`;
    // Ajouter la mention au début si fournie
    if (mention) {
      description = `${mention}\n\n${description}`;
    }
  } else if (isTeamChampionship) {
    // Template par défaut pour le championnat par équipes sans dates spécifiques
    description = `Bonjour,\n\nProchaine journée de championnat par équipes - Journée ${journee}, Phase ${phaseLabel}.\n\nMerci de me dire si vous êtes disponibles!\n\nPour les filles, merci de préciser vendredi et/ou samedi.`;
    // Ajouter la mention au début si fournie
    if (mention) {
      description = `${mention}\n\n${description}`;
    }
  } else {
    // Template par défaut pour le championnat de Paris (sans phase, avec date formatée)
    description = `Bonjour,\n\nProchaine journée de championnat de Paris - Journée ${journee}${
      parisDateLabel ? ` ${parisDateLabel}` : ""
    }.\n\nMerci de me dire si vous êtes disponibles!`;
    // Ajouter la mention au début si fournie
    if (mention) {
      description = `${mention}\n\n${description}`;
    }
  }

  const embed = {
    title: `📋 Sondage de disponibilité - Journée ${journee}`,
    description,
    color: 0x5865f2, // Couleur Discord bleue
    footer: {
      text: "Vous pouvez modifier votre réponse à tout moment",
    },
  };

  // Message simple avec 3 boutons d'action uniquement
  const components: Array<{
    type: number;
    components: Array<{
      type: number;
      style: number;
      label: string;
      custom_id: string;
      emoji?: { name: string };
    }>;
  }> = [
    {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 1, // PRIMARY (bleu)
          label: "🟦 Répondre",
          custom_id: `availability_${pollId}_respond`,
        },
        {
          type: 2, // BUTTON
          style: 2, // SECONDARY (gris)
          label: "🟨 Modifier ma réponse",
          custom_id: `availability_${pollId}_modify`,
        },
        {
          type: 2, // BUTTON
          style: 2, // SECONDARY (gris)
          label: "📝 Commentaire",
          custom_id: `availability_${pollId}_comment`,
        },
      ],
    },
  ];

  const result: {
    content?: string;
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
  } = {
    embeds: [embed],
    components,
  };

  // Ajouter la mention au début du message si fournie
  if (mention) {
    result.content = mention;
  }

  return result;
}

/**
 * Construit un message Discord mis à jour avec la réponse d'un utilisateur
 * @deprecated Cette fonction n'est plus utilisée et sera supprimée
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
