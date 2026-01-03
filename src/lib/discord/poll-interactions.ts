import { NextResponse } from "next/server";
import {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
} from "@/lib/firebase-admin";
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
 * Valide que le joueur a le droit d'accéder à un type de bouton selon son genre
 * @param playerGender - Genre du joueur ("M" ou "F")
 * @param buttonType - Type de bouton ("masculin", "feminin", "friday", "saturday")
 * @returns true si l'accès est autorisé, false sinon
 */
function validateGenderAccess(
  playerGender: "M" | "F" | string | undefined,
  buttonType: "masculin" | "feminin" | "friday" | "saturday" | undefined
): boolean {
  // Si le genre n'est pas défini, autoriser l'accès (pour la rétrocompatibilité)
  if (!playerGender || !buttonType) {
    return true;
  }

  const normalizedGender =
    playerGender === "F" || playerGender === "féminin" ? "F" : "M";

  // Les hommes ne peuvent cliquer que sur les boutons masculins
  if (normalizedGender === "M") {
    return buttonType === "masculin";
  }

  // Les femmes peuvent cliquer sur tous les boutons (masculin, féminin, vendredi, samedi)
  if (normalizedGender === "F") {
    return (
      buttonType === "masculin" ||
      buttonType === "feminin" ||
      buttonType === "friday" ||
      buttonType === "saturday"
    );
  }

  // Par défaut, refuser l'accès
  return false;
}

/**
 * Gère l'interaction d'un bouton de disponibilité (Disponible/Indisponible)
 * @param championshipType - Type de championnat (masculin/feminin) pour le championnat par équipes, undefined pour le championnat de Paris
 * @param buttonType - Type de bouton cliqué (masculin, feminin, friday, saturday) - peut être passé depuis la route interactions
 */
