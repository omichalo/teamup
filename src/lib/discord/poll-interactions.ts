import { NextResponse } from "next/server";
import { AvailabilityServiceAdmin } from "@/lib/services/availability-service-admin";
import { ChampionshipType } from "@/types/championship";
import {
  checkPollActive,
  createSelectOptions,
  findPlayerByDiscordId,
  updateEphemeralMessage,
} from "@/lib/discord/poll-interactions-helpers";
import type {
  DiscordMessageComponentInteraction,
  DiscordModalSubmitInteraction,
} from "@/lib/discord/poll-interactions-types";
export type {
  DiscordMessageComponentInteraction,
  DiscordModalSubmitInteraction,
} from "@/lib/discord/poll-interactions-types";

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
      // Discord n'autorise qu'un seul select menu par ACTION_ROW → 2 lignes distinctes
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
              type: 1, // ACTION_ROW (1 select par ligne max)
              components: [
                {
                  type: 3, // SELECT_MENU
                  custom_id: `availability_${pollId}_women_ven_select`,
                  options: venOptions,
                  placeholder: "Vendredi",
                },
              ],
            },
            {
              type: 1, // ACTION_ROW
              components: [
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
      // Discord n'autorise qu'un seul select menu par ACTION_ROW → 2 lignes distinctes
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
              type: 1, // ACTION_ROW (1 select par ligne max)
              components: [
                {
                  type: 3, // SELECT_MENU
                  custom_id: `availability_${pollId}_women_ven_select`,
                  options: venOptions,
                  placeholder: "Vendredi",
                },
              ],
            },
            {
              type: 1, // ACTION_ROW
              components: [
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

        // Mettre à jour le message éphémère (1 select par ACTION_ROW)
        await updateEphemeralMessage(
          applicationId,
          interactionToken,
          `${statusEmoji} **${dayLabel} : ${statusText}**\n\n📋 **Votre disponibilité :**\nVEN: ${venEmoji} / SAM: ${satEmoji}\n📋 **Licence :** ${player.playerId}${
            playerName ? ` (${playerName})` : ""
          }\n\n💡 Vous pouvez modifier votre réponse en sélectionnant une autre option.`,
          [
            {
              type: 1, // ACTION_ROW
              components: [
                {
                  type: 3,
                  custom_id: `availability_${pollId}_women_ven_select`,
                  options: venOptions,
                  placeholder: "Vendredi",
                },
              ],
            },
            {
              type: 1, // ACTION_ROW
              components: [
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
