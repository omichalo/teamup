import { FFTTAPI } from "@omichalo/ffttapi-node";
import { getFFTTConfig, createFFTTAPI, createBaseMatch, enrichPlayerData } from "./fftt-utils";
import { FFTTEquipe, FFTTRencontre, FFTTDetailsRencontre } from "./fftt-types";

export interface MatchSyncResult {
  success: boolean;
  matchesCount: number;
  message: string;
  error?: string;
  matches?: any[];
}

/**
 * Service partagé pour la synchronisation des matchs
 * Utilisé par les Cloud Functions et les API routes
 */
export class MatchSyncService {
  private ffttApi: FFTTAPI;
  private clubCode: string;

  constructor() {
    const config = getFFTTConfig();
    this.ffttApi = new FFTTAPI(config.id, config.pwd);
    this.clubCode = config.clubCode;
  }

  /**
   * Synchronise les matchs depuis l'API FFTT
   */
  async syncMatches(): Promise<MatchSyncResult> {
    try {
      console.log("🔄 Initialisation de l'API FFTT...");
      await this.ffttApi.initialize();

      // Récupérer les équipes du club
      const equipes = await this.ffttApi.getEquipesByClub(this.clubCode);
      console.log(`📋 ${equipes.length} équipes trouvées pour le club ${this.clubCode}`);

      // Filtrer les équipes pour les épreuves spécifiques
      const filteredEquipes = equipes.filter(
        (equipe: FFTTEquipe) => equipe.idEpreuve === 15954 || equipe.idEpreuve === 15955
      );
      console.log(`Équipes filtrées (épreuves 15954 et 15955): ${filteredEquipes.length}`);

      // Récupérer tous les matchs en parallèle
      console.log(`🚀 Parallélisation de ${filteredEquipes.length} appels API...`);
      const allMatches = await this.fetchAllMatches(filteredEquipes);

      // Traiter les matchs avec scores pour récupérer les détails
      const matchesWithScores = allMatches.filter(
        (match) => match.score && match.score !== "null-null"
      );
      
      console.log(`🔥🔥🔥 MATCHS AVEC SCORES DÉTECTÉS: ${matchesWithScores.length} 🔥🔥🔥`);

      if (matchesWithScores.length > 0) {
        await this.processMatchDetails(matchesWithScores);
      }

      console.log(`✅ Synchronisation terminée: ${allMatches.length} matchs récupérés`);
      return {
        success: true,
        matchesCount: allMatches.length,
        message: `Synchronisation réussie: ${allMatches.length} matchs`,
        matches: allMatches,
      };
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation des matchs:", error);
      return {
        success: false,
        matchesCount: 0,
        message: "Erreur lors de la synchronisation",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Récupère tous les matchs en parallèle
   */
  private async fetchAllMatches(equipes: FFTTEquipe[]): Promise<any[]> {
    const allMatches: any[] = [];

    // Récupérer les matchs pour chaque équipe en parallèle
    const matchPromises = equipes.map(async (equipe) => {
      console.log(`Récupération des matchs pour l'équipe: ${equipe.libelle}`);
      try {
        const rencontres = await this.ffttApi.getRencontrePouleByLienDivision(
          equipe.lienDivision
        );
        
        console.log(`Matchs trouvés pour ${equipe.libelle}: ${rencontres.length}`);
        
        return rencontres.map((rencontre: FFTTRencontre) => 
          createBaseMatch(rencontre, equipe, this.clubCode)
        );
      } catch (error) {
        console.error(`❌ Erreur pour l'équipe ${equipe.libelle}:`, error);
        return [];
      }
    });

    const results = await Promise.all(matchPromises);
    results.forEach(matches => allMatches.push(...matches));

    console.log("✅ Tous les appels API terminés !");
    return allMatches;
  }

  /**
   * Traite les détails des matchs avec scores
   */
  private async processMatchDetails(matchesWithScores: any[]): Promise<void> {
    const BATCH_SIZE = 3;
    const BATCH_DELAY = 1000;

    console.log(`🚀 Traitement par batch de ${matchesWithScores.length} appels de détails...`);

    for (let i = 0; i < matchesWithScores.length; i += BATCH_SIZE) {
      const batch = matchesWithScores.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(matchesWithScores.length / BATCH_SIZE);

      console.log(`📦 Traitement du batch ${batchNumber}/${totalBatches} (${batch.length} appels)`);

      const batchPromises = batch.map(async (match) => {
        try {
          console.log(`Récupération des détails pour match terminé: ${match.rencontreId}`);
          
          const detailsRencontre = await this.ffttApi.getDetailsRencontreByLien(
            match.lienDetails,
            match.equipeIds?.equipe1 || "",
            match.equipeIds?.equipe2 || ""
          );

          // Enrichir les données des joueurs
          const enrichedDetails = await enrichPlayerData(
            detailsRencontre,
            this.clubCode,
            this.ffttApi
          );

          match.resultatsIndividuels = enrichedDetails;
          console.log(`✅ Détails récupérés avec succès pour ${match.rencontreId}`);
          
          return match;
        } catch (error) {
          console.error(`❌ Erreur lors de la récupération des détails pour ${match.rencontreId}:`, error);
          return match;
        }
      });

      await Promise.all(batchPromises);

      // Délai entre les batches pour éviter la surcharge API
      if (i + BATCH_SIZE < matchesWithScores.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    console.log("✅ Tous les batches de détails terminés !");
  }

  /**
   * Sauvegarde les matchs dans Firestore
   */
  async saveMatchesToFirestore(
    matches: any[],
    db: any
  ): Promise<{ saved: number; errors: number }> {
    let saved = 0;
    let errors = 0;

    try {
      console.log(`💾 Sauvegarde de ${matches.length} matchs dans Firestore...`);

      // Traitement par batch
      const batchSize = 500;
      for (let i = 0; i < matches.length; i += batchSize) {
        const batch = db.batch();
        const batchEnd = Math.min(i + batchSize, matches.length);

        for (let j = i; j < batchEnd; j++) {
          const match = matches[j];
          const docRef = db.collection("matches").doc(match.id);
          
          // Sérialiser les objets avec prototypes personnalisés
          const matchData = {
            ...match,
            resultatsIndividuels: match.resultatsIndividuels 
              ? JSON.parse(JSON.stringify(match.resultatsIndividuels))
              : undefined,
          };

          // Filtrer les valeurs undefined
          const cleanMatchData = Object.fromEntries(
            Object.entries(matchData).filter(([_, value]) => value !== undefined)
          );
          
          batch.set(docRef, cleanMatchData);
          saved++;
        }

        await batch.commit();
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} sauvegardé (${saved} matchs)`);
      }

      // Mettre à jour les métadonnées
      await db.collection("metadata").doc("lastSync").set(
        {
          matches: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log(`✅ Synchronisation terminée: ${saved} matchs sauvegardés`);
      return { saved, errors };
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      return { saved, errors: matches.length - saved };
    }
  }
}