export async function handleAvailabilityButton(
  interaction: DiscordMessageComponentInteraction,
  pollId: string,
  responseType: "available" | "unavailable",
  championshipType?: "masculin" | "feminin",
  buttonType?: "masculin" | "feminin" | "friday" | "saturday"
): Promise<NextResponse> {
  try {
    console.log("[Discord Poll Interactions] handleAvailabilityButton", {
      pollId,
      responseType,
      customId: interaction.data?.custom_id,
    });

    const discordUserId = interaction.member?.user?.id || interaction.user?.id;

    if (!discordUserId) {
      console.error(
        "[Discord Poll Interactions] Pas d'ID Discord dans l'interaction"
      );
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
    console.log(
      "[Discord Poll Interactions] Player found:",
      player ? "yes" : "no"
    );

    if (!player) {
      // Pas de licence associée, demander via modal
      // Inclure le championshipType dans le custom_id si présent
      const modalCustomId = championshipType
        ? `availability_${pollId}_${championshipType}_license_modal_${responseType}`
        : `availability_${pollId}_license_modal_${responseType}`;

      console.log("[Discord Poll Interactions] Modal de licence:", {
        pollId,
        championshipType,
        responseType,
        modalCustomId,
      });

      return NextResponse.json({
        type: 9, // MODAL
        data: {
          title: "Associer votre licence",
          custom_id: modalCustomId,
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

    // Vérifier le genre du joueur et valider l'accès au bouton
    const playerGender =
      (player.playerData.sexe as string | undefined) ||
      (player.playerData.gender as string | undefined);

    // Déterminer le type de bouton depuis le custom_id
    // Si buttonType n'est pas fourni en paramètre, le déterminer depuis le custom_id
    let finalButtonType:
      | "masculin"
      | "feminin"
      | "friday"
      | "saturday"
      | undefined = buttonType;
    const customId = interaction.data?.custom_id || "";
    if (!finalButtonType) {
      if (customId.includes("_feminin_friday_")) {
        finalButtonType = "friday";
      } else if (customId.includes("_feminin_saturday_")) {
        finalButtonType = "saturday";
      } else if (customId.includes("_masculin_")) {
        finalButtonType = "masculin";
      } else if (customId.includes("_feminin_")) {
        finalButtonType = "feminin";
      }
      // Si aucun préfixe n'est trouvé, c'est un bouton général (accessible à tous)
      // finalButtonType reste undefined
    }

    // Valider l'accès selon le genre uniquement si c'est un bouton spécifique (vendredi/samedi)
    // Les boutons généraux (sans préfixe) sont accessibles à tous
    if (
      finalButtonType &&
      !validateGenderAccess(playerGender, finalButtonType)
    ) {
      const genderLabel = playerGender === "F" ? "féminin" : "masculin";
      const buttonLabel =
        finalButtonType === "masculin"
          ? "masculin"
          : finalButtonType === "feminin"
          ? "féminin"
          : finalButtonType === "friday"
          ? "vendredi"
          : finalButtonType === "saturday"
          ? "samedi"
          : "ce type";

      return NextResponse.json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: `❌ Vous êtes de genre ${genderLabel} et ne pouvez pas répondre pour ${buttonLabel}. Veuillez utiliser les boutons appropriés à votre genre.`,
          flags: 64, // EPHEMERAL
        },
      });
    }

    // L'utilisateur a une licence et l'accès est autorisé, traiter la réponse
    return await processAvailabilityResponse(
      pollId,
      player.playerId,
      responseType === "available",
      undefined,
      discordUserId,
      player.playerData,
      championshipType,
      finalButtonType
    );
  } catch (error) {
    console.error(
      "[Discord Poll Interactions] Erreur dans handleAvailabilityButton:",
      error
    );
    return NextResponse.json({
      type: 4,
      data: {
        content:
          "❌ Erreur lors du traitement de votre réponse. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}

/**
 * Gère l'interaction du bouton "Ajouter un commentaire"
 * Le commentaire est partagé entre masculin et féminin pour le championnat par équipes
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
    // Pour le championnat par équipes, le commentaire est partagé entre masculin et féminin
    // Donc on n'inclut pas le championshipType dans le custom_id
    const modalTitle = "Ajouter un commentaire";
    const modalCustomId = `availability_${pollId}_comment_modal`;

    return NextResponse.json({
      type: 9, // MODAL
      data: {
        title: modalTitle,
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
    console.error(
      "[Discord Poll Interactions] Erreur dans handleCommentButton:",
      error
    );
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
 * Gère l'interaction du bouton "Voir/Modifier ma réponse"
 */
export async function handleViewButton(
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
    const playerName = `${player.playerData.prenom || ""} ${
      player.playerData.nom || ""
    }`.trim();

    let content: string;
    if (currentResponse && currentResponse.available !== undefined) {
      const statusText = currentResponse.available
        ? "✅ **Disponible**"
        : "❌ **Indisponible**";
      const commentText = currentResponse.comment
        ? `\n💬 **Commentaire :** ${currentResponse.comment}`
        : "";
      const licenseText = `\n📋 **Licence :** ${player.playerId}${
        playerName ? ` (${playerName})` : ""
      }`;
      content = `📋 **Votre réponse actuelle :**\n${statusText}${commentText}${licenseText}\n\n💡 Cliquez sur Disponible ou Indisponible pour modifier votre réponse.`;
    } else {
      content =
        "❌ Vous n'avez pas encore répondu à ce sondage.\n\n💡 Cliquez sur Disponible ou Indisponible pour répondre.";
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
        content:
          "❌ Erreur lors de la récupération de votre réponse. Veuillez réessayer.",
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
 * @param championshipType - Type de championnat (masculin/feminin) pour le championnat par équipes, undefined pour utiliser celui du pollId
 * @param buttonType - Type de bouton cliqué (masculin, feminin, friday, saturday)
 */
async function processAvailabilityResponse(
  pollId: string,
  playerId: string,
  available: boolean,
  comment: string | undefined,
  _discordUserId: string,
  playerData: Record<string, unknown>,
  championshipType?: "masculin" | "feminin",
  buttonType?: "masculin" | "feminin" | "friday" | "saturday"
): Promise<NextResponse> {
  try {
    await initializeFirebaseAdmin();
    console.log("[Discord Poll Interactions] processAvailabilityResponse", {
      pollId,
      championshipType,
      playerId,
      available,
    });

    if (!pollId || pollId.trim().length === 0) {
      console.error("[Discord Poll Interactions] pollId vide ou invalide:", {
        pollId,
        championshipType,
      });
      throw new Error(`pollId vide ou invalide: "${pollId}"`);
    }

    // Extraire les informations du pollId : ${phase}_${journee}_${championshipType}_${idEpreuve}
    const parts = pollId.split("_");
    console.log("[Discord Poll Interactions] pollId parts:", {
      pollId,
      parts,
      partsLength: parts.length,
      championshipType,
    });

    if (parts.length < 3) {
      console.error("[Discord Poll Interactions] Format de pollId invalide:", {
        pollId,
        parts,
        partsLength: parts.length,
      });
      throw new Error(
        `Format de pollId invalide: ${pollId} (${parts.length} parties, minimum 3 attendues)`
      );
    }

    const phase = parts[0] as "aller" | "retour";
    const journee = parseInt(parts[1], 10);

    if (isNaN(journee)) {
      console.error("[Discord Poll Interactions] Journée invalide:", {
        pollId,
        parts,
        journeePart: parts[1],
      });
      throw new Error(
        `Journée invalide dans pollId: ${pollId} (partie 1: "${parts[1]}")`
      );
    }

    // Utiliser le championshipType passé en paramètre si disponible, sinon celui du pollId
    const finalChampionshipType = (championshipType ||
      parts[2]) as ChampionshipType;
    const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

    console.log("[Discord Poll Interactions] Paramètres extraits:", {
      phase,
      journee,
      finalChampionshipType,
      idEpreuve,
    });

    // Vérifier que le sondage existe et est actif
    // Pour le championnat par équipes, le pollId contient "masculin" mais le sondage peut gérer les deux types
    const pollService = new DiscordPollServiceAdmin();
    const pollChampionshipTypeForCheck =
      championshipType || (parts[2] as ChampionshipType);
    const poll = await pollService.getPoll(
      journee,
      phase,
      pollChampionshipTypeForCheck,
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

    // Construire l'objet de disponibilité selon le type de bouton
    const availabilityData: {
      available?: boolean;
      fridayAvailable?: boolean;
      saturdayAvailable?: boolean;
      comment?: string;
    } = {};

    // Si c'est un bouton vendredi ou samedi, utiliser les champs spécifiques
    if (buttonType === "friday") {
      availabilityData.fridayAvailable = available;
    } else if (buttonType === "saturday") {
      availabilityData.saturdayAvailable = available;
    } else {
      // Pour les boutons généraux (sans préfixe) ou masculin/féminin classiques, utiliser le champ available
      availabilityData.available = available;
    }

    if (comment?.trim()) {
      availabilityData.comment = comment.trim();
    }

    // Récupérer la disponibilité existante pour préserver les autres champs
    const existingAvailability = await availabilityService.getAvailability(
      journee,
      phase,
      finalChampionshipType,
      idEpreuve
    );
    const existingResponse = existingAvailability?.players[playerId];

    // Fusionner avec les données existantes pour préserver les autres disponibilités
    const mergedData: {
      available?: boolean;
      fridayAvailable?: boolean;
      saturdayAvailable?: boolean;
      comment?: string;
    } = {
      ...(existingResponse || {}),
      ...availabilityData,
    };

    await availabilityService.updatePlayerAvailability(
      journee,
      phase,
      finalChampionshipType,
      playerId,
      mergedData,
      idEpreuve
    );

    const playerName = `${playerData.prenom || ""} ${
      playerData.nom || ""
    }`.trim();

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
        content: `${statusEmoji} **Votre disponibilité a été enregistrée : ${statusText}**${
          comment ? `\n💬 **Commentaire :** ${comment}` : ""
        }\n📋 **Licence :** ${playerId}${
          playerName ? ` (${playerName})` : ""
        }\n\n💡 Vous pouvez modifier votre réponse à tout moment en cliquant à nouveau sur les boutons.`,
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
        content:
          "❌ Erreur lors de l'enregistrement de votre disponibilité. Veuillez réessayer.",
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

    // Détecter le format du custom_id pour extraire le type de championnat si présent
    // Format ancien: availability_${pollId}_license_modal_${responseType} ou availability_${pollId}_comment_modal
    // Format nouveau: availability_${pollId}_masculin|feminin_license_modal_${responseType} ou availability_${pollId}_masculin|feminin_comment_modal
    const parts = customId.split("_");
    let championshipType: "masculin" | "feminin" | undefined;
    let actionType: "license" | "comment" | undefined;
    let responseType: "available" | "unavailable" | undefined;

    // Chercher "masculin" ou "feminin" dans les parties
    const masculinIndex = parts.indexOf("masculin");
    const femininIndex = parts.indexOf("feminin");
    if (masculinIndex !== -1) {
      championshipType = "masculin";
    } else if (femininIndex !== -1) {
      championshipType = "feminin";
    }

    // Chercher "license" ou "comment" dans les parties
    if (parts.includes("license")) {
      actionType = "license";
      // Le responseType est le dernier élément
      const lastPart = parts[parts.length - 1];
      if (lastPart === "available" || lastPart === "unavailable") {
        responseType = lastPart as "available" | "unavailable";
      }
    } else if (parts.includes("comment")) {
      actionType = "comment";
    }

    // Modal de licence
    if (actionType === "license" && responseType) {
      const licenseInput = interaction.data.components[0]?.components[0];
      const licenseNumber = licenseInput?.value?.trim();

      if (!licenseNumber || !/^\d+$/.test(licenseNumber)) {
        return NextResponse.json({
          type: 4,
          data: {
            content:
              "❌ Le numéro de licence doit contenir uniquement des chiffres.",
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
        await db
          .collection("players")
          .doc(licenseNumber)
          .update({
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
        (playerData || {}) as Record<string, unknown>,
        championshipType
      );
    }

    // Modal de commentaire
    if (actionType === "comment") {
      const commentInput = interaction.data.components[0]?.components[0];
      const comment = commentInput?.value?.trim();

      // Trouver le joueur
      const player = await findPlayerByDiscordId(discordUserId);
      if (!player) {
        return NextResponse.json({
          type: 4,
          data: {
            content:
              "❌ Vous devez d'abord associer votre licence. Répondez au sondage pour commencer.",
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

      const availabilityService = new AvailabilityServiceAdmin();

      // Pour le championnat par équipes, sauvegarder le commentaire pour les deux catégories (masculin et féminin)
      // Si championshipType est défini, on sauvegarde uniquement pour cette catégorie (ancien format)
      // Sinon, on sauvegarde pour les deux catégories
      if (championshipType) {
        // Ancien format : commentaire spécifique à une catégorie
        const finalChampionshipType = championshipType as ChampionshipType;
        const availability = await availabilityService.getAvailability(
          journee,
          phase,
          finalChampionshipType,
          idEpreuve
        );

        const currentResponse = availability?.players[player.playerId];
        const available = currentResponse?.available ?? true;

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
          finalChampionshipType,
          player.playerId,
          availabilityData,
          idEpreuve
        );
      } else {
        // Nouveau format : commentaire partagé pour les deux catégories (championnat par équipes)
        // Sauvegarder le commentaire pour masculin ET féminin
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
          available: boolean;
          comment?: string;
        } = {
          available: masculinResponse?.available ?? true,
        };
        if (comment) {
          masculinData.comment = comment;
        }

        const femininData: {
          available: boolean;
          comment?: string;
        } = {
          available: femininResponse?.available ?? true,
        };
        if (comment) {
          femininData.comment = comment;
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
