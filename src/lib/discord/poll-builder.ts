import { ChampionshipType } from "@/types/championship";

/**
 * Construit le message Discord avec embed et boutons pour un sondage de disponibilité
 */
export function buildAvailabilityPollMessage(
  pollId: string,
  journee: number,
  phase: "aller" | "retour",
  championshipType: ChampionshipType,
  date?: string
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

  const embed = {
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

  // ActionRow 1 : Boutons Disponible et Indisponible
  // Type 1 = ACTION_ROW, Type 2 = BUTTON
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

  return {
    embeds: [embed],
    components: [actionRow1, actionRow2],
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

