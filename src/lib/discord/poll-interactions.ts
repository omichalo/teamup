import { NextResponse } from "next/server";
import {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
} from "@/lib/firebase-admin";
import { AvailabilityServiceAdmin } from "@/lib/services/availability-service-admin";
import { DiscordPollServiceAdmin } from "@/lib/services/discord-poll-service-admin";
import { ChampionshipType } from "@/types/championship";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

/**
 * Met à jour un message éphémère Discord via PATCH
 * Gère silencieusement les erreurs de token expiré (404) car la donnée est déjà sauvegardée
 */
async function updateEphemeralMessage(
  applicationId: string,
  interactionToken: string,
  content: string,
  components: Array<{
    type: number;
    components: Array<{
      type: number;
      custom_id: string;
      options?: Array<{
        label: string;
        value: string;
        emoji?: { name: string };
        default?: boolean;
      }>;
      placeholder?: string;
      disabled?: boolean;
    }>;
  }>
): Promise<void> {
  if (!DISCORD_TOKEN) {
    console.warn("[Discord Poll] DISCORD_TOKEN non configuré, impossible de mettre à jour le message");
    return;
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          components,
          flags: 64, // EPHEMERAL
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      // Si le token a expiré (404), ce n'est pas grave car la donnée est déjà sauvegardée
      // L'utilisateur peut toujours voir sa réponse en cliquant sur "Modifier"
      if (response.status === 404) {
        console.warn(
          "[Discord Poll] Token d'interaction expiré (normal si le traitement prend > 3s). La donnée est sauvegardée dans Firestore."
        );
        return;
      }
      console.error("[Discord Poll] Erreur lors de la mise à jour du message:", errorText);
    }
  } catch (error) {
    // Ne pas throw : la donnée est déjà sauvegardée, c'est juste l'affichage qui échoue
    console.warn("[Discord Poll] Erreur réseau lors de la mise à jour du message:", error);
  }
}

/**
 * Interface pour les interactions Discord de type MESSAGE_COMPONENT
 */
export interface DiscordMessageComponentInteraction {
  type: number;
  data: {
    custom_id: string;
    component_type: number;
    values?: string[];
  };
  member?: {
    user: {
      id: string;
      username: string;
    };
  };
  user?: {
    id: string;
    username: string;
  };
  message?: {
    id: string;
  };
  application_id?: string;
  token?: string;
}

/**
 * Interface pour les interactions Discord de type MODAL_SUBMIT
 */
export interface DiscordModalSubmitInteraction {
  type: number;
  data: {
    custom_id: string;
    components: Array<{
      type: number;
      components: Array<{
        type: number;
        custom_id: string;
        value: string;
      }>;
    }>;
  };
  member?: {
    user: {
      id: string;
      username: string;
    };
  };
  user?: {
    id: string;
    username: string;
  };
}

/**
 * Trouve le joueur associé à un ID Discord
 */
async function findPlayerByDiscordId(
  discordUserId: string
): Promise<{ playerId: string; playerData: Record<string, unknown> } | null> {
  await initializeFirebaseAdmin();
  const db = getFirestoreAdmin();
  const playersQuery = await db
    .collection("players")
    .where("discordMentions", "array-contains", discordUserId)
    .limit(1)
    .get();

  if (playersQuery.empty) {
    return null;
  }

  const doc = playersQuery.docs[0];
  return {
    playerId: doc.id,
    playerData: doc.data(),
  };
}

/**
 * Vérifie qu'un poll est actif
 */
async function checkPollActive(pollId: string): Promise<{
  active: boolean;
  poll: Awaited<ReturnType<DiscordPollServiceAdmin["getPoll"]>> | null;
}> {
  await initializeFirebaseAdmin();
  const parts = pollId.split("_");
  if (parts.length < 3) {
    return { active: false, poll: null };
  }

  const phase = parts[0] as "aller" | "retour";
  const journee = parseInt(parts[1], 10);
  if (isNaN(journee)) {
    return { active: false, poll: null };
  }
  const championshipType = parts[2] as ChampionshipType;
  const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

  const pollService = new DiscordPollServiceAdmin();
  const poll = await pollService.getPoll(
    journee,
    phase,
    championshipType,
    idEpreuve
  );

  return { active: poll?.isActive ?? false, poll };
}

/**
 * Type pour les options d'un select menu Discord
 */
type SelectMenuOption = {
  label: string;
  value: string;
  emoji: { name: string };
  default?: boolean;
};

/**
 * Crée les options pour un select menu de disponibilité
 * @param includeUnset - Si true, inclut l'option "Non renseigné"
 * @param currentValue - Valeur actuelle (true = disponible, false = indisponible, undefined = non renseigné)
 * @returns Tableau d'options pour le select menu
 */
