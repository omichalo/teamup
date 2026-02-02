import { FFTTAPI } from "@omichalo/ffttapi-node";
import { getFFTTConfig, isFemaleTeam, determinePhaseFromDivision } from "./fftt-utils";
import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import type { FFTTEquipe } from "./fftt-types";

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
  idEpreuve?: number; // ID de l'épreuve FFTT (15954, 15955, 15980, etc.)
  epreuve?: string; // Libellé de l'épreuve FFTT
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchData {
  id: string;
  ffttId: string;
  teamId: string;
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
  // Informations pour les conditions de brûlage
  joueursSQY?: Array<{
    licence: string;
    nom: string;
    prenom: string;
    points: number | null;
    sexe?: string;
    club?: string;
  }>;
  joueursAdversaires?: Array<{
    licence: string;
    nom: string;
    prenom: string;
    points: number | null;
    sexe?: string;
    club?: string;
  }>;
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
   * Synchronise les équipes et leurs matchs depuis l&apos;API FFTT
   */
  async syncTeamsAndMatches(): Promise<TeamSyncResult> {
    try {
      console.log("🔄 Initialisation de l&apos;API FFTT...");
      await this.ffttApi.initialize();

      console.log(
        `📋 Récupération des équipes pour le club ${this.clubCode}...`
      );
      const equipes = await this.ffttApi.getEquipesByClub(this.clubCode);

      console.log(`✅ ${equipes.length} équipes récupérées depuis l&apos;API FFTT`);

      // Filtrer les équipes pour les épreuves spécifiques
      // 15954 = Championnat de France par Équipes Masculin
      // 15955 = Championnat de France par Équipes Féminin
      // 15980 = Championnat de Paris IDF (Excellence)
      const filteredEquipes = equipes.filter(
        (equipe: FFTTEquipe) =>
          equipe.idEpreuve === 15954 || equipe.idEpreuve === 15955 || equipe.idEpreuve === 15980
      );
      console.log(
        `Équipes filtrées (épreuves 15954, 15955 et 15980): ${filteredEquipes.length}`
      );

      // Traiter les équipes
      const processedTeams: TeamData[] = [];

      for (const equipe of filteredEquipes) {
        console.log(`🏆 Traitement de l&apos;équipe ${equipe.libelle}...`);

        // ID unique par phase : Phase 1 et Phase 2 ont des idEquipe identiques côté FFTT,
        // on suffixe par _aller / _retour pour éviter d'écraser 26 équipes Phase 1.
        const phase = determinePhaseFromDivision(equipe.division);
        const teamId = `${equipe.idEquipe}_${phase}`;

        const teamData: TeamData = {
          id: teamId,
          ffttId: equipe.idEquipe.toString(),
          name: equipe.libelle,
          division: equipe.division,
          isFemale: isFemaleTeam(
            equipe.libelle,
            equipe.division,
            equipe.libelleEpreuve,
            equipe.idEpreuve
          ),
          teamNumber: this.extractTeamNumber(equipe.libelle),
          idEpreuve: equipe.idEpreuve,
          epreuve: equipe.libelleEpreuve,
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

        // Récupérer les données existantes pour préserver les champs gérés par l'utilisateur
        const docRefs = teamsData.slice(i, batchEnd).map(team => 
          db.collection("teams").doc(team.id)
        );
        const existingDocs = await db.getAll(...docRefs);
        const existingDataMap = new Map(
          existingDocs.map(doc => [doc.id, doc.exists ? doc.data() : null])
        );

        for (let j = i; j < batchEnd; j++) {
          const team = teamsData[j];
          const docRef = db.collection("teams").doc(team.id);
          const existingData = existingDataMap.get(team.id);

          // Préparer les données pour Firestore
          // Préserver les champs gérés manuellement par l'utilisateur (location, discordChannelId)
          // Ne pas inclure les champs undefined car Firestore ne les accepte pas
          const teamData: Record<string, unknown> = {
            ...team,
            createdAt: Timestamp.fromDate(team.createdAt),
            updatedAt: Timestamp.fromDate(team.updatedAt),
          };

          // Ajouter location seulement s'il existe
          if (existingData?.location !== undefined) {
            teamData.location = existingData.location;
          }

          // Ajouter discordChannelId seulement s'il existe
          if (existingData?.discordChannelId !== undefined) {
            teamData.discordChannelId = existingData.discordChannelId;
          }

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

      // Supprimer les anciens docs équipe (id sans suffixe _aller/_retour)
      // pour éviter doublons : 33 anciens + 59 nouveaux → 59 après nettoyage
      const baseIdsToRemove = new Set(
        teamsData
          .filter((t) => /_(aller|retour)$/.test(t.id))
          .map((t) => t.id.replace(/_(aller|retour)$/, ""))
      );
      for (const baseId of baseIdsToRemove) {
        const ref = db.collection("teams").doc(baseId);
        const snap = await ref.get();
        if (snap.exists) {
          await ref.delete();
          console.log(`🗑️ Ancien doc équipe supprimé: ${baseId}`);
        }
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
   * Extrait le numéro d&apos;équipe depuis le libellé
   * Supporte les formats : "SQY PING 3", "SQY PING (3)", "SQY PING (3) - Phase 1", etc.
   */
  private extractTeamNumber(libelle: string): number {
    // Cherche d'abord le format avec parenthèses, puis sans
    const matchWithParentheses = libelle.match(/SQY PING\s*\((\d+)\)/i);
    if (matchWithParentheses) {
      return parseInt(matchWithParentheses[1], 10);
    }
    const match = libelle.match(/SQY PING\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }
}
