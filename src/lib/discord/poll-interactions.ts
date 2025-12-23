import { NextResponse } from "next/server";
import { getFirestoreAdmin, initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { AvailabilityServiceAdmin } from "@/lib/services/availability-service-admin";
import { DiscordPollServiceAdmin } from "@/lib/services/discord-poll-service-admin";
import { ChampionshipType } from "@/types/championship";

/**
 * Interface pour les interactions Discord de type MESSAGE_COMPONENT
 */
export interface DiscordMessageComponentInteraction {
  type: number;
  data: {
    custom_id: string;
    component_type: number;
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
 * Gère l'interaction d'un bouton de disponibilité (Disponible/Indisponible)
 */
export async function handleAvailabilityButton(
  interaction: DiscordMessageComponentInteraction,
  pollId: string,
  responseType: "available" | "unavailable"
): Promise<NextResponse> {
  try {
    console.log("[Discord Poll Interactions] handleAvailabilityButton", {
      pollId,
      responseType,
      customId: interaction.data?.custom_id,
    });

    const discordUserId =
      interaction.member?.user?.id || interaction.user?.id;

    if (!discordUserId) {
      console.error("[Discord Poll Interactions] Pas d'ID Discord dans l'interaction");
      return NextResponse.json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64, // EPHEMERAL
        },
      });
    }

    console.log("[Discord Poll Interactions] Discord User ID:", discordUserId);

    // Vérifier si l'utilisateur a une licence associée
    const player = await findPlayerByDiscordId(discordUserId);
    console.log("[Discord Poll Interactions] Player found:", player ? "yes" : "no");

    if (!player) {
      // Pas de licence associée, demander via modal
      return NextResponse.json({
        type: 9, // MODAL
        data: {
          title: "Associer votre licence",
          custom_id: `availability_${pollId}_license_modal_${responseType}`,
          components: [
            {
              type: 1, // ACTION_ROW
              components: [
                {
                  type: 4, // TEXT_INPUT
                  custom_id: "license_number",
                  label: "Numéro de licence",
                  style: 1, // SHORT
                  placeholder: "123456",
                  required: true,
                  min_length: 1,
                  max_length: 20,
                },
              ],
            },
          ],
        },
      });
    }

    // L'utilisateur a une licence, traiter la réponse
    return await processAvailabilityResponse(
      pollId,
      player.playerId,
      responseType === "available",
      undefined,
      discordUserId,
      player.playerData
    );
  } catch (error) {
    console.error(
      "[Discord Poll Interactions] Erreur dans handleAvailabilityButton:",
      error
    );
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Erreur lors du traitement de votre réponse. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}

/**
 * Gère l'interaction du bouton "Ajouter un commentaire"
 */
export async function handleCommentButton(
  interaction: DiscordMessageComponentInteraction,
  pollId: string
): Promise<NextResponse> {
  try {
    const discordUserId =
      interaction.member?.user?.id || interaction.user?.id;

    if (!discordUserId) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    // Vérifier si l'utilisateur a une licence associée
    const player = await findPlayerByDiscordId(discordUserId);

    if (!player) {
      // Pas de licence, demander d'abord la licence
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "❌ Vous devez d'abord associer votre licence Discord. Répondez au sondage avec Disponible ou Indisponible pour commencer.",
          flags: 64,
        },
      });
    }

    // Ouvrir le modal de commentaire
    return NextResponse.json({
      type: 9, // MODAL
      data: {
        title: "Ajouter un commentaire",
        custom_id: `availability_${pollId}_comment_modal`,
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
    console.error(
      "[Discord Poll Interactions] Erreur dans handleCommentButton:",
      error
    );
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Erreur lors de l'ouverture du formulaire. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}

/**
 * Gère l'interaction du bouton "Voir/Modifier ma réponse"
 */
export async function handleViewButton(
  interaction: DiscordMessageComponentInteraction,
  pollId: string
): Promise<NextResponse> {
  try {
    const discordUserId =
      interaction.member?.user?.id || interaction.user?.id;

    if (!discordUserId) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    await initializeFirebaseAdmin();

    // Extraire les informations du pollId
    const parts = pollId.split("_");
    if (parts.length < 3) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Format de pollId invalide.",
          flags: 64,
        },
      });
    }

    const phase = parts[0] as "aller" | "retour";
    const journee = parseInt(parts[1], 10);
    const championshipType = parts[2] as ChampionshipType;
    const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

    // Récupérer le sondage
    const pollService = new DiscordPollServiceAdmin();
    const poll = await pollService.getPoll(
      journee,
      phase,
      championshipType,
      idEpreuve
    );

    if (!poll || !poll.isActive) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Ce sondage n'est plus actif.",
          flags: 64,
        },
      });
    }

    // Récupérer la réponse actuelle de l'utilisateur
    const player = await findPlayerByDiscordId(discordUserId);
    if (!player) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Vous devez d'abord associer votre licence.",
          flags: 64,
        },
      });
    }

    const availabilityService = new AvailabilityServiceAdmin();
    const availability = await availabilityService.getAvailability(
      journee,
      phase,
      championshipType,
      idEpreuve
    );

    const currentResponse = availability?.players[player.playerId];
    const playerName = `${player.playerData.prenom || ""} ${player.playerData.nom || ""}`.trim();

    let content: string;
    if (currentResponse && currentResponse.available !== undefined) {
      const statusText = currentResponse.available ? "✅ **Disponible**" : "❌ **Indisponible**";
      const commentText = currentResponse.comment ? `\n💬 **Commentaire :** ${currentResponse.comment}` : "";
      const licenseText = `\n📋 **Licence :** ${player.playerId}${playerName ? ` (${playerName})` : ""}`;
      content = `📋 **Votre réponse actuelle :**\n${statusText}${commentText}${licenseText}\n\n💡 Cliquez sur Disponible ou Indisponible pour modifier votre réponse.`;
    } else {
      content = "❌ Vous n'avez pas encore répondu à ce sondage.\n\n💡 Cliquez sur Disponible ou Indisponible pour répondre.";
    }

    return NextResponse.json({
      type: 4,
      data: {
        content,
        flags: 64,
      },
    });
  } catch (error) {
    console.error(
      "[Discord Poll Interactions] Erreur dans handleViewButton:",
      error
    );
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Erreur lors de la récupération de votre réponse. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}