function createSelectOptions(
  includeUnset: boolean,
  currentValue?: boolean
): SelectMenuOption[] {
  const options: SelectMenuOption[] = [
    {
      label: "Disponible",
      value: "available",
      emoji: { name: "✅" },
      default: currentValue === true,
    },
    {
      label: "Indisponible",
      value: "unavailable",
      emoji: { name: "❌" },
      default: currentValue === false,
    },
  ];

  if (includeUnset) {
    options.push({
      label: "Non renseigné",
      value: "unset",
      emoji: { name: "❓" },
      default: currentValue === undefined,
    });
  }

  return options;
}

/**
 * Gère l'interaction du bouton "Répondre"
 * Pour le championnat de Paris : affiche un seul select menu (pas de distinction de genre)
 * Pour le championnat par équipes : détecte le genre et affiche les options appropriées
 */
export async function handleRespondButton(
  interaction: DiscordMessageComponentInteraction,
  pollId: string
): Promise<NextResponse> {
  try {
    const discordUserId = interaction.member?.user?.id || interaction.user?.id;

    if (!discordUserId) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    // Vérifier que le poll est actif
    const { active, poll } = await checkPollActive(pollId);
    if (!active || !poll) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Ce sondage n'est plus actif.",
          flags: 64,
        },
      });
    }

    // Trouver le joueur
    const player = await findPlayerByDiscordId(discordUserId);
    if (!player) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "❌ Votre compte Discord n'est pas lié à une licence. Utilisez `/lier_licence <numéro>` pour associer votre compte.",
          flags: 64,
        },
      });
    }

    // Extraire les infos du pollId
    const parts = pollId.split("_");
    const phase = parts[0] as "aller" | "retour";
    const journee = parseInt(parts[1], 10);
    const championshipType = parts[2] as ChampionshipType;
    const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

    // Détecter si c'est le championnat de Paris
    const isParisChampionship = idEpreuve === 15980;

    const availabilityService = new AvailabilityServiceAdmin();
    
    // Pour le championnat de Paris, toujours utiliser "masculin" pour récupérer les disponibilités
    const availabilityChampionshipType = isParisChampionship ? "masculin" : championshipType;
    
    const availability = await availabilityService.getAvailability(
      journee,
      phase,
      availabilityChampionshipType,
      idEpreuve
    );
    const currentResponse = availability?.players[player.playerId];

    // Détecter le genre uniquement pour le championnat par équipes
    let normalizedGender: "M" | "F" | undefined;
    if (!isParisChampionship) {
      const playerGender =
        (player.playerData.sexe as string | undefined) ||
        (player.playerData.gender as string | undefined);
      normalizedGender =
        playerGender === "F" || playerGender === "féminin" ? "F" : "M";
    }

    // Championnat de Paris (hommes et femmes - même sondage)
    if (isParisChampionship) {
      const isAvailable = currentResponse?.available;
      const hasResponse = isAvailable !== undefined;

      const options = createSelectOptions(!hasResponse, isAvailable);

      return NextResponse.json({
        type: 4,
        data: {
          content: "**Votre disponibilité :**\n💡 Sélectionnez votre disponibilité dans le menu déroulant.",
          flags: 64,
          components: [
            {
              type: 1, // ACTION_ROW
              components: [
                {
                  type: 3, // SELECT_MENU
                  custom_id: `availability_${pollId}_select`,
                  options,
                  placeholder: "Sélectionnez votre disponibilité",
                },
              ],
            },
          ],
        },
      });
    }

    // Championnat par équipes
    if (normalizedGender === "M") {
      // Homme : 1 select menu
      const isAvailable = currentResponse?.available;
      const hasResponse = isAvailable !== undefined;

      const options = createSelectOptions(!hasResponse, isAvailable);

      return NextResponse.json({
        type: 4,
        data: {
          content: "**Votre disponibilité :**\n💡 Sélectionnez votre disponibilité dans le menu déroulant.",
          flags: 64,
          components: [
            {
              type: 1, // ACTION_ROW
              components: [
                {
                  type: 3, // SELECT_MENU
                  custom_id: `availability_${pollId}_men_select`,
                  options,
                  placeholder: "Sélectionnez votre disponibilité",
                },
              ],
            },
          ],
        },
      });
    } else {
      // Femme : 2 select menus (vendredi et samedi)
      const venAvailable = currentResponse?.fridayAvailable;
      const satAvailable = currentResponse?.saturdayAvailable;
      const hasVenResponse = venAvailable !== undefined;
      const hasSatResponse = satAvailable !== undefined;

      const venOptions = createSelectOptions(!hasVenResponse, venAvailable);
      const satOptions = createSelectOptions(!hasSatResponse, satAvailable);

      return NextResponse.json({
        type: 4,
        data: {
          content: "**Votre disponibilité (vendredi et/ou samedi) :**\n💡 Sélectionnez votre disponibilité pour chaque jour dans les menus déroulants.",
          flags: 64,
          components: [
            {
              type: 1, // ACTION_ROW
              components: [
                {
                  type: 3, // SELECT_MENU
                  custom_id: `availability_${pollId}_women_ven_select`,
                  options: venOptions,
                  placeholder: "Vendredi",
                },
                {
                  type: 3, // SELECT_MENU
                  custom_id: `availability_${pollId}_women_sat_select`,
                  options: satOptions,
                  placeholder: "Samedi",
                },
              ],
            },
          ],
        },
      });
    }
  } catch (error) {
    console.error("[Discord Poll] Erreur dans handleRespondButton:", error);
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Erreur lors du traitement. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}

