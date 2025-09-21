import { FFTTAPI } from "@omichalo/ffttapi-node";
import { getFFTTConfig } from "./fftt-utils";
import { FFTTRencontre } from "./fftt-types";
import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";

export interface TeamSyncResult {
  success: boolean;
  teamsCount: number;
  message: string;
  error?: string;
  processedTeams?: TeamData[];
}

export interface TeamData {
  id: string;
  ffttId: string;
  name: string;
  division: string;
  isFemale: boolean;
  teamNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchData {
  id: string;
  ffttId: string;
  opponent: string;
  opponentClub: string;
  date: Date;
  location: string;
  isHome: boolean;
  isExempt: boolean;
  isForfeit: boolean;
  phase: string;
  journee: string;
  scoreA?: number;
  scoreB?: number;
  lien?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service pour la synchronisation des équipes et leurs matchs
 */
export class TeamSyncService {
  private ffttApi: FFTTAPI;
  private clubCode: string;

  constructor() {
    const config = getFFTTConfig();
    this.ffttApi = new FFTTAPI(config.id, config.pwd);
    this.clubCode = config.clubCode;
  }

  /**
   * Synchronise les équipes et leurs matchs depuis l'API FFTT
   */
  async syncTeamsAndMatches(): Promise<TeamSyncResult> {
    try {
      console.log("🔄 Initialisation de l'API FFTT...");
      await this.ffttApi.initialize();

      console.log(
        `📋 Récupération des équipes pour le club ${this.clubCode}...`
      );
      const equipes = await this.ffttApi.getEquipesByClub(this.clubCode);

      console.log(`✅ ${equipes.length} équipes récupérées depuis l'API FFTT`);

      // Filtrer les équipes pour les épreuves spécifiques
      const filteredEquipes = equipes.filter(
        (equipe: any) =>
          equipe.idEpreuve === 15954 || equipe.idEpreuve === 15955
      );
      console.log(
        `Équipes filtrées (épreuves 15954 et 15955): ${filteredEquipes.length}`
      );

      // Traiter les équipes
      const processedTeams: TeamData[] = [];

      for (const equipe of filteredEquipes) {
        console.log(`🏆 Traitement de l'équipe ${equipe.libelle}...`);

        // Créer l'équipe
        const teamData: TeamData = {
          id: `sqyping_team_${equipe.idEquipe}`,
          ffttId: equipe.idEquipe.toString(),
          name: equipe.libelle,
          division: equipe.division,
          isFemale: equipe.libelle.includes("(DAMES)"),
          teamNumber: this.extractTeamNumber(equipe.libelle),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        processedTeams.push(teamData);
      }

      return {
        success: true,
        teamsCount: processedTeams.length,
        message: `Synchronisation réussie: ${processedTeams.length} équipes`,
        processedTeams,
      };
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation des équipes:", error);
      return {
        success: false,
        teamsCount: 0,
        message: "Erreur lors de la synchronisation",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sauvegarde les équipes et leurs matchs dans Firestore
   */
  async saveTeamsAndMatchesToFirestore(
    teamsData: TeamData[],
    db: Firestore
  ): Promise<{ saved: number; errors: number }> {
    let saved = 0;
    const errors = 0;

    try {
      console.log(
        `💾 Sauvegarde de ${teamsData.length} équipes dans Firestore...`
      );

      // Traitement par batch pour éviter les limites Firestore
      const batchSize = 500;
      for (let i = 0; i < teamsData.length; i += batchSize) {
        const batch = db.batch();
        const batchEnd = Math.min(i + batchSize, teamsData.length);

        for (let j = i; j < batchEnd; j++) {
          const team = teamsData[j];
          const docRef = db.collection("teams").doc(team.id);

          // Préparer les données pour Firestore
          const teamData = {
            ...team,
            createdAt: Timestamp.fromDate(team.createdAt),
            updatedAt: Timestamp.fromDate(team.updatedAt),
          };

          batch.set(docRef, teamData, { merge: true });
          saved++;
        }

        await batch.commit();
        console.log(
          `✅ Batch ${
            Math.floor(i / batchSize) + 1
          } sauvegardé (${saved} équipes)`
        );
      }

      // Mettre à jour les métadonnées
      await db.collection("metadata").doc("lastSync").set(
        {
          teams: new Date(),
          teamsEnriched: true,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log(`✅ Synchronisation terminée: ${saved} équipes sauvegardées`);
      return { saved, errors };
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      return { saved, errors: teamsData.length - saved };
    }
  }

  /**
   * Extrait le numéro d'équipe depuis le libellé
   */
  private extractTeamNumber(libelle: string): number {
    const match = libelle.match(/SQY PING (\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}
