// Forcer le runtime Node.js pour utiliser les modules crypto natifs
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
} from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import nacl from "tweetnacl";

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