/**
 * Gère l'interaction du bouton "Modifier ma réponse"
 */
export async function handleModifyButton(
  interaction: DiscordMessageComponentInteraction,
  pollId: string
): Promise<NextResponse> {
  try {
    const discordUserId = interaction.member?.user?.id || interaction.user?.id;

    if (!discordUserId) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    // Vérifier que le poll est actif
    const { active, poll } = await checkPollActive(pollId);
    if (!active || !poll) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Ce sondage n'est plus actif.",
          flags: 64,
        },
      });
    }

    // Trouver le joueur
    const player = await findPlayerByDiscordId(discordUserId);
    if (!player) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "❌ Votre compte Discord n'est pas lié à une licence. Utilisez `/lier_licence <numéro>` pour associer votre compte.",
          flags: 64,
        },
      });
    }

    // Charger la réponse actuelle
    const parts = pollId.split("_");
    const phase = parts[0] as "aller" | "retour";
    const journee = parseInt(parts[1], 10);
    const championshipType = parts[2] as ChampionshipType;
    const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

    // Détecter si c'est le championnat de Paris
    const isParisChampionship = idEpreuve === 15980;

    const availabilityService = new AvailabilityServiceAdmin();
    
    // Pour le championnat de Paris, toujours utiliser "masculin" pour récupérer les disponibilités
    const availabilityChampionshipType = isParisChampionship ? "masculin" : championshipType;
    
    const availability = await availabilityService.getAvailability(
      journee,
      phase,
      availabilityChampionshipType,
      idEpreuve
    );

    const currentResponse = availability?.players[player.playerId];

    // Détecter le genre uniquement pour le championnat par équipes
    let normalizedGender: "M" | "F" | undefined;
    if (!isParisChampionship) {
      const playerGender =
        (player.playerData.sexe as string | undefined) ||
        (player.playerData.gender as string | undefined);
      normalizedGender =
        playerGender === "F" || playerGender === "féminin" ? "F" : "M";
    }

    let currentStatusText = "";
    if (isParisChampionship) {
      // Championnat de Paris : logique simple sans distinction de genre
      if (currentResponse?.available === true) {
        currentStatusText = "✅ **Disponible**";
      } else if (currentResponse?.available === false) {
        currentStatusText = "❌ **Indisponible**";
      } else {
        currentStatusText = "❓ **Non renseigné**";
      }
    } else if (normalizedGender === "M") {
      // Championnat par équipes - Hommes
      if (currentResponse?.available === true) {
        currentStatusText = "✅ **Disponible**";
      } else if (currentResponse?.available === false) {
        currentStatusText = "❌ **Indisponible**";
      } else {
        currentStatusText = "❓ **Non renseigné**";
      }
    } else {
      // Championnat par équipes - Femmes
      const venStatus =
        currentResponse?.fridayAvailable === true
          ? "✅"
          : currentResponse?.fridayAvailable === false
          ? "❌"
          : "❓";
      const satStatus =
        currentResponse?.saturdayAvailable === true
          ? "✅"
          : currentResponse?.saturdayAvailable === false
          ? "❌"
          : "❓";
      currentStatusText = `VEN: ${venStatus} / SAM: ${satStatus}`;
    }

    const commentText = currentResponse?.comment
      ? `\n💬 **Commentaire :** ${currentResponse.comment}`
      : "";

    // Championnat de Paris (hommes et femmes - même sondage)
    if (isParisChampionship) {
      const isAvailable = currentResponse?.available;
      const hasResponse = isAvailable !== undefined;

      const options = createSelectOptions(!hasResponse, isAvailable);

    return NextResponse.json({
        type: 4,
      data: {
          content: `📋 **Votre réponse actuelle :**\n${currentStatusText}${commentText}\n\n**Modifier :**\n💡 Sélectionnez votre disponibilité dans le menu déroulant.`,
          flags: 64,
        components: [
          {
              type: 1,
            components: [
              {
                  type: 3, // SELECT_MENU
                  custom_id: `availability_${pollId}_select`,
                  options,
                  placeholder: "Sélectionnez votre disponibilité",
                },
              ],
            },
          ],
        },
      });
    }

    // Championnat par équipes
    if (normalizedGender === "M") {
      // Homme : 1 select menu
      const isAvailable = currentResponse?.available;
      const hasResponse = isAvailable !== undefined;

      const options = createSelectOptions(!hasResponse, isAvailable);

    return NextResponse.json({
        type: 4,
      data: {
          content: `📋 **Votre réponse actuelle :**\n${currentStatusText}${commentText}\n\n**Modifier :**\n💡 Sélectionnez votre disponibilité dans le menu déroulant.`,
          flags: 64,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3, // SELECT_MENU
                  custom_id: `availability_${pollId}_men_select`,
                  options,
                  placeholder: "Sélectionnez votre disponibilité",
              },
            ],
          },
        ],
      },
    });
    } else {
      // Femme : 2 select menus (vendredi et samedi)
      const venAvailable = currentResponse?.fridayAvailable;
      const satAvailable = currentResponse?.saturdayAvailable;
      const hasVenResponse = venAvailable !== undefined;
      const hasSatResponse = satAvailable !== undefined;

      const venOptions = createSelectOptions(!hasVenResponse, venAvailable);
      const satOptions = createSelectOptions(!hasSatResponse, satAvailable);

      return NextResponse.json({
        type: 4,
        data: {
          content: `📋 **Votre réponse actuelle :**\n${currentStatusText}${commentText}\n\n**Modifier :**\n💡 Sélectionnez votre disponibilité pour chaque jour dans les menus déroulants.`,
          flags: 64,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3, // SELECT_MENU
                  custom_id: `availability_${pollId}_women_ven_select`,
                  options: venOptions,
                  placeholder: "Vendredi",
                },
                {
                  type: 3, // SELECT_MENU
                  custom_id: `availability_${pollId}_women_sat_select`,
                  options: satOptions,
                  placeholder: "Samedi",
                },
              ],
            },
          ],
        },
      });
    }
  } catch (error) {
    console.error("[Discord Poll] Erreur dans handleModifyButton:", error);
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Erreur lors du traitement. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}

