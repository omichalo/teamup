import { NextResponse } from "next/server";
import {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
} from "@/lib/firebase-admin";
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
 * Vérifie qu'un poll est actif
 */
async function checkPollActive(pollId: string): Promise<{
  active: boolean;
  poll: Awaited<ReturnType<DiscordPollServiceAdmin["getPoll"]>> | null;
}> {
  await initializeFirebaseAdmin();
  const parts = pollId.split("_");
  if (parts.length < 3) {
    console.log("[Discord Poll] checkPollActive: pollId format invalide", {
      pollId,
      partsLength: parts.length,
    });
    return { active: false, poll: null };
  }

  const phase = parts[0] as "aller" | "retour";
  const journee = parseInt(parts[1], 10);
  if (isNaN(journee)) {
    console.log("[Discord Poll] checkPollActive: journee invalide", {
      pollId,
      journeePart: parts[1],
    });
    return { active: false, poll: null };
  }
  const championshipType = parts[2] as ChampionshipType;
  const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

  console.log("[Discord Poll] checkPollActive: parsing pollId", {
    pollId,
    phase,
    journee,
    championshipType,
    idEpreuve,
  });

  const pollService = new DiscordPollServiceAdmin();
  const poll = await pollService.getPoll(
    journee,
    phase,
    championshipType,
    idEpreuve
  );

  console.log("[Discord Poll] checkPollActive: poll found", {
    pollExists: !!poll,
    isActive: poll?.isActive,
    pollId: poll?.id,
  });

  return { active: poll?.isActive ?? false, poll };
}

/**
 * Gère l'interaction du bouton "Répondre"
 * Détecte le genre et affiche les options appropriées
 */
