import { FFTTAPI } from "@omichalo/ffttapi-node";
import { getFFTTConfig } from "./fftt-utils";

export interface PlayerSyncResult {
  success: boolean;
  playersCount: number;
  message: string;
  error?: string;
  processedPlayers?: any[];
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
   * Synchronise les joueurs depuis l'API FFTT
   */
  async syncPlayers(): Promise<PlayerSyncResult> {
    try {
      console.log("🔄 Initialisation de l'API FFTT...");
      await this.ffttApi.initialize();

      console.log(`📋 Récupération des joueurs pour le club ${this.clubCode}...`);
      const joueurs = await this.ffttApi.getJoueursByClub(this.clubCode);
      
      console.log(`✅ ${joueurs.length} joueurs récupérés depuis l'API FFTT`);

      // Traitement des joueurs
      const processedPlayers = joueurs.map((joueur: any) => ({
        licence: joueur.licence,
        nom: joueur.nom,
        prenom: joueur.prenom,
        points: joueur.points || 0,
        sexe: joueur.sexe || "M",
        club: joueur.club || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      return {
        success: true,
        playersCount: processedPlayers.length,
        message: `Synchronisation réussie: ${processedPlayers.length} joueurs`,
        processedPlayers,
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
   * Sauvegarde les joueurs dans Firestore
   */
  async savePlayersToFirestore(
    players: any[],
    db: any
  ): Promise<{ saved: number; errors: number }> {
    let saved = 0;
    let errors = 0;

    try {
      console.log(`💾 Sauvegarde de ${players.length} joueurs dans Firestore...`);

      // Traitement par batch pour éviter les limites Firestore
      const batchSize = 500;
      for (let i = 0; i < players.length; i += batchSize) {
        const batch = db.batch();
        const batchEnd = Math.min(i + batchSize, players.length);

        for (let j = i; j < batchEnd; j++) {
          const player = players[j];
          const docRef = db.collection("players").doc(player.licence);
          
          // Filtrer les valeurs undefined
          const playerData = Object.fromEntries(
            Object.entries(player).filter(([_, value]) => value !== undefined)
          );
          
          batch.set(docRef, playerData);
          saved++;
        }

        await batch.commit();
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} sauvegardé (${saved} joueurs)`);
      }

      // Mettre à jour les métadonnées
      await db.collection("metadata").doc("lastSync").set(
        {
          players: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log(`✅ Synchronisation terminée: ${saved} joueurs sauvegardés`);
      return { saved, errors };
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      return { saved, errors: players.length - saved };
    }
  }
}
