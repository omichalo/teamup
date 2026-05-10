import { FFTTAPI } from "@omichalo/ffttapi-node";
import { createFFTTAPI, getFFTTConfig } from "./fftt-utils";
import { FFTTJoueurDetails } from "./fftt-types";
import type { Firestore, DocumentReference } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";

export interface PlayerSyncResult {
  success: boolean;
  playersCount: number;
  message: string;
  error?: string;
  processedPlayers?: FFTTJoueurDetails[];
}

export interface FFTTJoueur {
  licence: string;
  nom: string;
  prenom: string;
  points: number | null | undefined;
  sexe?: string;
  club?: string;
}

/**
 * Service partagé pour la synchronisation des joueurs
 * Utilisé par les Cloud Functions et les API routes
 */
export class PlayerSyncService {
  private ffttApi: FFTTAPI;
  private clubCode: string;

  constructor() {
    const config = getFFTTConfig();
    this.ffttApi = createFFTTAPI();
    this.clubCode = config.clubCode;
  }

  /**
   * Synchronise les joueurs depuis l&apos;API FFTT avec enrichissement des détails
   */
  async syncPlayers(): Promise<PlayerSyncResult> {
    try {
      console.log("🔄 Initialisation de l&apos;API FFTT...");
      await this.ffttApi.initialize();

      console.log(
        `📋 Récupération des joueurs pour le club ${this.clubCode}...`
      );
      const joueurs = await this.ffttApi.getJoueursByClub(this.clubCode);

      console.log(`✅ ${joueurs.length} joueurs récupérés depuis l&apos;API FFTT`);

      // Enrichir les données des joueurs avec getJoueurDetailsByLicence
      console.log("🔍 Enrichissement des données des joueurs...");
      const enrichedPlayers = await this.enrichPlayersData(
        joueurs as FFTTJoueur[]
      );

      return {
        success: true,
        playersCount: enrichedPlayers.length,
        message: `Synchronisation réussie: ${enrichedPlayers.length} joueurs enrichis`,
        processedPlayers: enrichedPlayers,
      };
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation des joueurs:", error);
      return {
        success: false,
        playersCount: 0,
        message: "Erreur lors de la synchronisation",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Enrichit les données des joueurs avec un pool de requêtes concurrentes
   * Maintient toujours 50 requêtes en cours jusqu&apos;à ce que tous les joueurs soient traités
   */
  private async enrichPlayersData(
    joueurs: FFTTJoueur[]
  ): Promise<FFTTJoueurDetails[]> {
    const maxConcurrent = 50; // Maintenir 50 requêtes en cours
    const enrichedPlayers: FFTTJoueurDetails[] = [];
    let processedCount = 0;
    let currentIndex = 0;

    console.log(
      `🔄 Enrichissement de ${joueurs.length} joueurs avec pool de ${maxConcurrent} requêtes concurrentes...`
    );

    // Créer un pool de promesses qui se maintient à 50 requêtes
    const processPlayer = async (
      joueur: FFTTJoueur
    ): Promise<FFTTJoueurDetails> => {
      try {
        const details = await this.getPlayerDetails(joueur.licence);
        return this.mergePlayerData(joueur, details);
      } catch (error) {
        console.warn(
          `⚠️ Erreur enrichissement joueur ${joueur.licence}:`,
          error
        );
        // Retourner les données de base si l&apos;enrichissement échoue
        return this.mergePlayerData(joueur, null);
      }
    };

    // Fonction pour créer une promesse avec suivi
    const createTrackedPromise = (
      joueur: FFTTJoueur
    ): Promise<FFTTJoueurDetails> => {
      return processPlayer(joueur).then((result) => {
        processedCount++;
        if (processedCount % 10 === 0 || processedCount === joueurs.length) {
          console.log(
            `📊 Progression: ${processedCount}/${
              joueurs.length
            } joueurs traités (${Math.round(
              (processedCount / joueurs.length) * 100
            )}%)`
          );
        }
        return result;
      });
    };

    // Initialiser le pool avec les premières requêtes
    const activePromises: Array<{
      promise: Promise<FFTTJoueurDetails>;
      index: number;
    }> = [];

    // Lancer les premières requêtes
    for (let i = 0; i < Math.min(maxConcurrent, joueurs.length); i++) {
      const joueur = joueurs[currentIndex];
      currentIndex++;

      activePromises.push({
        promise: createTrackedPromise(joueur),
        index: i,
      });
    }

    // Traiter les résultats et maintenir le pool
    while (activePromises.length > 0) {
      // Attendre qu&apos;au moins une requête se termine
      const completedIndex = await Promise.race(
        activePromises.map((item, index) => item.promise.then(() => index))
      );

      // Récupérer le résultat
      const completedItem = activePromises[completedIndex];
      const result = await completedItem.promise;

      // Ajouter le résultat
      enrichedPlayers.push(result);

      // Retirer la promesse terminée du pool
      activePromises.splice(completedIndex, 1);

      // Lancer une nouvelle requête si il reste des joueurs à traiter
      if (currentIndex < joueurs.length) {
        const joueur = joueurs[currentIndex];
        currentIndex++;

        activePromises.push({
          promise: createTrackedPromise(joueur),
          index: activePromises.length,
        });
      }
    }

    console.log(
      `✅ Enrichissement terminé: ${enrichedPlayers.length} joueurs traités`
    );
    return enrichedPlayers;
  }

  /**
   * Récupère les détails d&apos;un joueur via getJoueurDetailsByLicence
   */
  private async getPlayerDetails(
    licence: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const details = await this.ffttApi.getJoueurDetailsByLicence(licence);
      return details as unknown as Record<string, unknown>;
    } catch (error) {
      console.warn(
        `⚠️ Impossible de récupérer les détails pour la licence ${licence}:`,
        error
      );
      return null;
    }
  }

  /**
   * Fusionne les données de base avec les détails enrichis
   */
  private mergePlayerData(
    baseJoueur: FFTTJoueur,
    details: Record<string, unknown> | null
  ): FFTTJoueurDetails {
    // Déterminer le sexe correctement
    let sexe = "M"; // Par défaut masculin
    if (details && details.isHomme !== undefined) {
      // Si isHomme est true, alors c&apos;est un homme (M), sinon c&apos;est une femme (F)
      sexe = details.isHomme ? "M" : "F";
    } else if (baseJoueur.sexe) {
      // Fallback sur le champ sexe si disponible
      sexe = baseJoueur.sexe;
    }

    const enrichedPlayer: FFTTJoueurDetails = {
      licence: baseJoueur.licence,
      nom: baseJoueur.nom,
      prenom: baseJoueur.prenom,
      points: baseJoueur.points || 0,
      sexe: sexe,
      club: baseJoueur.club || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Ajouter les détails enrichis si disponibles
    if (details) {
      enrichedPlayer.classement = String(
        (details.classement as string) ||
          (details.classementGlobal as string) ||
          ""
      );
      enrichedPlayer.categorie = String(
        (details.categorie as string) || (details.cat as string) || ""
      );
      enrichedPlayer.nationalite = String(
        (details.natio as string) || (details.nationalite as string) || ""
      );
      enrichedPlayer.dateNaissance = String(
        (details.dateNaissance as string) || (details.dateNais as string) || ""
      );
      enrichedPlayer.lieuNaissance = String(
        (details.lieuNaissance as string) || (details.lieuNais as string) || ""
      );
      enrichedPlayer.datePremiereLicence = String(
        (details.datePremiereLicence as string) ||
          (details.datePremiereLic as string) ||
          ""
      );
      enrichedPlayer.clubPrecedent = String(
        (details.clubPrecedent as string) || (details.clubPrec as string) || ""
      );

      // Ajouter tous les autres champs disponibles
      Object.keys(details).forEach((key) => {
        if (
          !enrichedPlayer.hasOwnProperty(key) &&
          details[key] !== null &&
          details[key] !== undefined
        ) {
          enrichedPlayer[key] = details[key];
        }
      });
    }

    return enrichedPlayer;
  }

  /**
   * Sauvegarde les joueurs enrichis dans Firestore
   * Optimisé : récupère tous les documents existants en une seule requête par batch
   */
  async savePlayersToFirestore(
    players: FFTTJoueurDetails[],
    db: Firestore
  ): Promise<{ saved: number; errors: number }> {
    let saved = 0;
    let errors = 0;

    try {
      console.log(
        `💾 Sauvegarde de ${players.length} joueurs enrichis dans Firestore...`
      );

      // Traitement par batch pour éviter les limites Firestore
      const batchSize = 500;
      for (let i = 0; i < players.length; i += batchSize) {
        const batchEnd = Math.min(i + batchSize, players.length);
        const batchPlayers = players.slice(i, batchEnd);

        // OPTIMISATION : Récupérer tous les documents existants en une seule requête
        // au lieu de faire une requête par joueur
        // Note: getAll() peut récupérer jusqu'à 10 documents à la fois
        const docRefs = batchPlayers.map((player) =>
          db.collection("players").doc(player.licence)
        );
        
        console.log(
          `📥 Récupération des données existantes pour le batch ${
            Math.floor(i / batchSize) + 1
          } (${docRefs.length} documents)...`
        );
        
        // Créer une Map pour un accès rapide aux données existantes
        const existingDataMap = new Map<string, Record<string, unknown>>();
        
        // getAll() peut récupérer jusqu'à 10 documents à la fois
        // Diviser en sous-batches de 10 et les traiter en parallèle pour optimiser
        const getAllBatchSize = 10;
        const getAllBatches: Array<Array<DocumentReference>> = [];
        
        for (let k = 0; k < docRefs.length; k += getAllBatchSize) {
          getAllBatches.push(docRefs.slice(k, k + getAllBatchSize));
        }
        
        // Traiter les batches getAll() en parallèle (max 5 à la fois pour ne pas surcharger)
        const maxConcurrentGetAll = 5;
        for (let k = 0; k < getAllBatches.length; k += maxConcurrentGetAll) {
          const concurrentBatches = getAllBatches.slice(k, k + maxConcurrentGetAll);
          const getAllPromises = concurrentBatches.map((batch) => db.getAll(...batch));
          
          const results = await Promise.all(getAllPromises);
          
          results.forEach((docs) => {
            docs.forEach((doc) => {
              if (doc.exists) {
                existingDataMap.set(doc.id, doc.data() as Record<string, unknown>);
              }
            });
          });
        }

        // Préparer le batch d'écriture
        const batch = db.batch();

        // Préserver UNIQUEMENT les champs de gestion qui ne viennent pas de l'API FFTT
        // Ces champs sont gérés manuellement par l'utilisateur et ne doivent pas être écrasés
        const userManagedFields = [
          "discordMentions",
          "participation",
          "preferredTeams",
          "isTemporary",
          "isWheelchair", // Préservé car géré manuellement par l'utilisateur (non remonté par l'API FFTT)
          "hasPlayedAtLeastOneMatch", // Préservé car géré par la synchro des matchs
          "highestMasculineTeamNumberByPhase", // Préservé car géré par la synchro des matchs (règles de brûlage par phase)
          "highestFeminineTeamNumberByPhase", // Préservé car géré par la synchro des matchs (règles de brûlage par phase)
          "masculineMatchesByTeamByPhase", // Préservé car géré par la synchro des matchs (affichage du brûlage par phase)
          "feminineMatchesByTeamByPhase", // Préservé car géré par la synchro des matchs (affichage du brûlage par phase)
        ];

        for (const player of batchPlayers) {
          try {
            const docRef = db.collection("players").doc(player.licence);
            const existingData = existingDataMap.get(player.licence) || {};

            // Filtrer les valeurs undefined et préparer les données pour Firestore
            const playerData = Object.fromEntries(
              Object.entries(player).filter(([, value]) => value !== undefined)
            );

            // Si le joueur existant est temporaire, tout écraser (ne pas préserver les champs userManagedFields)
            const isExistingTemporary = existingData.isTemporary === true;
            
            if (!isExistingTemporary) {
              // Préserver les champs de gestion uniquement si le joueur n'est pas temporaire
              userManagedFields.forEach((field) => {
                // Préserver le champ s'il existe dans les données existantes (même s'il est vide/null)
                // Ces champs ne viennent pas de l'API FFTT et doivent être préservés
                if (existingData && existingData[field] !== undefined) {
                  playerData[field] = existingData[field];
                }
              });
            } else {
              // Si le joueur est temporaire, tout écraser et marquer comme non temporaire
              playerData.isTemporary = false;
            }

            // Convertir les dates en Timestamp Firestore
            if (playerData.createdAt instanceof Date) {
              playerData.createdAt = Timestamp.fromDate(playerData.createdAt);
            }
            if (playerData.updatedAt instanceof Date) {
              playerData.updatedAt = Timestamp.fromDate(playerData.updatedAt);
            }

            batch.set(docRef, playerData, { merge: true });
            saved++;
          } catch (playerError) {
            console.error(
              `❌ Erreur lors de la préparation du joueur ${player.licence}:`,
              playerError
            );
            errors++;
          }
        }

        // Commiter le batch
        await batch.commit();
        console.log(
          `✅ Batch ${
            Math.floor(i / batchSize) + 1
          } sauvegardé (${saved} joueurs enrichis, ${errors} erreurs)`
        );
      }

      // Mettre à jour les métadonnées
      await db.collection("metadata").doc("lastSync").set(
        {
          players: new Date(),
          playersEnriched: true,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log(
        `✅ Synchronisation terminée: ${saved} joueurs enrichis sauvegardés`
      );
      return { saved, errors };
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      return { saved, errors: players.length - saved };
    }
  }
}
