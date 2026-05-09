import { FieldValue } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin, initializeFirebaseAdmin } from "@/lib/firebase-admin";
import type {
  DiscordApplicationCommandOption,
  DiscordInteraction,
} from "./types";

function getInteractionUserId(data: DiscordInteraction): string | null {
  return data.member?.user?.id || data.user?.id || null;
}

function getLicenseOption(data: DiscordInteraction): string | undefined {
  const options = data.data?.options ?? [];
  const licenseOption = options.find(
    (o: DiscordApplicationCommandOption) =>
      o.name === "licence" || o.name === "license"
  );
  return licenseOption?.value !== undefined
    ? String(licenseOption.value)
    : undefined;
}

function validateLicenseNumber(licenseNumber: string | undefined) {
  if (!licenseNumber || typeof licenseNumber !== "string") {
    return {
      valid: false as const,
      response: jsonNoStore({
        type: 4,
        data: { content: "❌ Erreur: Numéro de licence requis.", flags: 64 },
      }),
    };
  }

  const trimmedLicense = licenseNumber.trim();
  if (!/^\d+$/.test(trimmedLicense)) {
    return {
      valid: false as const,
      response: jsonNoStore({
        type: 4,
        data: {
          content: "❌ Le numéro de licence doit contenir uniquement des chiffres.",
          flags: 64,
        },
      }),
    };
  }

  return { valid: true as const, trimmedLicense };
}

export async function handleLinkLicenseCommand(data: DiscordInteraction) {
  try {
    const userId = getInteractionUserId(data);
    if (!userId) {
      console.error(
        "[Discord Interactions] Impossible de récupérer l'ID utilisateur"
      );
      return jsonNoStore({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    const licenseValidation = validateLicenseNumber(getLicenseOption(data));
    if (!licenseValidation.valid) return licenseValidation.response;
    const trimmedLicense = licenseValidation.trimmedLicense;

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

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

      return jsonNoStore({
        type: 4,
        data: {
          content: `❌ Un utilisateur Discord ne peut être associé qu'à un seul joueur. Vous êtes déjà associé à la licence ${existingLicense}${
            existingPlayerName ? ` (${existingPlayerName})` : ""
          }.`,
          flags: 64,
        },
      });
    }

    const playerDoc = await db.collection("players").doc(trimmedLicense).get();
    if (!playerDoc.exists) {
      return jsonNoStore({
        type: 4,
        data: {
          content: `❌ Aucun joueur trouvé avec la licence ${trimmedLicense}. Vérifiez que le numéro de licence est correct.`,
          flags: 64,
        },
      });
    }

    const playerData = playerDoc.data();
    const existingDiscordMentions = playerData?.discordMentions || [];
    if (existingDiscordMentions.includes(userId)) {
      const playerName = `${playerData?.prenom || ""} ${
        playerData?.nom || ""
      }`.trim();

      return jsonNoStore({
        type: 4,
        data: {
          content: `ℹ️ Vous êtes déjà associé à la licence ${trimmedLicense}${
            playerName ? ` (${playerName})` : ""
          }. Aucune modification n'est nécessaire.`,
          flags: 64,
        },
      });
    }

    await db.collection("players").doc(trimmedLicense).update({
      discordMentions: [...existingDiscordMentions, userId],
      updatedAt: FieldValue.serverTimestamp(),
    });

    const playerName = `${playerData?.prenom || ""} ${
      playerData?.nom || ""
    }`.trim();

    return jsonNoStore({
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
    return jsonNoStore({
      type: 4,
      data: {
        content:
          "❌ Erreur lors de l'association de la licence. Veuillez réessayer plus tard.",
        flags: 64,
      },
    });
  }
}

export async function handleUpdateLicenseCommand(data: DiscordInteraction) {
  try {
    const userId = getInteractionUserId(data);
    if (!userId) {
      return jsonNoStore({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    const licenseValidation = validateLicenseNumber(getLicenseOption(data));
    if (!licenseValidation.valid) return licenseValidation.response;
    const trimmedLicense = licenseValidation.trimmedLicense;

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    const existingPlayerQuery = await db
      .collection("players")
      .where("discordMentions", "array-contains", userId)
      .limit(1)
      .get();

    if (existingPlayerQuery.empty) {
      return jsonNoStore({
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
    if (oldLicense === trimmedLicense) {
      const playerName = `${oldPlayerData?.prenom || ""} ${
        oldPlayerData?.nom || ""
      }`.trim();
      return jsonNoStore({
        type: 4,
        data: {
          content: `✅ Vous êtes déjà associé à la licence ${trimmedLicense}${
            playerName ? ` (${playerName})` : ""
          }.`,
          flags: 64,
        },
      });
    }

    const newPlayerDoc = await db.collection("players").doc(trimmedLicense).get();
    if (!newPlayerDoc.exists) {
      return jsonNoStore({
        type: 4,
        data: {
          content: `❌ Aucun joueur trouvé avec la licence ${trimmedLicense}. Vérifiez que le numéro de licence est correct.`,
          flags: 64,
        },
      });
    }

    const oldDiscordMentions = oldPlayerData?.discordMentions || [];
    await db.collection("players").doc(oldLicense).update({
      discordMentions: oldDiscordMentions.filter((id: string) => id !== userId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const newPlayerData = newPlayerDoc.data();
    const newDiscordMentions = newPlayerData?.discordMentions || [];
    if (!newDiscordMentions.includes(userId)) {
      await db.collection("players").doc(trimmedLicense).update({
        discordMentions: [...newDiscordMentions, userId],
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const oldPlayerName = `${oldPlayerData?.prenom || ""} ${
      oldPlayerData?.nom || ""
    }`.trim();
    const newPlayerName = `${newPlayerData?.prenom || ""} ${
      newPlayerData?.nom || ""
    }`.trim();

    return jsonNoStore({
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
    return jsonNoStore({
      type: 4,
      data: {
        content:
          "❌ Erreur lors de la modification de l'association. Veuillez réessayer plus tard.",
        flags: 64,
      },
    });
  }
}

export async function handleUnlinkLicenseCommand(data: DiscordInteraction) {
  try {
    const userId = getInteractionUserId(data);
    if (!userId) {
      return jsonNoStore({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    const existingPlayerQuery = await db
      .collection("players")
      .where("discordMentions", "array-contains", userId)
      .limit(1)
      .get();

    if (existingPlayerQuery.empty) {
      return jsonNoStore({
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

    await db.collection("players").doc(license).update({
      discordMentions: discordMentions.filter((id: string) => id !== userId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const playerName = `${playerData?.prenom || ""} ${
      playerData?.nom || ""
    }`.trim();

    return jsonNoStore({
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
    return jsonNoStore({
      type: 4,
      data: {
        content:
          "❌ Erreur lors de la suppression de l'association. Veuillez réessayer plus tard.",
        flags: 64,
      },
    });
  }
}

export async function handleGetLicenseCommand(data: DiscordInteraction) {
  try {
    const userId = getInteractionUserId(data);
    if (!userId) {
      return jsonNoStore({
        type: 4,
        data: {
          content: "❌ Erreur: Impossible de récupérer votre ID Discord.",
          flags: 64,
        },
      });
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    const existingPlayerQuery = await db
      .collection("players")
      .where("discordMentions", "array-contains", userId)
      .limit(1)
      .get();

    if (existingPlayerQuery.empty) {
      return jsonNoStore({
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

    return jsonNoStore({
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
    return jsonNoStore({
      type: 4,
      data: {
        content:
          "❌ Erreur lors de la récupération de votre licence. Veuillez réessayer plus tard.",
        flags: 64,
      },
    });
  }
}