/**
 * Gère la sélection de disponibilité pour le championnat de Paris (mixte, pas de distinction de genre)
 * Toutes les réponses sont sauvegardées dans "masculin"
 */
export async function handleParisSelect(
  interaction: DiscordMessageComponentInteraction,
  pollId: string
): Promise<NextResponse> {
  try {
    const discordUserId = interaction.member?.user?.id || interaction.user?.id;

    if (!discordUserId) {
      return NextResponse.json({
        type: 6, // DEFERRED_UPDATE_MESSAGE
      });
    }

    const applicationId = interaction.application_id;
    const interactionToken = interaction.token;

    if (!applicationId || !interactionToken) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de mettre à jour le message.",
          flags: 64,
        },
      });
    }

    // Répondre IMMÉDIATEMENT avec DEFERRED_UPDATE_MESSAGE (avant toute opération asynchrone)
    // Cela évite que le token expire
    const deferredResponse = NextResponse.json({
      type: 6, // DEFERRED_UPDATE_MESSAGE
    });

    // Continuer le traitement en arrière-plan (ne pas await ici, la réponse est déjà envoyée)
    Promise.resolve().then(async () => {
      try {
        // Vérifier que le poll est actif
        const { active, poll } = await checkPollActive(pollId);
        if (!active || !poll) {
          await updateEphemeralMessage(
            applicationId,
            interactionToken,
            "❌ Ce sondage est fermé.",
            []
          );
          return;
        }

        // Trouver le joueur
        const player = await findPlayerByDiscordId(discordUserId);
        if (!player) {
          await updateEphemeralMessage(
            applicationId,
            interactionToken,
            "❌ Votre compte Discord n'est pas lié à une licence. Utilisez `/lier_licence <numéro>` pour associer votre compte.",
            []
          );
          return;
        }

        // Extraire les infos du pollId
        const parts = pollId.split("_");
        const phase = parts[0] as "aller" | "retour";
        const journee = parseInt(parts[1], 10);
        const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

        // Récupérer la valeur sélectionnée
        const selectedValue = interaction.data.values?.[0];
        if (!selectedValue) {
          await updateEphemeralMessage(
            applicationId,
            interactionToken,
            "❌ Valeur sélectionnée invalide.",
            []
          );
          return;
        }

        // Si "unset" est sélectionné, ne rien sauvegarder (rester dans l'état non renseigné)
        if (selectedValue === "unset") {
          const options = createSelectOptions(true, undefined); // Inclure "Non renseigné"
          
          await updateEphemeralMessage(
            applicationId,
            interactionToken,
            "ℹ️ Vous n'avez pas encore répondu. Sélectionnez 'Disponible' ou 'Indisponible' pour enregistrer votre réponse.",
            [
              {
                type: 1,
                components: [
                  {
                    type: 3,
                    custom_id: `availability_${pollId}_select`,
                    options,
                    placeholder: "Sélectionnez votre disponibilité",
                  },
                ],
              },
            ]
          );
          return;
        }

        if (selectedValue !== "available" && selectedValue !== "unavailable") {
          await updateEphemeralMessage(
            applicationId,
            interactionToken,
            "❌ Valeur sélectionnée invalide.",
            []
          );
          return;
        }

        // Convertir la valeur en boolean
        const isAvailable = selectedValue === "available";

        // Pour le championnat de Paris, toujours sauvegarder dans "masculin" (pas de distinction de genre)
        const targetChampionshipType: ChampionshipType = "masculin";

        const availabilityService = new AvailabilityServiceAdmin();
        await availabilityService.updatePlayerAvailability(
          journee,
          phase,
          targetChampionshipType,
          player.playerId,
          { available: isAvailable },
          idEpreuve
        );

        const playerName = `${player.playerData.prenom || ""} ${
          player.playerData.nom || ""
        }`.trim();

        const statusEmoji = isAvailable ? "✅" : "❌";
        const statusText = isAvailable ? "disponible" : "indisponible";

        // Créer les options du select menu (sans "Non renseigné" car une réponse existe maintenant)
        const options = createSelectOptions(false, isAvailable);

        // Mettre à jour le message éphémère (si le token n'a pas expiré)
        // Si le token a expiré, ce n'est pas grave : la donnée est sauvegardée dans Firestore
        // L'utilisateur peut toujours voir sa réponse en cliquant sur "Modifier"
        await updateEphemeralMessage(
          applicationId,
          interactionToken,
          `${statusEmoji} **Votre disponibilité a été enregistrée : ${statusText}**\n📋 **Licence :** ${player.playerId}${
            playerName ? ` (${playerName})` : ""
          }\n\n💡 Vous pouvez modifier votre réponse en sélectionnant une autre option.`,
          [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: `availability_${pollId}_select`,
                  options,
                  placeholder: "Sélectionnez votre disponibilité",
                },
              ],
            },
          ]
        );
      } catch (error) {
        console.error("[Discord Poll] Erreur dans le traitement en arrière-plan de handleParisSelect:", error);
      }
    });

    return deferredResponse;
  } catch (error) {
    console.error("[Discord Poll] Erreur dans handleParisSelect:", error);
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Erreur lors de l'enregistrement. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}


/**
 * Gère la sélection de disponibilité pour les hommes en championnat par équipes
 */
export async function handleMenSelect(
  interaction: DiscordMessageComponentInteraction,
  pollId: string
): Promise<NextResponse> {
  try {
    const discordUserId = interaction.member?.user?.id || interaction.user?.id;

    if (!discordUserId) {
      return NextResponse.json({
        type: 6, // DEFERRED_UPDATE_MESSAGE
      });
    }

    const applicationId = interaction.application_id;
    const interactionToken = interaction.token;

    if (!applicationId || !interactionToken) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de mettre à jour le message.",
          flags: 64,
        },
      });
    }

    // Répondre IMMÉDIATEMENT avec DEFERRED_UPDATE_MESSAGE (avant toute opération asynchrone)
    const deferredResponse = NextResponse.json({
      type: 6, // DEFERRED_UPDATE_MESSAGE
    });

    // Continuer le traitement en arrière-plan
    Promise.resolve().then(async () => {
      try {
        // Vérifier que le poll est actif
        const { active, poll } = await checkPollActive(pollId);
        if (!active || !poll) {
          await updateEphemeralMessage(
            applicationId,
            interactionToken,
            "❌ Ce sondage est fermé.",
            []
          );
          return;
        }

        // Trouver le joueur
        const player = await findPlayerByDiscordId(discordUserId);
        if (!player) {
          await updateEphemeralMessage(
            applicationId,
            interactionToken,
            "❌ Votre compte Discord n'est pas lié à une licence. Utilisez `/lier_licence <numéro>` pour associer votre compte.",
            []
          );
          return;
        }

        // Extraire les infos du pollId
        const parts = pollId.split("_");
        const phase = parts[0] as "aller" | "retour";
        const journee = parseInt(parts[1], 10);
        const championshipType = parts[2] as ChampionshipType;
        const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

        // Récupérer la valeur sélectionnée
        const selectedValue = interaction.data.values?.[0];
        if (!selectedValue || (selectedValue !== "available" && selectedValue !== "unavailable")) {
          await updateEphemeralMessage(
            applicationId,
            interactionToken,
            "❌ Valeur sélectionnée invalide.",
            []
          );
          return;
        }

        // Convertir la valeur en boolean
        const isAvailable = selectedValue === "available";

        // Sauvegarder la réponse
        const availabilityService = new AvailabilityServiceAdmin();
        await availabilityService.updatePlayerAvailability(
          journee,
          phase,
          championshipType,
          player.playerId,
          { available: isAvailable },
          idEpreuve
        );

        const playerName = `${player.playerData.prenom || ""} ${
          player.playerData.nom || ""
        }`.trim();

        const statusEmoji = isAvailable ? "✅" : "❌";
        const statusText = isAvailable ? "disponible" : "indisponible";

        // Créer les options du select menu (sans "Non renseigné" car une réponse existe maintenant)
        const options = createSelectOptions(false, isAvailable);

        // Mettre à jour le message éphémère
        await updateEphemeralMessage(
          applicationId,
          interactionToken,
          `${statusEmoji} **Votre disponibilité a été enregistrée : ${statusText}**\n📋 **Licence :** ${player.playerId}${
            playerName ? ` (${playerName})` : ""
          }\n\n💡 Vous pouvez modifier votre réponse en sélectionnant une autre option.`,
          [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: `availability_${pollId}_men_select`,
                  options,
                  placeholder: "Sélectionnez votre disponibilité",
                },
              ],
            },
          ]
        );
      } catch (error) {
        console.error("[Discord Poll] Erreur dans le traitement en arrière-plan de handleMenSelect:", error);
      }
    });

    return deferredResponse;
  } catch (error) {
    console.error("[Discord Poll] Erreur dans handleMenSelect:", error);
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Erreur lors de l'enregistrement. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}

/**
 * Gère la sélection de disponibilité pour les femmes en championnat par équipes
 */
export async function handleWomenSelect(
  interaction: DiscordMessageComponentInteraction,
  pollId: string,
  day: "ven" | "sat"
): Promise<NextResponse> {
  try {
    const discordUserId = interaction.member?.user?.id || interaction.user?.id;

    if (!discordUserId) {
      return NextResponse.json({
        type: 6, // DEFERRED_UPDATE_MESSAGE
      });
    }

    const applicationId = interaction.application_id;
    const interactionToken = interaction.token;

    if (!applicationId || !interactionToken) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de mettre à jour le message.",
          flags: 64,
        },
      });
    }

    // Répondre IMMÉDIATEMENT avec DEFERRED_UPDATE_MESSAGE (avant toute opération asynchrone)
    const deferredResponse = NextResponse.json({
      type: 6, // DEFERRED_UPDATE_MESSAGE
    });

    // Continuer le traitement en arrière-plan
    Promise.resolve().then(async () => {
      try {
        // Vérifier que le poll est actif
        const { active, poll } = await checkPollActive(pollId);
        if (!active || !poll) {
          await updateEphemeralMessage(
            applicationId,
            interactionToken,
            "❌ Ce sondage est fermé.",
            []
          );
          return;
        }

        // Trouver le joueur
        const player = await findPlayerByDiscordId(discordUserId);
        if (!player) {
          await updateEphemeralMessage(
            applicationId,
            interactionToken,
            "❌ Votre compte Discord n'est pas lié à une licence. Utilisez `/lier_licence <numéro>` pour associer votre compte.",
            []
          );
          return;
        }

        // Extraire les infos du pollId
        const parts = pollId.split("_");
        const phase = parts[0] as "aller" | "retour";
        const journee = parseInt(parts[1], 10);
        const championshipType = parts[2] as ChampionshipType;
        const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

        // Récupérer la valeur sélectionnée
        const selectedValue = interaction.data.values?.[0];
        if (!selectedValue || (selectedValue !== "available" && selectedValue !== "unavailable")) {
          await updateEphemeralMessage(
            applicationId,
            interactionToken,
            "❌ Valeur sélectionnée invalide.",
            []
          );
          return;
        }

        // Convertir la valeur en boolean
        const isAvailable = selectedValue === "available";

        // Récupérer l'état actuel pour les deux jours
        const availabilityService = new AvailabilityServiceAdmin();
        const availability = await availabilityService.getAvailability(
          journee,
          phase,
          championshipType,
          idEpreuve
        );
        const currentResponse = availability?.players[player.playerId];

        let fridayAvailable: boolean | undefined = currentResponse?.fridayAvailable;
        let saturdayAvailable: boolean | undefined = currentResponse?.saturdayAvailable;

        // Mettre à jour le jour sélectionné
        if (day === "ven") {
          fridayAvailable = isAvailable;
        } else {
          saturdayAvailable = isAvailable;
        }

        // Pour le championnat par équipes, les femmes doivent sauvegarder :
        // - Vendredi disponible → disponible pour le championnat masculin
        // - Samedi disponible → disponible pour le championnat féminin
        const masculineData: {
          available?: boolean;
          fridayAvailable?: boolean;
          saturdayAvailable?: boolean;
        } = {};
        const feminineData: {
          available?: boolean;
          fridayAvailable?: boolean;
          saturdayAvailable?: boolean;
        } = {};

        // Vendredi → championnat masculin
        if (fridayAvailable !== undefined) {
          masculineData.available = fridayAvailable;
          masculineData.fridayAvailable = fridayAvailable;
        }

        // Samedi → championnat féminin
        if (saturdayAvailable !== undefined) {
          feminineData.available = saturdayAvailable;
          feminineData.saturdayAvailable = saturdayAvailable;
        }

        // Sauvegarder dans les deux championnats
        await Promise.all([
          availabilityService.updatePlayerAvailability(
            journee,
            phase,
            "masculin",
            player.playerId,
            masculineData,
            idEpreuve
          ),
          availabilityService.updatePlayerAvailability(
            journee,
            phase,
            "feminin",
            player.playerId,
            feminineData,
            idEpreuve
          ),
        ]);

        const playerName = `${player.playerData.prenom || ""} ${
          player.playerData.nom || ""
        }`.trim();

        const dayLabel = day === "ven" ? "Vendredi" : "Samedi";
        const statusEmoji = isAvailable ? "✅" : "❌";
        const statusText = isAvailable ? "disponible" : "indisponible";

        const venEmoji = fridayAvailable === true ? "✅" : fridayAvailable === false ? "❌" : "❓";
        const satEmoji = saturdayAvailable === true ? "✅" : saturdayAvailable === false ? "❌" : "❓";

        // Créer les options pour chaque select menu (sans "Non renseigné" car une réponse existe maintenant)
        const venOptions = createSelectOptions(false, fridayAvailable);
        const satOptions = createSelectOptions(false, saturdayAvailable);

        // Mettre à jour le message éphémère
        await updateEphemeralMessage(
          applicationId,
          interactionToken,
          `${statusEmoji} **${dayLabel} : ${statusText}**\n\n📋 **Votre disponibilité :**\nVEN: ${venEmoji} / SAM: ${satEmoji}\n📋 **Licence :** ${player.playerId}${
            playerName ? ` (${playerName})` : ""
          }\n\n💡 Vous pouvez modifier votre réponse en sélectionnant une autre option.`,
          [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: `availability_${pollId}_women_ven_select`,
                  options: venOptions,
                  placeholder: "Vendredi",
                },
                {
                  type: 3,
                  custom_id: `availability_${pollId}_women_sat_select`,
                  options: satOptions,
                  placeholder: "Samedi",
                },
              ],
            },
          ]
        );
      } catch (error) {
        console.error("[Discord Poll] Erreur dans le traitement en arrière-plan de handleWomenSelect:", error);
      }
    });

    return deferredResponse;
  } catch (error) {
    console.error("[Discord Poll] Erreur dans handleWomenSelect:", error);
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Erreur lors de l'enregistrement. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}


/**
 * Gère l'interaction du bouton "Commentaire"
 */
export async function handleCommentButton(
  interaction: DiscordMessageComponentInteraction,
  pollId: string
): Promise<NextResponse> {
  try {
    const discordUserId = interaction.member?.user?.id || interaction.user?.id;

    if (!discordUserId) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    // Vérifier que le poll est actif
    const { active } = await checkPollActive(pollId);
    if (!active) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Ce sondage n'est plus actif.",
          flags: 64,
        },
      });
    }

    // Vérifier si l'utilisateur a une licence associée
    const player = await findPlayerByDiscordId(discordUserId);

    if (!player) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "❌ Votre compte Discord n'est pas lié à une licence. Utilisez `/lier_licence <numéro>` pour associer votre compte.",
          flags: 64,
        },
      });
    }

    // Ouvrir le modal de commentaire
    const modalCustomId = `availability_${pollId}_comment_modal`;

    return NextResponse.json({
      type: 9, // MODAL
      data: {
        title: "Ajouter un commentaire",
        custom_id: modalCustomId,
        components: [
          {
            type: 1, // ACTION_ROW
            components: [
              {
                type: 4, // TEXT_INPUT
                custom_id: "comment",
                label: "Commentaire (optionnel)",
                style: 2, // PARAGRAPH
                placeholder: "Expliquez votre disponibilité...",
                required: false,
                max_length: 500,
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error("[Discord Poll] Erreur dans handleCommentButton:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content:
          "❌ Erreur lors de l'ouverture du formulaire. Veuillez réessayer.",
            flags: 64,
          },
        });
  }
}



/**
 * Gère la soumission d'un modal (commentaire uniquement)
 */
export async function handleModalSubmit(
  interaction: DiscordModalSubmitInteraction,
  pollId: string
): Promise<NextResponse> {
  try {
    const discordUserId = interaction.member?.user?.id || interaction.user?.id;

    if (!discordUserId) {
        return NextResponse.json({
          type: 4,
          data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
            flags: 64,
          },
        });
      }

    const customId = interaction.data.custom_id;

    // Vérifier que c'est un modal de commentaire
    if (!customId.endsWith("_comment_modal")) {
        return NextResponse.json({
          type: 4,
          data: {
          content: "❌ Modal non reconnu.",
            flags: 64,
          },
        });
      }

    // Vérifier que le poll est actif
    const { active } = await checkPollActive(pollId);
    if (!active) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Ce sondage n'est plus actif.",
          flags: 64,
        },
      });
    }

      const commentInput = interaction.data.components[0]?.components[0];
      const comment = commentInput?.value?.trim();

      // Trouver le joueur
      const player = await findPlayerByDiscordId(discordUserId);
      if (!player) {
        return NextResponse.json({
          type: 4,
          data: {
            content:
            "❌ Votre compte Discord n'est pas lié à une licence. Utilisez `/lier_licence <numéro>` pour associer votre compte.",
            flags: 64,
          },
        });
      }

      // Récupérer les informations du pollId
      const pollParts = pollId.split("_");
      const phase = pollParts[0] as "aller" | "retour";
      const journee = parseInt(pollParts[1], 10);
      const idEpreuve =
        pollParts.length > 3 ? parseInt(pollParts[3], 10) : undefined;

      // Détecter si c'est le championnat de Paris
      const isParisChampionship = idEpreuve === 15980;

      const availabilityService = new AvailabilityServiceAdmin();

      if (isParisChampionship) {
        // Championnat de Paris : sauvegarder uniquement dans "masculin" (pas de distinction de genre)
        const masculinAvailability = await availabilityService.getAvailability(
          journee,
          phase,
          "masculin",
          idEpreuve
        );

        const masculinResponse = masculinAvailability?.players[player.playerId];

        const masculinData: {
          available?: boolean;
          fridayAvailable?: boolean;
          saturdayAvailable?: boolean;
          comment?: string;
        } = {
          ...masculinResponse,
        };
        if (comment) {
          masculinData.comment = comment;
        } else {
          delete masculinData.comment;
        }

        await availabilityService.updatePlayerAvailability(
          journee,
          phase,
          "masculin",
          player.playerId,
          masculinData,
          idEpreuve
        );
      } else {
        // Championnat par équipes : sauvegarder le commentaire pour les deux catégories (masculin et féminin)
        const [masculinAvailability, femininAvailability] = await Promise.all([
          availabilityService.getAvailability(
            journee,
            phase,
            "masculin",
            idEpreuve
          ),
          availabilityService.getAvailability(
            journee,
            phase,
            "feminin",
            idEpreuve
          ),
        ]);

        const masculinResponse = masculinAvailability?.players[player.playerId];
        const femininResponse = femininAvailability?.players[player.playerId];

        // Mettre à jour les deux catégories avec le même commentaire
        const masculinData: {
          available?: boolean;
          fridayAvailable?: boolean;
          saturdayAvailable?: boolean;
          comment?: string;
        } = {
          ...masculinResponse,
        };
        if (comment) {
          masculinData.comment = comment;
        } else {
          delete masculinData.comment;
        }

        const femininData: {
          available?: boolean;
          fridayAvailable?: boolean;
          saturdayAvailable?: boolean;
          comment?: string;
        } = {
          ...femininResponse,
        };
        if (comment) {
          femininData.comment = comment;
        } else {
          delete femininData.comment;
        }

        await Promise.all([
          availabilityService.updatePlayerAvailability(
            journee,
            phase,
            "masculin",
            player.playerId,
            masculinData,
            idEpreuve
          ),
          availabilityService.updatePlayerAvailability(
            journee,
            phase,
            "feminin",
            player.playerId,
            femininData,
            idEpreuve
          ),
        ]);
      }

      return NextResponse.json({
        type: 4,
        data: {
          content: comment
            ? `💬 Votre commentaire a été enregistré : "${comment}"`
            : "💬 Commentaire supprimé.",
        flags: 64,
      },
    });
  } catch (error) {
    console.error("[Discord Poll] Erreur dans handleModalSubmit:", error);
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Erreur lors du traitement. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}