/**
 * Gère l'interaction du bouton "Modifier ma réponse" (déprécié, utilisez handleViewButton)
 */
export async function handleModifyButton(
  interaction: DiscordMessageComponentInteraction,
  pollId: string
): Promise<NextResponse> {
  return handleViewButton(interaction, pollId);
}

/**
 * Traite une réponse de disponibilité et la sauvegarde
 */
async function processAvailabilityResponse(
  pollId: string,
  playerId: string,
  available: boolean,
  comment: string | undefined,
  _discordUserId: string,
  playerData: Record<string, unknown>
): Promise<NextResponse> {
  try {
    await initializeFirebaseAdmin();
    // Extraire les informations du pollId : ${phase}_${journee}_${championshipType}_${idEpreuve}
    const parts = pollId.split("_");
    if (parts.length < 3) {
      throw new Error("Format de pollId invalide");
    }

    const phase = parts[0] as "aller" | "retour";
    const journee = parseInt(parts[1], 10);
    const championshipType = parts[2] as ChampionshipType;
    const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

    // Vérifier que le sondage existe et est actif
    const pollService = new DiscordPollServiceAdmin();
    const poll = await pollService.getPoll(
      journee,
      phase,
      championshipType,
      idEpreuve
    );

    if (!poll) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Sondage introuvable.",
          flags: 64,
        },
      });
    }

    if (!poll.isActive) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Ce sondage est fermé.",
          flags: 64,
        },
      });
    }

    // Sauvegarder la disponibilité
    const availabilityService = new AvailabilityServiceAdmin();
    const availabilityData: {
      available: boolean;
      comment?: string;
    } = {
      available,
    };
    if (comment?.trim()) {
      availabilityData.comment = comment.trim();
    }
    await availabilityService.updatePlayerAvailability(
      journee,
      phase,
      championshipType,
      playerId,
      availabilityData,
      idEpreuve
    );

    const playerName = `${playerData.prenom || ""} ${playerData.nom || ""}`.trim();

    // Ne pas mettre à jour le message Discord principal
    // La réponse sera affichée dans un message éphémère à l'utilisateur

    // Retourner une réponse qui met à jour le message (type 7 = UPDATE_MESSAGE)
    // Mais on ne peut pas mettre à jour le message d'origine depuis une interaction de bouton
    // On retourne donc un message éphémère de confirmation
    const statusEmoji = available ? "✅" : "❌";
    const statusText = available ? "disponible" : "indisponible";

    return NextResponse.json({
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: `${statusEmoji} **Votre disponibilité a été enregistrée : ${statusText}**${comment ? `\n💬 **Commentaire :** ${comment}` : ""}\n📋 **Licence :** ${playerId}${playerName ? ` (${playerName})` : ""}\n\n💡 Vous pouvez modifier votre réponse à tout moment en cliquant à nouveau sur les boutons.`,
        flags: 64, // EPHEMERAL
      },
    });
  } catch (error) {
    console.error(
      "[Discord Poll Interactions] Erreur dans processAvailabilityResponse:",
      error
    );
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Erreur lors de l'enregistrement de votre disponibilité. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}

/**
 * Gère la soumission d'un modal (licence ou commentaire)
 */
export async function handleModalSubmit(
  interaction: DiscordModalSubmitInteraction,
  pollId: string
): Promise<NextResponse> {
  try {
    const discordUserId =
      interaction.member?.user?.id || interaction.user?.id;

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

    // Modal de licence
    if (customId.startsWith(`availability_${pollId}_license_modal_`)) {
      const responseType = customId.split("_").pop() as "available" | "unavailable";
      const licenseInput = interaction.data.components[0]?.components[0];
      const licenseNumber = licenseInput?.value?.trim();

      if (!licenseNumber || !/^\d+$/.test(licenseNumber)) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "❌ Le numéro de licence doit contenir uniquement des chiffres.",
            flags: 64,
          },
        });
      }

      // Associer la licence (réutiliser la logique de handleLinkLicenseCommand)
      await initializeFirebaseAdmin();
      const db = getFirestoreAdmin();

      // Vérifier si l'utilisateur est déjà associé à une autre licence
      const existingPlayerQuery = await db
        .collection("players")
        .where("discordMentions", "array-contains", discordUserId)
        .limit(1)
        .get();

      if (!existingPlayerQuery.empty) {
        const existingLicense = existingPlayerQuery.docs[0].id;
        return NextResponse.json({
          type: 4,
          data: {
            content: `❌ Vous êtes déjà associé à la licence ${existingLicense}. Utilisez /modifier_licence pour changer.`,
            flags: 64,
          },
        });
      }

      // Vérifier que la licence existe
      const playerDoc = await db.collection("players").doc(licenseNumber).get();
      if (!playerDoc.exists) {
        return NextResponse.json({
          type: 4,
          data: {
            content: `❌ Aucun joueur trouvé avec la licence ${licenseNumber}.`,
            flags: 64,
          },
        });
      }

      // Associer la licence
      const playerData = playerDoc.data();
      const existingDiscordMentions = playerData?.discordMentions || [];
      if (!existingDiscordMentions.includes(discordUserId)) {
        await db.collection("players").doc(licenseNumber).update({
          discordMentions: [...existingDiscordMentions, discordUserId],
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Maintenant traiter la réponse de disponibilité
      return await processAvailabilityResponse(
        pollId,
        licenseNumber,
        responseType === "available",
        undefined,
        discordUserId,
        (playerData || {}) as Record<string, unknown>
      );
    }

    // Modal de commentaire
    if (customId === `availability_${pollId}_comment_modal`) {
      const commentInput = interaction.data.components[0]?.components[0];
      const comment = commentInput?.value?.trim();

      // Trouver le joueur
      const player = await findPlayerByDiscordId(discordUserId);
      if (!player) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "❌ Vous devez d'abord associer votre licence. Répondez au sondage pour commencer.",
            flags: 64,
          },
        });
      }

      // Récupérer la dernière réponse de disponibilité (on suppose qu'elle existe)
      // Pour simplifier, on va juste mettre à jour avec le commentaire
      // (en pratique, on devrait récupérer la dernière réponse)
      const parts = pollId.split("_");
      const phase = parts[0] as "aller" | "retour";
      const journee = parseInt(parts[1], 10);
      const championshipType = parts[2] as ChampionshipType;
      const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

      const availabilityService = new AvailabilityServiceAdmin();
      const availability = await availabilityService.getAvailability(
        journee,
        phase,
        championshipType,
        idEpreuve
      );

      const currentResponse = availability?.players[player.playerId];
      const available = currentResponse?.available ?? true; // Par défaut disponible si pas de réponse

      const availabilityData: {
        available: boolean;
        comment?: string;
      } = {
        available,
      };
      if (comment) {
        availabilityData.comment = comment;
      }
      await availabilityService.updatePlayerAvailability(
        journee,
        phase,
        championshipType,
        player.playerId,
        availabilityData,
        idEpreuve
      );

      return NextResponse.json({
        type: 4,
        data: {
          content: comment
            ? `💬 Votre commentaire a été enregistré : "${comment}"`
            : "💬 Commentaire supprimé.",
          flags: 64,
        },
      });
    }

    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Modal non reconnu.",
        flags: 64,
      },
    });
  } catch (error) {
    console.error(
      "[Discord Poll Interactions] Erreur dans handleModalSubmit:",
      error
    );
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Erreur lors du traitement. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}

