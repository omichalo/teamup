// Forcer le runtime Node.js pour utiliser les modules crypto natifs
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
} from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import nacl from "tweetnacl";
import {
  handleRespondButton,
  handleModifyButton,
  handleCommentButton,
  handleModalSubmit,
  DiscordMessageComponentInteraction,
  DiscordModalSubmitInteraction,
} from "@/lib/discord/poll-interactions";

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY; // Clé publique du bot Discord

/**
 * Types d'interactions Discord
 */
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const;

type InteractionTypeValue =
  (typeof InteractionType)[keyof typeof InteractionType];

/**
 * Route API pour gérer les interactions Discord (slash commands)
 *
 * Cette route gère :
 * - Les slash commands pour lier une licence
 *
 * Authentification: via signature Discord Ed25519 (X-Signature-Ed25519)
 */
export async function POST(req: Request) {
  try {
    // Vérifier que DISCORD_PUBLIC_KEY est configuré (obligatoire en production)
    if (!DISCORD_PUBLIC_KEY) {
      console.error("[Discord Interactions] DISCORD_PUBLIC_KEY non configuré");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    // Vérifier la signature Discord (obligatoire)
    const signature = req.headers.get("X-Signature-Ed25519");
    const timestamp = req.headers.get("X-Signature-Timestamp");
    const body = await req.text();

    if (!signature || !timestamp) {
      console.error("[Discord Interactions] Headers de signature manquants");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const isValid = verifyDiscordSignature(
      body,
      signature,
      timestamp,
      DISCORD_PUBLIC_KEY
    );
    if (!isValid) {
      console.error("[Discord Interactions] Signature invalide");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(body) as DiscordInteraction;

    // Gérer les interactions Discord (slash commands, etc.)
    if (data.type === InteractionType.PING) {
      // PING - répondre avec PONG (Discord exige une réponse en moins de 3 secondes)
      return NextResponse.json({ type: InteractionType.PING });
    }

    // Gérer les commandes slash (type 2)
    if (data.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = data.data?.name;

      if (commandName === "lier_licence" || commandName === "link_license") {
        return await handleLinkLicenseCommand(data);
      }

      if (
        commandName === "modifier_licence" ||
        commandName === "update_license"
      ) {
        return await handleUpdateLicenseCommand(data);
      }

      if (
        commandName === "supprimer_licence" ||
        commandName === "unlink_license"
      ) {
        return await handleUnlinkLicenseCommand(data);
      }

      if (
        commandName === "ma_licence" ||
        commandName === "my_license" ||
        commandName === "voir_licence" ||
        commandName === "view_license"
      ) {
        return await handleGetLicenseCommand(data);
      }

      // Commande inconnue
      return NextResponse.json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: `❌ Commande inconnue : ${commandName || "N/A"}`,
          flags: 64, // EPHEMERAL
        },
      });
    }

    // Gérer les interactions de composants (boutons, select menus, etc.) - type 3
    if (data.type === InteractionType.MESSAGE_COMPONENT) {
      await initializeFirebaseAdmin();
      const interaction = data as unknown as DiscordMessageComponentInteraction;
      const customId = interaction.data?.custom_id;
      const componentType = (interaction.data as { component_type?: number })?.component_type;

      // Ajouter application_id et token depuis l'interaction Discord
      // Type assertion nécessaire car application_id et token sont optionnels dans DiscordInteraction
      const interactionWithMetadata: DiscordMessageComponentInteraction = {
        ...interaction,
        application_id: data.application_id,
        token: data.token,
      } as DiscordMessageComponentInteraction;

      const interactionData = interaction.data as {
        values?: string[];
        component_type?: number;
        custom_id?: string;
      };
      
      console.log("[Discord Interactions] MESSAGE_COMPONENT received:", {
        customId,
        componentType,
        hasValues: !!interactionData.values,
        values: interactionData.values,
        fullInteractionData: JSON.stringify(interactionData),
        fullInteraction: JSON.stringify(interaction).substring(0, 500), // Limiter la taille du log
      });

      if (!customId || !customId.startsWith("availability_")) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "❌ Interaction non reconnue.",
            flags: 64,
          },
        });
      }

      // Détecter si c'est un select menu (component_type === 3)
      if (componentType === 3) {
        // Select menu
        const parts = customId.split("_");
        if (parts.length < 3) {
          return NextResponse.json({
            type: 4,
            data: {
              content: "❌ Format d'interaction invalide.",
              flags: 64,
            },
          });
        }

        const lastPart = parts[parts.length - 1];
        const secondLastPart = parts[parts.length - 2];

        // Extraire le pollId
        let pollId: string;
        let selectType: "paris" | "men" | "women_ven" | "women_sat" | null = null;

        // Formats possibles:
        // - availability_${pollId}_select (championnat de Paris)
        // - availability_${pollId}_men_select (championnat par équipes - hommes)
        // - availability_${pollId}_women_ven_select (championnat par équipes - femmes vendredi)
        // - availability_${pollId}_women_sat_select (championnat par équipes - femmes samedi)

        if (lastPart === "select" && secondLastPart !== "men" && secondLastPart !== "ven" && secondLastPart !== "sat") {
          // Championnat de Paris : availability_${pollId}_select
          pollId = parts.slice(1, -1).join("_");
          selectType = "paris";
        } else if (lastPart === "select" && secondLastPart === "men") {
          // Championnat par équipes - hommes : availability_${pollId}_men_select
          pollId = parts.slice(1, -2).join("_");
          selectType = "men";
        } else if (lastPart === "select" && secondLastPart === "ven") {
          // Championnat par équipes - femmes vendredi : availability_${pollId}_women_ven_select
          pollId = parts.slice(1, -3).join("_");
          selectType = "women_ven";
        } else if (lastPart === "select" && secondLastPart === "sat") {
          // Championnat par équipes - femmes samedi : availability_${pollId}_women_sat_select
          pollId = parts.slice(1, -3).join("_");
          selectType = "women_sat";
        } else {
          return NextResponse.json({
            type: 4,
            data: {
              content: "❌ Format de select menu invalide.",
              flags: 64,
            },
          });
        }

        console.log("[Discord Interactions] Select menu detected:", {
          customId,
          pollId,
          selectType,
        });

        try {
          const {
            handleParisSelect,
            handleMenSelect,
            handleWomenSelect,
          } = await import("@/lib/discord/poll-interactions");

          if (selectType === "paris") {
            return await handleParisSelect(interactionWithMetadata, pollId);
          } else if (selectType === "men") {
            return await handleMenSelect(interactionWithMetadata, pollId);
          } else if (selectType === "women_ven") {
            return await handleWomenSelect(interactionWithMetadata, pollId, "ven");
          } else if (selectType === "women_sat") {
            return await handleWomenSelect(interactionWithMetadata, pollId, "sat");
          }

          return NextResponse.json({
            type: 4,
            data: {
              content: "❌ Type de select menu non reconnu.",
              flags: 64,
            },
          });
        } catch (error) {
          console.error("[Discord Interactions] Erreur dans le handler select menu:", error);
          return NextResponse.json({
            type: 4,
            data: {
              content: "❌ Erreur lors du traitement. Veuillez réessayer.",
              flags: 64,
            },
          });
        }
      }

      // Boutons (component_type === 2)
      // Extraire le pollId et l'action
      // Formats possibles:
      // - availability_${pollId}_respond
      // - availability_${pollId}_modify
      // - availability_${pollId}_comment
      const parts = customId.split("_");
      if (parts.length < 3) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "❌ Format d'interaction invalide.",
            flags: 64,
          },
        });
      }

      const lastPart = parts[parts.length - 1];
      const pollId = parts.slice(1, -1).join("_");
      const action = lastPart;

      console.log("[Discord Interactions] Parsing custom_id:", {
        customId,
        parts,
        pollId,
        action,
      });

      if (!pollId || !action) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "❌ Format d'interaction invalide (pollId ou action manquant).",
            flags: 64,
          },
        });
      }

      try {
        // Bouton "Répondre"
        if (action === "respond") {
          return await handleRespondButton(interactionWithMetadata, pollId);
        }

        // Bouton "Modifier"
        if (action === "modify") {
          return await handleModifyButton(interactionWithMetadata, pollId);
        }

        // Bouton "Commentaire"
        if (action === "comment") {
          return await handleCommentButton(interactionWithMetadata, pollId);
        }

        return NextResponse.json({
          type: 4,
          data: {
            content: "❌ Action non reconnue.",
            flags: 64,
          },
        });
      } catch (error) {
        console.error("[Discord Interactions] Erreur dans le handler:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content: "❌ Erreur lors du traitement. Veuillez réessayer.",
            flags: 64,
          },
        });
      }
    }

    // Gérer les soumissions de modals - type 5
    if (data.type === InteractionType.MODAL_SUBMIT) {
      await initializeFirebaseAdmin();
      const interaction = data as unknown as DiscordModalSubmitInteraction;
      const customId = interaction.data?.custom_id;

      if (!customId) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "❌ Modal non reconnu.",
            flags: 64,
          },
        });
      }

      // Vérifier si c'est un modal de sondage de disponibilité
      // Format: availability_${pollId}_comment_modal
      if (customId.startsWith("availability_") && customId.endsWith("_comment_modal")) {
        const parts = customId.split("_");
        if (parts.length < 4) {
          return NextResponse.json({
            type: 4,
            data: {
              content: "❌ Format de modal invalide.",
              flags: 64,
            },
          });
        }

        // Extraire le pollId : tout sauf "availability", "comment", "modal"
        const pollIdParts: string[] = [];
        for (let i = 1; i < parts.length - 2; i++) {
          pollIdParts.push(parts[i]);
        }
        const pollId = pollIdParts.join("_");

        if (!pollId) {
          return NextResponse.json({
            type: 4,
            data: {
              content: "❌ Impossible d'extraire l'ID du sondage.",
              flags: 64,
            },
          });
        }

        try {
          return await handleModalSubmit(interaction, pollId);
        } catch (error) {
          console.error(
            "[Discord Interactions] Erreur dans handleModalSubmit:",
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

      // Modal non reconnu
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Modal non reconnu.",
          flags: 64,
        },
      });
    }

    // Type d'interaction non géré
    return NextResponse.json(
      { error: "Unknown interaction type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Discord Interactions] Erreur:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Discord Interactions] Détails:", errorMessage);

    return NextResponse.json(
      {
        error: "Erreur lors du traitement de l'interaction",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Vérifie la signature Discord Ed25519 pour authentifier les requêtes
 *
 * @param body - Corps de la requête (string brut)
 * @param signature - Signature hexadécimale depuis le header X-Signature-Ed25519
 * @param timestamp - Timestamp depuis le header X-Signature-Timestamp
 * @param publicKey - Clé publique hexadécimale du bot Discord
 * @returns true si la signature est valide, false sinon
 */
function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  try {
    // Reconstituer le message à vérifier : timestamp + body
    const message = timestamp + body;

    // Convertir la signature et la clé publique depuis hex vers Uint8Array
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(publicKey);

    // Vérifier la signature avec Ed25519
    const isValid = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      signatureBytes,
      publicKeyBytes
    );

    return isValid;
  } catch (error) {
    console.error(
      "[Discord Interactions] Erreur lors de la vérification de signature:",
      error
    );
    return false;
  }
}

/**
 * Convertit une chaîne hexadécimale en Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

/**
 * Types pour les interactions Discord
 */
interface DiscordUser {
  id: string;
}

interface DiscordMember {
  user: DiscordUser;
}

interface DiscordApplicationCommandOption {
  name: string;
  value: string | number;
}

interface DiscordApplicationCommandData {
  name: string;
  options?: DiscordApplicationCommandOption[];
}

interface DiscordInteraction {
  type: InteractionTypeValue;
  data?: DiscordApplicationCommandData;
  member?: DiscordMember;
  user?: DiscordUser;
  application_id?: string;
  token?: string;
}

/**
 * Gère la commande slash pour lier une licence
 */
async function handleLinkLicenseCommand(data: DiscordInteraction) {
  try {
    // Récupérer l'ID utilisateur avec fallback
    const userId = data.member?.user?.id || data.user?.id;

    if (!userId) {
      console.error(
        "[Discord Interactions] Impossible de récupérer l'ID utilisateur"
      );
      return NextResponse.json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64, // EPHEMERAL (message visible uniquement par l'utilisateur)
        },
      });
    }

    // Récupérer le numéro de licence via l'option nommée
    const options = data.data?.options ?? [];
    const licenseOption = options.find(
      (o: DiscordApplicationCommandOption) =>
        o.name === "licence" || o.name === "license"
    );
    const licenseNumber =
      licenseOption?.value !== undefined
        ? String(licenseOption.value)
        : undefined;

    if (!licenseNumber || typeof licenseNumber !== "string") {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Numéro de licence requis.",
          flags: 64,
        },
      });
    }

    // Valider que le numéro de licence ne contient que des chiffres
    const trimmedLicense = licenseNumber.trim();
    if (!/^\d+$/.test(trimmedLicense)) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "❌ Le numéro de licence doit contenir uniquement des chiffres.",
          flags: 64,
        },
      });
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // 1. Vérifier si l'utilisateur Discord est déjà associé à un joueur
    const existingPlayerQuery = await db
      .collection("players")
      .where("discordMentions", "array-contains", userId)
      .limit(1)
      .get();

    if (!existingPlayerQuery.empty) {
      const existingLicense = existingPlayerQuery.docs[0].id;
      const existingPlayerData = existingPlayerQuery.docs[0].data();
      const existingPlayerName = `${existingPlayerData?.prenom || ""} ${
        existingPlayerData?.nom || ""
      }`.trim();

      return NextResponse.json({
        type: 4,
        data: {
          content: `❌ Un utilisateur Discord ne peut être associé qu'à un seul joueur. Vous êtes déjà associé à la licence ${existingLicense}${
            existingPlayerName ? ` (${existingPlayerName})` : ""
          }.`,
          flags: 64,
        },
      });
    }

    // 2. Chercher le joueur par numéro de licence
    const playerDoc = await db.collection("players").doc(trimmedLicense).get();

    if (!playerDoc.exists) {
      return NextResponse.json({
        type: 4,
        data: {
          content: `❌ Aucun joueur trouvé avec la licence ${trimmedLicense}. Vérifiez que le numéro de licence est correct.`,
          flags: 64,
        },
      });
    }

    // 3. Vérifier si l'utilisateur est déjà associé à ce joueur
    const playerData = playerDoc.data();
    const existingDiscordMentions = playerData?.discordMentions || [];

    if (existingDiscordMentions.includes(userId)) {
      const playerName = `${playerData?.prenom || ""} ${
        playerData?.nom || ""
      }`.trim();

      return NextResponse.json({
        type: 4,
        data: {
          content: `ℹ️ Vous êtes déjà associé à la licence ${trimmedLicense}${
            playerName ? ` (${playerName})` : ""
          }. Aucune modification n'est nécessaire.`,
          flags: 64,
        },
      });
    }

    // Ajouter l'ID Discord au tableau
    const updatedDiscordMentions = [...existingDiscordMentions, userId];

    await db.collection("players").doc(trimmedLicense).update({
      discordMentions: updatedDiscordMentions,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const playerName = `${playerData?.prenom || ""} ${
      playerData?.nom || ""
    }`.trim();

    console.log(
      `[Discord Interactions] Utilisateur ${userId} associé à la licence ${trimmedLicense}`
    );

    return NextResponse.json({
      type: 4,
      data: {
        content: `✅ Votre compte Discord a été associé à la licence ${trimmedLicense}${
          playerName ? ` (${playerName})` : ""
        }. Vous recevrez désormais les notifications pour ce joueur.`,
        flags: 64,
      },
    });
  } catch (error) {
    console.error(
      "[Discord Interactions] Erreur dans handleLinkLicenseCommand:",
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Discord Interactions] Détails de l'erreur:", errorMessage);

    return NextResponse.json({
      type: 4,
      data: {
        content: `❌ Erreur lors de l'association de la licence. Veuillez réessayer plus tard.`,
        flags: 64,
      },
    });
  }
}

