import { FFTTAPI } from "@omichalo/ffttapi-node";
import { getFFTTConfig } from "./fftt-utils";
import { FFTTEquipe, FFTTRencontre } from "./fftt-types";
import { createBaseMatch } from "./fftt-utils";
import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";

export interface TeamMatchesSyncResult {
  success: boolean;
  matchesCount: number;
  message: string;
  error?: string;
  processedMatches?: MatchData[];
}

export interface MatchData {
  id: string;
  ffttId: string;
  teamNumber: number;
  opponent: string;
  opponentClub: string;
  date: Date;
  location: string;
  isHome: boolean;
  isExempt: boolean;
  isForfeit: boolean;
  phase: string;
  journee: string;
  isFemale: boolean;
  division: string;
  teamId: string;
  epreuve: string;
  score?: string;
  result: string;
  rencontreId: string;
  equipeIds: { equipe1: string; equipe2: string };
  lienDetails: string;
  resultatsIndividuels?: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service pour la synchronisation des matchs par équipe
 */
export class TeamMatchesSyncService {
  private ffttApi: FFTTAPI;
  private clubCode: string;

  constructor() {
    const config = getFFTTConfig();
    this.ffttApi = new FFTTAPI(config.id, config.pwd);
    this.clubCode = config.clubCode;
  }

  /**
   * Synchronise les matchs pour une équipe spécifique
   */
  async syncMatchesForTeam(teamId: string): Promise<TeamMatchesSyncResult> {
    try {
      console.log(`🔄 Synchronisation des matchs pour l'équipe ${teamId}...`);
      await this.ffttApi.initialize();

      // Récupérer les équipes du club
      const equipes = await this.ffttApi.getEquipesByClub(this.clubCode);

      // Trouver l'équipe spécifique
      const equipe = equipes.find(
        (eq: FFTTEquipe) =>
          eq.idEquipe.toString() === teamId.replace("sqyping_team_", "")
      );

      if (!equipe) {
        throw new Error(`Équipe ${teamId} non trouvée`);
      }

      // Récupérer les matchs de cette équipe
      const rencontres = await this.ffttApi.getRencontrePouleByLienDivision(
        equipe.lienDivision
      );

      console.log(
        `📊 ${rencontres.length} matchs trouvés pour ${equipe.libelle}`
      );

      // Transformer les matchs
      const processedMatches: MatchData[] = rencontres.map(
        (rencontre: FFTTRencontre) =>
          createBaseMatch(rencontre, equipe, this.clubCode)
      );

      return {
        success: true,
        matchesCount: processedMatches.length,
        message: `Synchronisation réussie: ${processedMatches.length} matchs pour ${equipe.libelle}`,
        processedMatches,
      };
    } catch (error) {
      console.error(
        `❌ Erreur lors de la synchronisation des matchs pour l'équipe ${teamId}:`,
        error
      );
      return {
        success: false,
        matchesCount: 0,
        message: "Erreur lors de la synchronisation",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Synchronise les matchs pour toutes les équipes
   */
  async syncMatchesForAllTeams(): Promise<TeamMatchesSyncResult> {
    try {
      console.log("🔄 Synchronisation des matchs pour toutes les équipes...");
      await this.ffttApi.initialize();

      // Récupérer les équipes du club
      const equipes = await this.ffttApi.getEquipesByClub(this.clubCode);

      // Filtrer les équipes pour les épreuves spécifiques
      const filteredEquipes = equipes.filter(
        (equipe: FFTTEquipe) =>
          equipe.idEpreuve === 15954 || equipe.idEpreuve === 15955
      );

      console.log(`📋 ${filteredEquipes.length} équipes à traiter`);

      // Récupérer tous les matchs en parallèle
      const allMatches = await this.fetchAllMatches(filteredEquipes);

      return {
        success: true,
        matchesCount: allMatches.length,
        message: `Synchronisation réussie: ${allMatches.length} matchs pour ${filteredEquipes.length} équipes`,
        processedMatches: allMatches,
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
  private async fetchAllMatches(equipes: FFTTEquipe[]): Promise<MatchData[]> {
    const matchPromises = equipes.map(async (equipe) => {
      console.log(`Récupération des matchs pour l'équipe: ${equipe.libelle}`);
      try {
        const rencontres = await this.ffttApi.getRencontrePouleByLienDivision(
          equipe.lienDivision
        );

        console.log(
          `Matchs trouvés pour ${equipe.libelle}: ${rencontres.length}`
        );

        return rencontres.map((rencontre: FFTTRencontre) =>
          createBaseMatch(rencontre, equipe, this.clubCode)
        );
      } catch (error) {
        console.error(`❌ Erreur pour l'équipe ${equipe.libelle}:`, error);
        return [];
      }
    });

    const results = await Promise.all(matchPromises);
    return results.flat();
  }

  /**
   * Sauvegarde les matchs dans les sous-collections des équipes
   */
  async saveMatchesToTeamSubcollections(
    matches: MatchData[],
    db: Firestore
  ): Promise<{ saved: number; errors: number }> {
    let saved = 0;
    const errors = 0;

    try {
      console.log(
        `💾 Sauvegarde de ${matches.length} matchs dans les sous-collections...`
      );

      // Grouper les matchs par équipe
      const matchesByTeam = new Map<string, MatchData[]>();

      matches.forEach((match) => {
        const teamId = `sqyping_team_${match.teamNumber}_${
          match.isFemale ? "F" : "M"
        }`;
        if (!matchesByTeam.has(teamId)) {
          matchesByTeam.set(teamId, []);
        }
        matchesByTeam.get(teamId)!.push(match);
      });

      console.log(`📊 ${matchesByTeam.size} équipes avec des matchs`);

      // Sauvegarder par batch
      const batchSize = 500;
      for (const [teamId, teamMatches] of matchesByTeam) {
        console.log(
          `💾 Sauvegarde de ${teamMatches.length} matchs pour ${teamId}...`
        );

        for (let i = 0; i < teamMatches.length; i += batchSize) {
          const batch = db.batch();
          const batchEnd = Math.min(i + batchSize, teamMatches.length);

          for (let j = i; j < batchEnd; j++) {
            const match = teamMatches[j];
            const docRef = db
              .collection("teams")
              .doc(teamId)
              .collection("matches")
              .doc(match.id);

            // Préparer les données pour Firestore en filtrant les valeurs undefined
            const matchData = {
              ...match,
              date: Timestamp.fromDate(match.date),
              createdAt: Timestamp.fromDate(match.createdAt),
              updatedAt: Timestamp.fromDate(match.updatedAt),
            };

            // Supprimer les propriétés undefined pour éviter les erreurs Firestore
            Object.keys(matchData).forEach(key => {
              if (matchData[key] === undefined) {
                delete matchData[key];
              }
            });

            batch.set(docRef, matchData, { merge: true });
            saved++;
          }

          await batch.commit();
        }
      }

      console.log(`✅ Synchronisation terminée: ${saved} matchs sauvegardés`);
      return { saved, errors };
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      return { saved, errors: matches.length - saved };
    }
  }
}