export async function handleRespondButton(
  interaction: DiscordMessageComponentInteraction,
  pollId: string
): Promise<NextResponse> {
  try {
    console.log("[Discord Poll] Respond button clicked:", {
      pollId,
      discordUserId: interaction.member?.user?.id || interaction.user?.id,
    });

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

    // Détecter le genre
    const playerGender =
      (player.playerData.sexe as string | undefined) ||
      (player.playerData.gender as string | undefined);
    const normalizedGender =
      playerGender === "F" || playerGender === "féminin" ? "F" : "M";

    console.log("[Discord Poll] Gender detected:", {
      gender: normalizedGender,
      showing: normalizedGender === "M" ? "men_buttons" : "women_selects",
    });

    if (normalizedGender === "M") {
      // Homme : 1 bouton toggle (comme pour les femmes)
      // Récupérer l'état actuel pour afficher le bon style
      const availabilityService = new AvailabilityServiceAdmin();
      const parts = pollId.split("_");
      const phase = parts[0] as "aller" | "retour";
      const journee = parseInt(parts[1], 10);
      const championshipType = parts[2] as ChampionshipType;
      const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

      const availability = await availabilityService.getAvailability(
        journee,
        phase,
        championshipType,
        idEpreuve
      );
      const currentResponse = availability?.players[player.playerId];

      // Récupérer l'état actuel (undefined, true, false)
      const isAvailable = currentResponse?.available;

      const getButtonStyle = (available: boolean | undefined): number => {
        if (available === true) return 3; // SUCCESS (vert)
        if (available === false) return 4; // DANGER (rouge)
        return 2; // SECONDARY (gris) pour non renseigné
      };

      const getButtonLabel = (available: boolean | undefined): string => {
        if (available === true) return "✅ Disponible";
        if (available === false) return "❌ Indisponible";
        return "❓ Non renseigné";
      };

      return NextResponse.json({
        type: 4,
        data: {
          content: "**Votre disponibilité :**\n💡 Cliquez sur le bouton pour changer l'état (Disponible ↔ Indisponible).",
          flags: 64,
          components: [
            {
              type: 1, // ACTION_ROW
              components: [
                {
                  type: 2, // BUTTON
                  style: getButtonStyle(isAvailable),
                  label: getButtonLabel(isAvailable),
                  custom_id: `availability_${pollId}_men_toggle`,
                },
              ],
            },
          ],
        },
      });
    } else {
      // Femme : 2 boutons toggle-like (vendredi et samedi)
      // Récupérer l'état actuel pour afficher les bons styles
      const availabilityService = new AvailabilityServiceAdmin();
      const parts = pollId.split("_");
      const phase = parts[0] as "aller" | "retour";
      const journee = parseInt(parts[1], 10);
      const championshipType = parts[2] as ChampionshipType;
      const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

      const availability = await availabilityService.getAvailability(
        journee,
        phase,
        championshipType,
        idEpreuve
      );
      const currentResponse = availability?.players[player.playerId];

      // Récupérer les 3 états possibles : undefined, true, false
      const venAvailable = currentResponse?.fridayAvailable;
      const satAvailable = currentResponse?.saturdayAvailable;

      const getButtonStyle = (available: boolean | undefined): number => {
        if (available === true) return 3; // SUCCESS (vert)
        if (available === false) return 4; // DANGER (rouge)
        return 2; // SECONDARY (gris) pour non renseigné
      };

      const getButtonLabel = (day: "ven" | "sat", available: boolean | undefined): string => {
        const dayLabel = day === "ven" ? "Vendredi" : "Samedi";
        if (available === true) return `✅ ${dayLabel} - Disponible`;
        if (available === false) return `❌ ${dayLabel} - Indisponible`;
        return `❓ ${dayLabel} - Non renseigné`;
      };

      return NextResponse.json({
        type: 4,
        data: {
          content: "**Votre disponibilité (vendredi et/ou samedi) :**\n💡 Cliquez sur un bouton pour changer l'état (Disponible ↔ Indisponible).",
          flags: 64,
          components: [
            {
              type: 1, // ACTION_ROW
              components: [
                {
                  type: 2, // BUTTON
                  style: getButtonStyle(venAvailable),
                  label: getButtonLabel("ven", venAvailable),
                  custom_id: `availability_${pollId}_women_ven_toggle`,
                },
                {
                  type: 2, // BUTTON
                  style: getButtonStyle(satAvailable),
                  label: getButtonLabel("sat", satAvailable),
                  custom_id: `availability_${pollId}_women_sat_toggle`,
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

    const availabilityService = new AvailabilityServiceAdmin();
    const availability = await availabilityService.getAvailability(
      journee,
      phase,
      championshipType,
      idEpreuve
    );

    const currentResponse = availability?.players[player.playerId];

    // Détecter le genre
    const playerGender =
      (player.playerData.sexe as string | undefined) ||
      (player.playerData.gender as string | undefined);
    const normalizedGender =
      playerGender === "F" || playerGender === "féminin" ? "F" : "M";

    let currentStatusText = "";
    if (normalizedGender === "M") {
      if (currentResponse?.available === true) {
        currentStatusText = "✅ **Disponible**";
      } else if (currentResponse?.available === false) {
        currentStatusText = "❌ **Indisponible**";
      } else {
        currentStatusText = "❓ **Non renseigné**";
      }
    } else {
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

    // Afficher la réponse actuelle et proposer de modifier
    if (normalizedGender === "M") {
      // Homme : 1 bouton toggle (comme pour les femmes)
      const isAvailable = currentResponse?.available;

      const getButtonStyle = (available: boolean | undefined): number => {
        if (available === true) return 3; // SUCCESS (vert)
        if (available === false) return 4; // DANGER (rouge)
        return 2; // SECONDARY (gris) pour non renseigné
      };

      const getButtonLabel = (available: boolean | undefined): string => {
        if (available === true) return "✅ Disponible";
        if (available === false) return "❌ Indisponible";
        return "❓ Non renseigné";
      };

    return NextResponse.json({
        type: 4,
      data: {
          content: `📋 **Votre réponse actuelle :**\n${currentStatusText}${commentText}\n\n**Modifier :**\n💡 Cliquez sur le bouton pour changer l'état (Disponible ↔ Indisponible).`,
          flags: 64,
        components: [
          {
              type: 1,
            components: [
              {
                  type: 2,
                  style: getButtonStyle(isAvailable),
                  label: getButtonLabel(isAvailable),
                  custom_id: `availability_${pollId}_men_toggle`,
              },
            ],
          },
        ],
      },
    });
    } else {
      // Femme : 2 boutons toggle-like (vendredi et samedi)
      // Récupérer les 3 états possibles : undefined, true, false
      const venAvailable = currentResponse?.fridayAvailable;
      const satAvailable = currentResponse?.saturdayAvailable;

      const getButtonStyle = (available: boolean | undefined): number => {
        if (available === true) return 3; // SUCCESS (vert)
        if (available === false) return 4; // DANGER (rouge)
        return 2; // SECONDARY (gris) pour non renseigné
      };

      const getButtonLabel = (day: "ven" | "sat", available: boolean | undefined): string => {
        const dayLabel = day === "ven" ? "Vendredi" : "Samedi";
        if (available === true) return `✅ ${dayLabel} - Disponible`;
        if (available === false) return `❌ ${dayLabel} - Indisponible`;
        return `❓ ${dayLabel} - Non renseigné`;
      };

      return NextResponse.json({
        type: 4,
        data: {
          content: `📋 **Votre réponse actuelle :**\n${currentStatusText}${commentText}\n\n**Modifier :**\n💡 Cliquez sur un bouton pour changer l'état (Disponible ↔ Indisponible).`,
          flags: 64,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: getButtonStyle(venAvailable),
                  label: getButtonLabel("ven", venAvailable),
                  custom_id: `availability_${pollId}_women_ven_toggle`,
                },
                {
                  type: 2,
                  style: getButtonStyle(satAvailable),
                  label: getButtonLabel("sat", satAvailable),
                  custom_id: `availability_${pollId}_women_sat_toggle`,
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
 * Gère le toggle de disponibilité pour les hommes (cycle disponible ↔ indisponible)
 */
export async function handleMenToggle(
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
    console.log("[Discord Poll] handleMenToggle: checking poll", { pollId });
    const { active, poll } = await checkPollActive(pollId);
    console.log("[Discord Poll] handleMenToggle: poll check result", {
      pollId,
      active,
      pollExists: !!poll,
      pollIsActive: poll?.isActive,
    });
    if (!active || !poll) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Ce sondage est fermé.",
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

    // Récupérer l'état actuel
    const availabilityService = new AvailabilityServiceAdmin();
    const availability = await availabilityService.getAvailability(
      journee,
      phase,
      championshipType,
      idEpreuve
    );
    const currentResponse = availability?.players[player.playerId];

    // Toggle l'état (cycle à 2 états : undefined → true → false → true → ...)
    // L'état "non renseigné" (undefined) n'est que l'état de départ, on ne peut pas y revenir
    let isAvailable: boolean | undefined = currentResponse?.available;

    // Cycle : undefined → true → false → true → false → ...
    if (isAvailable === true) {
      isAvailable = false;
    } else {
      // undefined ou false → true
      isAvailable = true;
    }

    // Sauvegarder la réponse
    const availabilityData: {
      available: boolean;
    } = {
      available: isAvailable,
    };

    await availabilityService.updatePlayerAvailability(
      journee,
      phase,
      championshipType,
      player.playerId,
      availabilityData,
      idEpreuve
    );

    const playerName = `${player.playerData.prenom || ""} ${
      player.playerData.nom || ""
    }`.trim();

    const statusEmoji = isAvailable === true ? "✅" : "❌";
    const statusText = isAvailable === true ? "disponible" : "indisponible";

    console.log("[Discord Poll] Men toggle response saved:", {
      playerId: player.playerId,
      data: availabilityData,
    });

    // Déterminer le style et le label pour le bouton selon l'état
    const getButtonStyle = (available: boolean | undefined): number => {
      if (available === true) return 3; // SUCCESS (vert)
      if (available === false) return 4; // DANGER (rouge)
      return 2; // SECONDARY (gris) pour non renseigné
    };

    const getButtonLabel = (available: boolean | undefined): string => {
      if (available === true) return "✅ Disponible";
      if (available === false) return "❌ Indisponible";
      return "❓ Non renseigné";
    };

    return NextResponse.json({
      type: 4,
      data: {
        content: `${statusEmoji} **Votre disponibilité a été enregistrée : ${statusText}**\n📋 **Licence :** ${player.playerId}${
          playerName ? ` (${playerName})` : ""
        }\n\n💡 Cliquez sur le bouton pour changer l'état (Disponible ↔ Indisponible).`,
        flags: 64,
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: getButtonStyle(isAvailable),
                label: getButtonLabel(isAvailable),
                custom_id: `availability_${pollId}_men_toggle`,
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error("[Discord Poll] Erreur dans handleMenToggle:", error);
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
 * Gère les réponses des femmes (toggle vendredi ou samedi)
 */
export async function handleWomenToggle(
  interaction: DiscordMessageComponentInteraction,
  pollId: string,
  day: "ven" | "sat"
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
          content: "❌ Ce sondage est fermé.",
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

    // Déterminer si c'est le championnat par équipes
    const isTeamChampionship = championshipType === "masculin" && (idEpreuve === undefined || idEpreuve !== 15980);

    // Récupérer l'état actuel
    const availabilityService = new AvailabilityServiceAdmin();
    const availability = await availabilityService.getAvailability(
      journee,
      phase,
      championshipType,
      idEpreuve
    );
    const currentResponse = availability?.players[player.playerId];

    // Toggle l'état du jour sélectionné (cycle à 2 états : undefined → true → false → true → ...)
    // L'état "non renseigné" (undefined) n'est que l'état de départ, on ne peut pas y revenir
    let fridayAvailable: boolean | undefined = currentResponse?.fridayAvailable;
    let saturdayAvailable: boolean | undefined = currentResponse?.saturdayAvailable;

    if (day === "ven") {
      // Cycle vendredi : undefined → true → false → true → false → ...
      if (fridayAvailable === true) {
        fridayAvailable = false;
      } else {
        // undefined ou false → true
        fridayAvailable = true;
      }
    } else {
      // Cycle samedi : undefined → true → false → true → false → ...
      if (saturdayAvailable === true) {
        saturdayAvailable = false;
      } else {
        // undefined ou false → true
        saturdayAvailable = true;
      }
    }

    // Pour le championnat par équipes, les femmes doivent sauvegarder :
    // - Vendredi disponible → disponible pour le championnat masculin (les hommes jouent le vendredi)
    // - Samedi disponible → disponible pour le championnat féminin (les femmes jouent le samedi)

    if (isTeamChampionship) {
      // Championnat par équipes : sauvegarder dans les deux championnats selon les jours
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
      // fridayAvailable ne peut plus être undefined ici (cycle true/false uniquement)
      if (fridayAvailable !== undefined) {
        masculineData.available = fridayAvailable;
        masculineData.fridayAvailable = fridayAvailable;
      }

      // Samedi → championnat féminin
      // saturdayAvailable ne peut plus être undefined ici (cycle true/false uniquement)
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
    } else {
      // Championnat de Paris : sauvegarder avec fridayAvailable et saturdayAvailable
      // Les valeurs ne peuvent plus être undefined ici (cycle true/false uniquement)
      const availabilityData: {
        fridayAvailable?: boolean;
        saturdayAvailable?: boolean;
      } = {};
      if (fridayAvailable !== undefined) {
        availabilityData.fridayAvailable = fridayAvailable;
      }
      if (saturdayAvailable !== undefined) {
        availabilityData.saturdayAvailable = saturdayAvailable;
      }

    await availabilityService.updatePlayerAvailability(
      journee,
      phase,
        championshipType,
        player.playerId,
        availabilityData,
      idEpreuve
    );
    }

    const playerName = `${player.playerData.prenom || ""} ${
      player.playerData.nom || ""
    }`.trim();

    const dayLabel = day === "ven" ? "Vendredi" : "Samedi";
    const newStatus = day === "ven" ? fridayAvailable : saturdayAvailable;
    const statusEmoji = newStatus === true ? "✅" : newStatus === false ? "❌" : "❓";
    const statusText = newStatus === true ? "disponible" : newStatus === false ? "indisponible" : "non renseigné";

    const venEmoji = fridayAvailable === true ? "✅" : fridayAvailable === false ? "❌" : "❓";
    const satEmoji = saturdayAvailable === true ? "✅" : saturdayAvailable === false ? "❌" : "❓";

    // Déterminer le style et le label pour chaque bouton selon l'état
    const getButtonStyle = (available: boolean | undefined): number => {
      if (available === true) return 3; // SUCCESS (vert)
      if (available === false) return 4; // DANGER (rouge)
      return 2; // SECONDARY (gris) pour non renseigné
    };

    const getButtonLabel = (day: "ven" | "sat", available: boolean | undefined): string => {
      const dayLabel = day === "ven" ? "Vendredi" : "Samedi";
      if (available === true) return `✅ ${dayLabel} - Disponible`;
      if (available === false) return `❌ ${dayLabel} - Indisponible`;
      return `❓ ${dayLabel} - Non renseigné`;
    };

    // Retourner une réponse avec les boutons mis à jour
    return NextResponse.json({
      type: 4,
      data: {
        content: `${statusEmoji} **${dayLabel} : ${statusText}**\n\n📋 **Votre disponibilité :**\nVEN: ${venEmoji} / SAM: ${satEmoji}\n📋 **Licence :** ${player.playerId}${
          playerName ? ` (${playerName})` : ""
        }\n\n💡 Cliquez sur un bouton pour changer l'état (Disponible ↔ Indisponible).`,
        flags: 64,
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: getButtonStyle(fridayAvailable),
                label: getButtonLabel("ven", fridayAvailable),
                custom_id: `availability_${pollId}_women_ven_toggle`,
              },
              {
                type: 2,
                style: getButtonStyle(saturdayAvailable),
                label: getButtonLabel("sat", saturdayAvailable),
                custom_id: `availability_${pollId}_women_sat_toggle`,
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error("[Discord Poll] Erreur dans handleWomenToggle:", error);
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

      const availabilityService = new AvailabilityServiceAdmin();

      // Pour le championnat par équipes, sauvegarder le commentaire pour les deux catégories (masculin et féminin)
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
