#!/usr/bin/env ts-node
/**
 * Script pour enregistrer la commande slash Discord `/lier_licence`
 *
 * Usage:
 *   npm run discord:register-command
 *   npm run discord:register-command -- --no-env-file
 *
 * Options:
 *   --no-env-file: Utilise uniquement les variables d'environnement système, ignore les fichiers .env.local et .env
 *
 * Variables d'environnement requises:
 *   - DISCORD_TOKEN: Token du bot Discord
 *   - DISCORD_APPLICATION_ID: ID de l'application Discord
 *   - DISCORD_SERVER_ID ou DISCORD_GUILD_ID (optionnel): ID du serveur pour enregistrer sur un serveur spécifique
 */

// Charger les variables d'environnement depuis .env.local
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Vérifier si le flag --no-env-file est présent
const useEnvOnly = process.argv.includes("--no-env-file");

// Charger .env.local si disponible (sauf si --no-env-file est spécifié)
if (!useEnvOnly) {
  const envLocalPath = path.join(__dirname, "..", ".env.local");
  const envPath = path.join(__dirname, "..", ".env");

  if (fs.existsSync(envLocalPath)) {
    console.log("📄 Chargement des variables depuis .env.local");
    dotenv.config({ path: envLocalPath });
  } else if (fs.existsSync(envPath)) {
    console.log("📄 Chargement des variables depuis .env");
    dotenv.config({ path: envPath });
  } else {
    console.log(
      "⚠️  Aucun fichier .env.local ou .env trouvé, utilisation des variables d'environnement système"
    );
  }
} else {
  console.log(
    "🔧 Mode --no-env-file activé: utilisation uniquement des variables d'environnement système"
  );
}

import { REST, Routes } from "discord.js";

// Configuration - récupérer depuis les variables d'environnement (chargées depuis .env.local ou système)
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
// Accepter DISCORD_SERVER_ID ou DISCORD_GUILD_ID (synonymes dans Discord)
const DISCORD_GUILD_ID =
  process.env.DISCORD_SERVER_ID || process.env.DISCORD_GUILD_ID; // Optionnel, pour enregistrer sur un serveur spécifique

// Afficher les variables trouvées (sans afficher les valeurs sensibles)
console.log("\n🔍 Variables d'environnement détectées:");
console.log(`   DISCORD_TOKEN: ${DISCORD_TOKEN ? "✅ défini" : "❌ manquant"}`);
console.log(
  `   DISCORD_APPLICATION_ID: ${
    DISCORD_APPLICATION_ID ? "✅ défini" : "❌ manquant"
  }`
);
if (process.env.DISCORD_SERVER_ID) {
  console.log(
    `   DISCORD_SERVER_ID: ✅ défini (enregistrement sur serveur spécifique)`
  );
} else if (process.env.DISCORD_GUILD_ID) {
  console.log(
    `   DISCORD_GUILD_ID: ✅ défini (enregistrement sur serveur spécifique)`
  );
} else {
  console.log(
    `   DISCORD_SERVER_ID / DISCORD_GUILD_ID: ⚠️  non défini (enregistrement global)`
  );
}

// Vérifier les variables d'environnement requises
if (!DISCORD_TOKEN) {
  console.error("\n❌ Erreur: DISCORD_TOKEN n'est pas défini");
  console.error("   Définissez-le dans votre fichier .env.local ou .env");
  console.error("   Exemple: DISCORD_TOKEN=votre_token_bot");
  process.exit(1);
}

if (!DISCORD_APPLICATION_ID) {
  console.error("\n❌ Erreur: DISCORD_APPLICATION_ID n'est pas défini");
  console.error(
    "   Vous pouvez le trouver dans Discord Developer Portal > Application > General Information > Application ID"
  );
  console.error("   Exemple: DISCORD_APPLICATION_ID=123456789012345678");
  process.exit(1);
}