/**
 * Gère la commande slash pour modifier l'association de licence
 */
async function handleUpdateLicenseCommand(data: DiscordInteraction) {
  try {
    // Récupérer l'ID utilisateur avec fallback
    const userId = data.member?.user?.id || data.user?.id;

    if (!userId) {
      console.error(
        "[Discord Interactions] Impossible de récupérer l'ID utilisateur"
      );
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    // Récupérer le numéro de licence via l'option nommée
    const options = data.data?.options ?? [];
    const licenseOption = options.find(
      (o: DiscordApplicationCommandOption) =>
        o.name === "licence" || o.name === "license"
    );
    const licenseNumber =
      licenseOption?.value !== undefined
        ? String(licenseOption.value)
        : undefined;

    if (!licenseNumber || typeof licenseNumber !== "string") {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Numéro de licence requis.",
          flags: 64,
        },
      });
    }

    // Valider que le numéro de licence ne contient que des chiffres
    const trimmedLicense = licenseNumber.trim();
    if (!/^\d+$/.test(trimmedLicense)) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "❌ Le numéro de licence doit contenir uniquement des chiffres.",
          flags: 64,
        },
      });
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // 1. Vérifier si l'utilisateur Discord est déjà associé à un joueur
    const existingPlayerQuery = await db
      .collection("players")
      .where("discordMentions", "array-contains", userId)
      .limit(1)
      .get();

    if (existingPlayerQuery.empty) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "❌ Vous n'êtes actuellement associé à aucune licence. Utilisez `/lier_licence` pour créer une association.",
          flags: 64,
        },
      });
    }

    const oldLicense = existingPlayerQuery.docs[0].id;
    const oldPlayerData = existingPlayerQuery.docs[0].data();

    // Si c'est la même licence, rien à faire
    if (oldLicense === trimmedLicense) {
      const playerName = `${oldPlayerData?.prenom || ""} ${
        oldPlayerData?.nom || ""
      }`.trim();

      return NextResponse.json({
        type: 4,
        data: {
          content: `✅ Vous êtes déjà associé à la licence ${trimmedLicense}${
            playerName ? ` (${playerName})` : ""
          }.`,
          flags: 64,
        },
      });
    }

    // 2. Vérifier que la nouvelle licence existe
    const newPlayerDoc = await db
      .collection("players")
      .doc(trimmedLicense)
      .get();

    if (!newPlayerDoc.exists) {
      return NextResponse.json({
        type: 4,
        data: {
          content: `❌ Aucun joueur trouvé avec la licence ${trimmedLicense}. Vérifiez que le numéro de licence est correct.`,
          flags: 64,
        },
      });
    }

    // 3. Retirer l'ID Discord de l'ancienne licence
    const oldDiscordMentions = oldPlayerData?.discordMentions || [];
    const updatedOldDiscordMentions = oldDiscordMentions.filter(
      (id: string) => id !== userId
    );

    await db.collection("players").doc(oldLicense).update({
      discordMentions: updatedOldDiscordMentions,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 4. Ajouter l'ID Discord à la nouvelle licence
    const newPlayerData = newPlayerDoc.data();
    const newDiscordMentions = newPlayerData?.discordMentions || [];

    // Vérifier si l'utilisateur est déjà dans la nouvelle licence (ne devrait pas arriver)
    if (newDiscordMentions.includes(userId)) {
      const playerName = `${newPlayerData?.prenom || ""} ${
        newPlayerData?.nom || ""
      }`.trim();

      return NextResponse.json({
        type: 4,
        data: {
          content: `✅ Vous êtes déjà associé à la licence ${trimmedLicense}${
            playerName ? ` (${playerName})` : ""
          }.`,
          flags: 64,
        },
      });
    }

    const updatedNewDiscordMentions = [...newDiscordMentions, userId];

    await db.collection("players").doc(trimmedLicense).update({
      discordMentions: updatedNewDiscordMentions,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const oldPlayerName = `${oldPlayerData?.prenom || ""} ${
      oldPlayerData?.nom || ""
    }`.trim();
    const newPlayerName = `${newPlayerData?.prenom || ""} ${
      newPlayerData?.nom || ""
    }`.trim();

    console.log(
      `[Discord Interactions] Utilisateur ${userId} a modifié son association de la licence ${oldLicense} vers ${trimmedLicense}`
    );

    return NextResponse.json({
      type: 4,
      data: {
        content: `✅ Votre association a été modifiée de la licence ${oldLicense}${
          oldPlayerName ? ` (${oldPlayerName})` : ""
        } vers la licence ${trimmedLicense}${
          newPlayerName ? ` (${newPlayerName})` : ""
        }.`,
        flags: 64,
      },
    });
  } catch (error) {
    console.error(
      "[Discord Interactions] Erreur dans handleUpdateLicenseCommand:",
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Discord Interactions] Détails de l'erreur:", errorMessage);

    return NextResponse.json({
      type: 4,
      data: {
        content: `❌ Erreur lors de la modification de l'association. Veuillez réessayer plus tard.`,
        flags: 64,
      },
    });
  }
}

/**
 * Gère la commande slash pour supprimer l'association de licence
 */
async function handleUnlinkLicenseCommand(data: DiscordInteraction) {
  try {
    // Récupérer l'ID utilisateur avec fallback
    const userId = data.member?.user?.id || data.user?.id;

    if (!userId) {
      console.error(
        "[Discord Interactions] Impossible de récupérer l'ID utilisateur"
      );
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // 1. Vérifier si l'utilisateur Discord est associé à un joueur
    const existingPlayerQuery = await db
      .collection("players")
      .where("discordMentions", "array-contains", userId)
      .limit(1)
      .get();

    if (existingPlayerQuery.empty) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Vous n'êtes actuellement associé à aucune licence.",
          flags: 64,
        },
      });
    }

    const license = existingPlayerQuery.docs[0].id;
    const playerData = existingPlayerQuery.docs[0].data();
    const discordMentions = playerData?.discordMentions || [];

    // 2. Retirer l'ID Discord du tableau
    const updatedDiscordMentions = discordMentions.filter(
      (id: string) => id !== userId
    );

    await db.collection("players").doc(license).update({
      discordMentions: updatedDiscordMentions,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const playerName = `${playerData?.prenom || ""} ${
      playerData?.nom || ""
    }`.trim();

    console.log(
      `[Discord Interactions] Utilisateur ${userId} a supprimé son association avec la licence ${license}`
    );

    return NextResponse.json({
      type: 4,
      data: {
        content: `✅ Votre association avec la licence ${license}${
          playerName ? ` (${playerName})` : ""
        } a été supprimée.`,
        flags: 64,
      },
    });
  } catch (error) {
    console.error(
      "[Discord Interactions] Erreur dans handleUnlinkLicenseCommand:",
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Discord Interactions] Détails de l'erreur:", errorMessage);

    return NextResponse.json({
      type: 4,
      data: {
        content: `❌ Erreur lors de la suppression de l'association. Veuillez réessayer plus tard.`,
        flags: 64,
      },
    });
  }
}

/**
 * Gère la commande slash pour afficher la licence associée
 */
async function handleGetLicenseCommand(data: DiscordInteraction) {
  try {
    // Récupérer l'ID utilisateur avec fallback
    const userId = data.member?.user?.id || data.user?.id;

    if (!userId) {
      console.error(
        "[Discord Interactions] Impossible de récupérer l'ID utilisateur"
      );
      return NextResponse.json({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Chercher le joueur associé à cet utilisateur Discord
    const existingPlayerQuery = await db
      .collection("players")
      .where("discordMentions", "array-contains", userId)
      .limit(1)
      .get();

    if (existingPlayerQuery.empty) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "ℹ️ Vous n'êtes actuellement associé à aucune licence. Utilisez `/lier_licence` pour créer une association.",
          flags: 64,
        },
      });
    }

    const license = existingPlayerQuery.docs[0].id;
    const playerData = existingPlayerQuery.docs[0].data();
    const playerName = `${playerData?.prenom || ""} ${
      playerData?.nom || ""
    }`.trim();

    return NextResponse.json({
      type: 4,
      data: {
        content: `📋 Vous êtes associé à la licence **${license}**${
          playerName ? ` (${playerName})` : ""
        }.`,
        flags: 64,
      },
    });
  } catch (error) {
    console.error(
      "[Discord Interactions] Erreur dans handleGetLicenseCommand:",
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Discord Interactions] Détails de l'erreur:", errorMessage);

    return NextResponse.json({
      type: 4,
      data: {
        content: `❌ Erreur lors de la récupération de votre licence. Veuillez réessayer plus tard.`,
        flags: 64,
      },
    });
  }
}
