import { FFTTAPI } from "@omichalo/ffttapi-node";
import { getFFTTConfig } from "./fftt-utils";
import { FFTTJoueurDetails } from "./fftt-types";
import type { Firestore } from "firebase-admin/firestore";
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
    this.ffttApi = new FFTTAPI(config.id, config.pwd);
    this.clubCode = config.clubCode;
  }

  /**
   * Synchronise les joueurs depuis l'API FFTT avec enrichissement des détails
   */
  async syncPlayers(): Promise<PlayerSyncResult> {
    try {
      console.log("🔄 Initialisation de l'API FFTT...");
      await this.ffttApi.initialize();

      console.log(
        `📋 Récupération des joueurs pour le club ${this.clubCode}...`
      );
      const joueurs = await this.ffttApi.getJoueursByClub(this.clubCode);

      console.log(`✅ ${joueurs.length} joueurs récupérés depuis l'API FFTT`);

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
   * Maintient toujours 50 requêtes en cours jusqu'à ce que tous les joueurs soient traités
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
    const processPlayer = async (joueur: FFTTJoueur): Promise<FFTTJoueurDetails> => {
      try {
        const details = await this.getPlayerDetails(joueur.licence);
        return this.mergePlayerData(joueur, details);
      } catch (error) {
        console.warn(
          `⚠️ Erreur enrichissement joueur ${joueur.licence}:`,
          error
        );
        // Retourner les données de base si l'enrichissement échoue
        return this.mergePlayerData(joueur, null);
      }
    };

    // Fonction pour créer une promesse avec suivi
    const createTrackedPromise = (joueur: FFTTJoueur): Promise<FFTTJoueurDetails> => {
      return processPlayer(joueur).then((result) => {
        processedCount++;
        if (processedCount % 10 === 0 || processedCount === joueurs.length) {
          console.log(
            `📊 Progression: ${processedCount}/${joueurs.length} joueurs traités (${Math.round((processedCount / joueurs.length) * 100)}%)`
          );
        }
        return result;
      });
    };

    // Initialiser le pool avec les premières requêtes
    const activePromises: Array<{ promise: Promise<FFTTJoueurDetails>; index: number }> = [];
    
    // Lancer les premières requêtes
    for (let i = 0; i < Math.min(maxConcurrent, joueurs.length); i++) {
      const joueur = joueurs[currentIndex];
      currentIndex++;
      
      activePromises.push({
        promise: createTrackedPromise(joueur),
        index: i
      });
    }

    // Traiter les résultats et maintenir le pool
    while (activePromises.length > 0) {
      // Attendre qu'au moins une requête se termine
      const completedIndex = await Promise.race(
        activePromises.map((item, index) => 
          item.promise.then(() => index)
        )
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
          index: activePromises.length
        });
      }
    }

    console.log(
      `✅ Enrichissement terminé: ${enrichedPlayers.length} joueurs traités`
    );
    return enrichedPlayers;
  }

  /**
   * Récupère les détails d'un joueur via getJoueurDetailsByLicence
   */
  private async getPlayerDetails(licence: string): Promise<any> {
    try {
      const details = await this.ffttApi.getJoueurDetailsByLicence(licence);
      return details;
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
    details: any | null
  ): FFTTJoueurDetails {
    const enrichedPlayer: FFTTJoueurDetails = {
      licence: baseJoueur.licence,
      nom: baseJoueur.nom,
      prenom: baseJoueur.prenom,
      points: baseJoueur.points || 0,
      sexe: baseJoueur.sexe || "M",
      club: baseJoueur.club || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Ajouter les détails enrichis si disponibles
    if (details) {
      enrichedPlayer.classement = String(
        details.classement || details.classementGlobal || ""
      );
      enrichedPlayer.categorie = String(details.categorie || details.cat || "");
      enrichedPlayer.nationalite = String(
        details.natio || details.nationalite || ""
      );
      enrichedPlayer.dateNaissance = String(
        details.dateNaissance || details.dateNais || ""
      );
      enrichedPlayer.lieuNaissance = String(
        details.lieuNaissance || details.lieuNais || ""
      );
      enrichedPlayer.datePremiereLicence = String(
        details.datePremiereLicence || details.datePremiereLic || ""
      );
      enrichedPlayer.clubPrecedent = String(
        details.clubPrecedent || details.clubPrec || ""
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
   */
  async savePlayersToFirestore(
    players: FFTTJoueurDetails[],
    db: Firestore
  ): Promise<{ saved: number; errors: number }> {
    let saved = 0;
    const errors = 0;

    try {
      console.log(
        `💾 Sauvegarde de ${players.length} joueurs enrichis dans Firestore...`
      );

      // Traitement par batch pour éviter les limites Firestore
      const batchSize = 500;
      for (let i = 0; i < players.length; i += batchSize) {
        const batch = db.batch();
        const batchEnd = Math.min(i + batchSize, players.length);

        for (let j = i; j < batchEnd; j++) {
          const player = players[j];
          const docRef = db.collection("players").doc(player.licence);

          // Filtrer les valeurs undefined et préparer les données pour Firestore
          const playerData = Object.fromEntries(
            Object.entries(player).filter(([, value]) => value !== undefined)
          );

          // Convertir les dates en Timestamp Firestore
          if (playerData.createdAt) {
            playerData.createdAt = Timestamp.fromDate(playerData.createdAt);
          }
          if (playerData.updatedAt) {
            playerData.updatedAt = Timestamp.fromDate(playerData.updatedAt);
          }

          batch.set(docRef, playerData, { merge: true });
          saved++;
        }

        await batch.commit();
        console.log(
          `✅ Batch ${
            Math.floor(i / batchSize) + 1
          } sauvegardé (${saved} joueurs enrichis)`
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