// Définition de la commande slash
// defaultMemberPermissions: null permet à tous les membres d'utiliser les commandes
// (par défaut, les commandes sont accessibles à tous, mais on l'explicite pour être sûr)
const commands = [
  {
    name: "lier_licence",
    description: "Lier votre compte Discord à votre numéro de licence",
    defaultMemberPermissions: null, // Accessible à tous les membres
    options: [
      {
        name: "licence",
        description: "Votre numéro de licence",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "modifier_licence",
    description:
      "Modifier votre association Discord vers une autre licence",
    defaultMemberPermissions: null, // Accessible à tous les membres
    options: [
      {
        name: "licence",
        description: "Nouveau numéro de licence",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "supprimer_licence",
    description:
      "Supprimer l'association entre votre compte Discord et votre licence",
    defaultMemberPermissions: null, // Accessible à tous les membres
    options: [],
  },
  {
    name: "ma_licence",
    description:
      "Afficher la licence à laquelle votre compte Discord est associé",
    defaultMemberPermissions: null, // Accessible à tous les membres
    options: [],
  },
  // Versions anglaises optionnelles
  {
    name: "link_license",
    description: "Link your Discord account to your FFTT license number",
    defaultMemberPermissions: null, // Accessible à tous les membres
    options: [
      {
        name: "license",
        description: "Your FFTT license number",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "update_license",
    description: "Update your Discord association to a different FFTT license",
    defaultMemberPermissions: null, // Accessible à tous les membres
    options: [
      {
        name: "license",
        description: "New FFTT license number",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "unlink_license",
    description:
      "Remove the association between your Discord account and your FFTT license",
    defaultMemberPermissions: null, // Accessible à tous les membres
    options: [],
  },
  {
    name: "my_license",
    description:
      "Display the FFTT license associated with your Discord account",
    defaultMemberPermissions: null, // Accessible à tous les membres
    options: [],
  },
];

// Initialiser le client REST Discord
const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log("🚀 Enregistrement des commandes slash Discord...");

    let data: unknown;

    if (DISCORD_GUILD_ID && DISCORD_APPLICATION_ID) {
      // Enregistrer sur un serveur spécifique (plus rapide, pour le développement)
      console.log(
        `📝 Enregistrement des commandes pour le serveur ${DISCORD_GUILD_ID}...`
      );
      data = await rest.put(
        Routes.applicationGuildCommands(
          DISCORD_APPLICATION_ID,
          DISCORD_GUILD_ID
        ),
        { body: commands }
      );
      console.log(
        "✅ Commandes enregistrées avec succès pour ce serveur (guild)"
      );
    } else if (DISCORD_APPLICATION_ID) {
      // Enregistrer globalement (tous les serveurs, peut prendre jusqu'à 1 heure)
      console.log(
        "📝 Enregistrement des commandes globalement (tous les serveurs)..."
      );
      console.log(
        "   ⚠️  Note: Les commandes globales peuvent prendre jusqu'à 1 heure pour apparaître"
      );
      data = await rest.put(
        Routes.applicationCommands(DISCORD_APPLICATION_ID),
        { body: commands }
      );
      console.log("✅ Commandes enregistrées avec succès globalement");
    }

    const commandsArray = data as Array<{ id: string; name: string }>;
    console.log(`\n📋 Commandes enregistrées (${commandsArray.length}):`);
    commandsArray.forEach((cmd) => {
      console.log(`   - /${cmd.name} (ID: ${cmd.id})`);
    });

    console.log(
      "\n✨ Terminé ! Les commandes sont maintenant disponibles dans Discord."
    );
    if (!DISCORD_GUILD_ID) {
      console.log(
        "   ⏳ Attendez quelques minutes si les commandes n'apparaissent pas immédiatement."
      );
    }
  } catch (error) {
    console.error("❌ Erreur lors de l'enregistrement des commandes:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.message.includes("401")) {
        console.error(
          "   → Vérifiez que DISCORD_TOKEN est correct et que le bot est bien configuré"
        );
      } else if (error.message.includes("404")) {
        console.error("   → Vérifiez que DISCORD_APPLICATION_ID est correct");
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Exécuter le script
registerCommands();
