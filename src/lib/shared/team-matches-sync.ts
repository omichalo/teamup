import { FFTTAPI } from "@omichalo/ffttapi-node";
import { createFFTTAPI, getFFTTConfig } from "./fftt-utils";
import { FFTTEquipe, FFTTRencontre } from "./fftt-types";
import { createBaseMatch, isFemaleTeam, determinePhaseFromDivision } from "./fftt-utils";
import type { Firestore, DocumentReference } from "firebase-admin/firestore";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import type {
  MatchData,
  TeamMatchesSyncResult,
} from "./team-matches-sync-types";
import {
  convertToFFTTRencontre,
  convertToFFTTDetailsRencontre,
} from "./team-matches-sync-fftt-converters";
import {
  enrichSQYPlayersFromClub,
  extractClubIdFromLien,
} from "./team-matches-sync-enrichment";
import { recalculateJourneesByDate } from "./team-matches-sync-journee";
import { saveMatchesToTeamSubcollections } from "./team-matches-sync-save";

export type {
  TeamMatchesSyncResult,
  MatchData,
  PlayerSearch,
} from "./team-matches-sync-types";

/**
 * Service pour la synchronisation des matchs par équipe
 */
export class TeamMatchesSyncService {
  private ffttApi: FFTTAPI;
  private clubCode: string;

  constructor() {
    const config = getFFTTConfig();
    this.ffttApi = createFFTTAPI();
    this.clubCode = config.clubCode;
  }

  /**
   * Synchronise les matchs pour une équipe spécifique
   */
  async syncMatchesForTeam(teamId: string): Promise<TeamMatchesSyncResult> {
    try {
      console.log(
        `🔄 Synchronisation des matchs pour l&apos;équipe ${teamId}...`
      );
      await this.ffttApi.initialize();

      // Récupérer les équipes du club
      const equipes = await this.ffttApi.getEquipesByClub(this.clubCode);

      // Résoudre teamId : format "idEquipe_aller" / "idEquipe_retour" ou ancien "idEquipe"
      const cleanId = teamId.replace("sqyping_team_", "");
      const phaseSuffix = cleanId.includes("_aller")
        ? "aller"
        : cleanId.includes("_retour")
          ? "retour"
          : null;
      const idEquipeStr = phaseSuffix
        ? cleanId.replace(/_(aller|retour)$/, "")
        : cleanId;

      const equipeFound = equipes.find((eq: FFTTEquipe) => {
        if (eq.idEquipe.toString() !== idEquipeStr) return false;
        if (phaseSuffix) {
          return determinePhaseFromDivision(eq.division) === phaseSuffix;
        }
        return true;
      });

      if (!equipeFound) {
        throw new Error(`Équipe ${teamId} non trouvée`);
      }

      // S'assurer que isFemale est défini en utilisant toutes les informations disponibles
      const isFemaleValue =
        "isFemale" in equipeFound && equipeFound.isFemale !== undefined
          ? Boolean(equipeFound.isFemale)
          : isFemaleTeam(
              equipeFound.libelle,
              equipeFound.division,
              equipeFound.libelleEpreuve,
              equipeFound.idEpreuve
            );

      const equipe: FFTTEquipe = {
        ...equipeFound,
        isFemale: isFemaleValue,
      };

      // Récupérer les matchs de cette équipe
      const rencontres = await this.ffttApi.getRencontrePouleByLienDivision(
        equipe.lienDivision
      );

      console.log(
        `📊 ${rencontres.length} matchs trouvés pour ${equipe.libelle}`
      );

      // Filtrer pour ne garder que les matchs où SQY Ping joue
      console.log(`🔍 Noms d&apos;équipes dans les matchs:`);
      rencontres.slice(0, 3).forEach((rencontre, index) => {
        console.log(
          `  Match ${index + 1}: "${rencontre.nomEquipeA}" vs "${
            rencontre.nomEquipeB
          }"`
        );
      });

      const sqyPingMatches = rencontres.filter((rencontre: unknown) => {
        const rencontreTyped = convertToFFTTRencontre(rencontre);
        const isSQY =
          rencontreTyped.nomEquipeA.includes("SQY PING") ||
          rencontreTyped.nomEquipeB.includes("SQY PING");
        if (isSQY) {
          console.log(
            `✅ Match SQY trouvé: "${rencontreTyped.nomEquipeA}" vs "${rencontreTyped.nomEquipeB}"`
          );
        }
        return isSQY;
      });

      console.log(
        `🏓 ${sqyPingMatches.length} matchs SQY Ping sur ${rencontres.length} matchs de poule`
      );

      // Transformer les matchs avec récupération des détails
      const processedMatches: MatchData[] = [];

      for (const rencontre of sqyPingMatches) {
        try {
          // Récupérer les détails de la rencontre pour avoir les joueurs

          // Extraire les numéros de club depuis le lien (comme dans real-matches-optimized.ts)
          const clubnum1Match = rencontre.lien.match(/clubnum_1=([^&]+)/);
          const clubnum2Match = rencontre.lien.match(/clubnum_2=([^&]+)/);

          let clubEquipeA, clubEquipeB;
          if (clubnum1Match && clubnum2Match) {
            // clubnum_1/clubnum_2 correspondent toujours à l'ordre équipe A/B du lien FFTT.
            // Ne pas inverser selon SQY, sinon getDetailsRencontreByLien peut retourner
            // des détails incomplets (joueurs manquants) pour certains matchs extérieurs.
            clubEquipeA = clubnum1Match[1];
            clubEquipeB = clubnum2Match[1];
          } else {
            // Fallback: utiliser les IDs d&apos;équipe comme clubs
            clubEquipeA = extractClubIdFromLien(
              rencontre.lien,
              "clubnum_1"
            );
            clubEquipeB = extractClubIdFromLien(
              rencontre.lien,
              "clubnum_2"
            );
          }

          console.log(`  - clubEquipeA: ${clubEquipeA || "null"}`);
          console.log(`  - clubEquipeB: ${clubEquipeB || "null"}`);

          const detailsRencontre = await this.ffttApi.getDetailsRencontreByLien(
            rencontre.lien,
            clubEquipeA || "",
            clubEquipeB || ""
          );

          console.log(
            `  - detailsRencontre:`,
            detailsRencontre ? "présent" : "absent"
          );
          if (detailsRencontre) {
            console.log(
              `  - joueursA:`,
              detailsRencontre.joueursA
                ? `${detailsRencontre.joueursA.length} joueurs`
                : "absent"
            );
            console.log(
              `  - joueursB:`,
              detailsRencontre.joueursB
                ? `${detailsRencontre.joueursB.length} joueurs`
                : "absent"
            );
          }

          const matchData = createBaseMatch(
            rencontre as FFTTRencontre,
            equipe,
            convertToFFTTDetailsRencontre(detailsRencontre)
          );
          processedMatches.push(matchData);
        } catch (error) {
          console.warn(
            `⚠️ Impossible de récupérer les détails pour ${rencontre.lien}:`,
            error
          );
          // Créer le match sans les détails des joueurs
          const matchData = createBaseMatch(rencontre as FFTTRencontre, equipe);
          processedMatches.push(matchData);
        }
      }

      const matchesWithJournees = recalculateJourneesByDate(processedMatches);

      return {
        success: true,
        matchesCount: matchesWithJournees.length,
        message: `Synchronisation réussie: ${matchesWithJournees.length} matchs pour ${equipe.libelle}`,
        processedMatches: matchesWithJournees,
      };
    } catch (error) {
      console.error(
        `❌ Erreur lors de la synchronisation des matchs pour l&apos;équipe ${teamId}:`,
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
  async syncMatchesForAllTeams(db?: Firestore): Promise<TeamMatchesSyncResult> {
    try {
      console.log("🔄 Synchronisation des matchs pour toutes les équipes...");
      await this.ffttApi.initialize();

      // Récupérer les équipes du club
      const equipes = await this.ffttApi.getEquipesByClub(this.clubCode);

      // Filtrer les équipes pour les épreuves spécifiques et ajouter le champ isFemale
      // 15954 = Championnat de France par Équipes Masculin
      // 15955 = Championnat de France par Équipes Féminin
      // 15980 = Championnat de Paris IDF (Excellence)
      const filteredEquipes = equipes
        .filter(
          (equipe: FFTTEquipe) =>
            equipe.idEpreuve === 15954 ||
            equipe.idEpreuve === 15955 ||
            equipe.idEpreuve === 15980
        )
        .map((equipe: FFTTEquipe) => {
          // S'assurer que isFemale est défini en utilisant toutes les informations disponibles
          return {
            ...equipe,
            isFemale: (() => {
              const isFemaleValue =
                "isFemale" in equipe && equipe.isFemale !== undefined
                  ? Boolean(equipe.isFemale)
                  : isFemaleTeam(
                      equipe.libelle,
                      equipe.division,
                      equipe.libelleEpreuve,
                      equipe.idEpreuve
                    );
              return isFemaleValue;
            })(),
          };
        });

      console.log(`📋 ${filteredEquipes.length} équipes à traiter`);

      // Récupérer tous les matchs en parallèle
      const allMatches = await this.fetchAllMatches(filteredEquipes);

      // Recalculer les journées basées sur la date si l'extraction depuis le libellé a échoué
      const matchesWithRecalculatedJournees =
        recalculateJourneesByDate(allMatches);

      // Enrichir les matchs avec les licences des joueurs avant de mettre à jour la participation
      let enrichedMatches = matchesWithRecalculatedJournees;
      if (db && allMatches.length > 0) {
        // OPTIMISATION : Charger tous les joueurs une seule fois et les réutiliser
        console.log(
          "📥 Chargement de tous les joueurs pour l'enrichissement (une seule fois)..."
        );
        const playersSnapshot = await db.collection("players").get();
        const playersCache = playersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log(`✅ ${playersCache.length} joueurs chargés en cache`);

        console.log(
          "🔄 Enrichissement des matchs avec les licences des joueurs..."
        );
        enrichedMatches = await Promise.all(
          matchesWithRecalculatedJournees.map((match) =>
            enrichSQYPlayersFromClub(match, db, playersCache)
          )
        );
        console.log(`✅ ${enrichedMatches.length} matchs enrichis`);

        // Mettre à jour la participation des joueurs avec les matchs enrichis
        console.log(
          "🔄 Mise à jour de la participation des joueurs basée sur les matchs enrichis..."
        );
        const participationResult =
          await this.updatePlayerParticipationFromMatches(
            enrichedMatches,
            db,
            playersCache
          );
        console.log(
          `✅ Participation mise à jour: ${participationResult.updated} joueurs, ${participationResult.errors} erreurs`
        );
      }

      return {
        success: true,
        matchesCount: enrichedMatches.length,
        message: `Synchronisation réussie: ${enrichedMatches.length} matchs pour ${filteredEquipes.length} équipes`,
        processedMatches: enrichedMatches,
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
    // ID de l'équipe pour laquelle afficher les logs détaillés (33882 = équipe 2 masculine)
    const DEBUG_TEAM_ID = 33882;

    const matchPromises = equipes.map(async (equipe) => {
      const isDebugTeam = equipe.idEquipe === DEBUG_TEAM_ID;

      try {
        const rencontres = await this.ffttApi.getRencontrePouleByLienDivision(
          equipe.lienDivision
        );

        console.log(
          `Matchs trouvés pour ${equipe.libelle}: ${rencontres.length}`
        );

        // Filtrer pour ne garder que les matchs où SQY Ping joue
        const sqyPingMatches = rencontres.filter((rencontre) => {
          const rencontreTyped = convertToFFTTRencontre(rencontre);
          return (
            rencontreTyped.nomEquipeA.includes("SQY PING") ||
            rencontreTyped.nomEquipeB.includes("SQY PING")
          );
        });

        console.log(
          `🏓 ${sqyPingMatches.length} matchs SQY Ping sur ${rencontres.length} matchs de poule pour ${equipe.libelle}`
        );
        if (isDebugTeam) {
          console.log(
            `   └─ Équipe: ${equipe.libelle} | Division: ${equipe.division}`
          );
        }

        // Transformer les matchs avec récupération des détails
        const processedMatches: MatchData[] = [];

        for (const rencontre of sqyPingMatches) {
          try {
            // Récupérer les détails de la rencontre pour avoir les joueurs

            // Extraire les numéros de club depuis le lien (comme dans real-matches-optimized.ts)
            const clubnum1Match = rencontre.lien.match(/clubnum_1=([^&]+)/);
            const clubnum2Match = rencontre.lien.match(/clubnum_2=([^&]+)/);

            let clubEquipeA, clubEquipeB;
            if (clubnum1Match && clubnum2Match) {
              // clubnum_1/clubnum_2 correspondent à équipe A/B dans le lien FFTT.
              clubEquipeA = clubnum1Match[1];
              clubEquipeB = clubnum2Match[1];
            } else {
              // Fallback: utiliser les IDs d&apos;équipe comme clubs
              clubEquipeA = extractClubIdFromLien(
                rencontre.lien,
                "clubnum_1"
              );
              clubEquipeB = extractClubIdFromLien(
                rencontre.lien,
                "clubnum_2"
              );
            }

            const detailsRencontre =
              await this.ffttApi.getDetailsRencontreByLien(
                rencontre.lien,
                clubEquipeA || "",
                clubEquipeB || ""
              );

            // Convertir les détails avant de créer le match
            const convertedDetails =
              convertToFFTTDetailsRencontre(detailsRencontre);

            const matchData = createBaseMatch(
              rencontre as FFTTRencontre,
              equipe,
              convertedDetails
            );

            processedMatches.push(matchData);
          } catch (error) {
            console.error(
              `❌ Erreur lors de la récupération des détails pour ${rencontre.lien}:`,
              error
            );
            // Créer le match sans les détails en cas d&apos;erreur
            const matchData = createBaseMatch(
              rencontre as FFTTRencontre,
              equipe,
              undefined
            );
            processedMatches.push(matchData);
          }
        }

        return processedMatches;
      } catch (error) {
        console.error(`❌ Erreur pour l&apos;équipe ${equipe.libelle}:`, error);
        return [];
      }
    });

    const results = await Promise.all(matchPromises);
    return results.flat();
  }

  /**
   * Met à jour la participation des joueurs basée sur leur participation aux matchs
   * @param matches - Les matchs à traiter
   * @param db - Instance Firestore
   * @param playersCache - Cache optionnel des joueurs pour éviter les reads répétés
   */
  async updatePlayerParticipationFromMatches(
    matches: MatchData[],
    db: Firestore,
    playersCache?: Array<{ id: string; [key: string]: unknown }>
  ): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;

    try {
      console.log(
        "🔄 Mise à jour de la participation des joueurs basée sur les matchs..."
      );

      // Les matchs sont déjà enrichis dans syncMatchesForAllTeams, donc on les utilise directement
      // Si playersCache n'est pas fourni, on doit enrichir (cas où cette fonction est appelée seule)
      const enrichedMatches = playersCache
        ? matches // Déjà enrichis, pas besoin de réenrichir
        : await Promise.all(
            matches.map((match) => enrichSQYPlayersFromClub(match, db))
          );

      // Séparer les matchs du championnat par équipes et du championnat de Paris
      const matchesChampionnatEquipes = enrichedMatches.filter(
        (match) => match.idEpreuve !== 15980
      );
      const matchesChampionnatParis = enrichedMatches.filter(
        (match) => match.idEpreuve === 15980
      );

      console.log(
        `📊 ${matchesChampionnatEquipes.length} matchs championnat par équipes, ${matchesChampionnatParis.length} matchs championnat de Paris`
      );

      // Collecter tous les joueurs qui participent à au moins un match (championnat par équipes)
      const participatingPlayers = new Set<string>();
      const participatingPlayersParis = new Set<string>();

      // Traiter les matchs du championnat par équipes
      for (const match of matchesChampionnatEquipes) {
        // Un match est considéré comme joué s&apos;il a des joueurs OU des résultats individuels OU des scores > 0
        const hasPlayers =
          match.joueursSQY &&
          Array.isArray(match.joueursSQY) &&
          match.joueursSQY.length > 0;
        const hasResults =
          match.resultatsIndividuels?.parties &&
          Array.isArray(match.resultatsIndividuels.parties) &&
          match.resultatsIndividuels.parties.length > 0;
        // Parser le score depuis le champ score (format "24-18")
        let hasScore = false;
        if (match.score) {
          const scoreParts = match.score.split("-");
          if (scoreParts.length === 2) {
            const scoreA = parseInt(scoreParts[0], 10);
            const scoreB = parseInt(scoreParts[1], 10);
            hasScore = scoreA > 0 || scoreB > 0;
          }
        }

        if (hasPlayers || hasResults || hasScore) {
          // Note: resultatsIndividuels ne contient pas de licence, on utilise joueursSQY

          // Vérifier aussi joueursSQY (nouveau format)
          if (hasPlayers) {
            for (const joueur of match.joueursSQY!) {
              if (joueur.licence && joueur.licence.trim() !== "") {
                participatingPlayers.add(joueur.licence);
              }
            }
          }
        }
      }

      // Traiter les matchs du championnat de Paris
      for (const match of matchesChampionnatParis) {
        // Un match est considéré comme joué s'il a des joueurs OU des résultats individuels OU des scores > 0
        const hasPlayers =
          match.joueursSQY &&
          Array.isArray(match.joueursSQY) &&
          match.joueursSQY.length > 0;
        const hasResults =
          match.resultatsIndividuels?.parties &&
          Array.isArray(match.resultatsIndividuels.parties) &&
          match.resultatsIndividuels.parties.length > 0;
        // Parser le score depuis le champ score (format "24-18")
        let hasScore = false;
        if (match.score) {
          const scoreParts = match.score.split("-");
          if (scoreParts.length === 2) {
            const scoreA = parseInt(scoreParts[0], 10);
            const scoreB = parseInt(scoreParts[1], 10);
            hasScore = scoreA > 0 || scoreB > 0;
          }
        }

        if (hasPlayers || hasResults || hasScore) {
          // Vérifier aussi joueursSQY (nouveau format)
          if (hasPlayers) {
            for (const joueur of match.joueursSQY!) {
              if (joueur.licence && joueur.licence.trim() !== "") {
                participatingPlayersParis.add(joueur.licence);
              }
            }
          }
        }
      }

      console.log(
        `📊 ${participatingPlayers.size} joueurs participants championnat par équipes, ${participatingPlayersParis.size} joueurs participants championnat de Paris`
      );

      // Calculer les équipes de brûlage séparément pour masculin et féminin
      console.log("🔄 Calcul des équipes de brûlage...");

      // Structures séparées pour masculin et féminin (championnat par équipes): Map<licence, Map<phase, Map<teamNumber, count>>>
      const matchCountByPlayerPhaseTeamMasculin = new Map<
        string,
        Map<string, Map<number, number>>
      >();
      const matchCountByPlayerPhaseTeamFeminin = new Map<
        string,
        Map<string, Map<number, number>>
      >();

      // Structure unifiée pour le championnat de Paris (mixte): Map<licence, Map<phase, Map<teamNumber, count>>>
      const matchCountByPlayerPhaseTeamParis = new Map<
        string,
        Map<string, Map<number, number>>
      >();

      // Compter les matchs par joueur, phase et équipe pour le championnat par équipes (séparer masculin et féminin)
      for (const match of matchesChampionnatEquipes) {
        const isFeminin = match.isFemale;
        // if (isFeminin) {
        //   debugCountFeminin++;
        // } else {
        //   debugCountMasculin++;
        // }
        const matchCountMap = isFeminin
          ? matchCountByPlayerPhaseTeamFeminin
          : matchCountByPlayerPhaseTeamMasculin;

        // Vérifier que le match est réellement joué
        let matchIsPlayed = false;
        if (match.score) {
          const scoreParts = match.score.split("-");
          if (scoreParts.length === 2) {
            const scoreA = parseInt(scoreParts[0], 10);
            const scoreB = parseInt(scoreParts[1], 10);
            matchIsPlayed = scoreA > 0 || scoreB > 0;
          }
        }

        if (!matchIsPlayed) {
          continue;
        }

        const phase = match.phase || "aller";
        const teamNumber = match.teamNumber;

        // Parcourir les joueurs SQY de ce match
        if (match.joueursSQY && Array.isArray(match.joueursSQY)) {
          for (const joueur of match.joueursSQY) {
            const playerLicence = joueur.licence;

            // Ignorer les joueurs sans licence
            if (!playerLicence || playerLicence.trim() === "") {
              continue;
            }

            // Initialiser les structures si nécessaire
            if (!matchCountMap.has(playerLicence)) {
              matchCountMap.set(playerLicence, new Map());
            }

            const phaseMap = matchCountMap.get(playerLicence)!;
            if (!phaseMap.has(phase)) {
              phaseMap.set(phase, new Map());
            }

            const teamMap = phaseMap.get(phase)!;
            if (!teamMap.has(teamNumber)) {
              teamMap.set(teamNumber, 0);
            }

            // Incrémenter le compteur
            const currentCount = teamMap.get(teamNumber)!;
            teamMap.set(teamNumber, currentCount + 1);
          }
        }
      }

      // Fonction helper pour calculer le brûlage pour un type d'équipe (masculin ou féminin)
      const calculateBurnoutForTeamType = (
        matchCountByPlayerPhaseTeam: Map<
          string,
          Map<string, Map<number, number>>
        >,
        typeName: string,
        isParisChampionship = false
      ): {
        highestBurnedTeamByPlayerByPhase: Map<string, Map<string, number>>; // licence -> phase -> teamNumber
        matchesByTeamByPlayerByPhase: Map<
          string,
          Map<string, Map<number, number>>
        >; // licence -> phase -> teamNumber -> count
      } => {
        const highestBurnedTeamByPlayerByPhase = new Map<
          string,
          Map<string, number>
        >();
        const matchesByTeamByPlayerByPhase = new Map<
          string,
          Map<string, Map<number, number>>
        >();

        for (const [playerLicence, phaseMap] of matchCountByPlayerPhaseTeam) {
          const playerBurnoutByPhase = new Map<string, number>();
          const playerMatchesByPhase = new Map<string, Map<number, number>>();

          // Calculer le brûlage pour chaque phase séparément
          for (const [phase, teamMap] of phaseMap) {
            // Calculer le total de matchs pour cette phase uniquement
            // let totalMatchesInPhase = 0;
            const matchesByTeamInPhase = new Map<number, number>();

            for (const [teamNumber, matchCount] of teamMap) {
              // totalMatchesInPhase += matchCount;
              matchesByTeamInPhase.set(teamNumber, matchCount);
            }

            // Stocker les matchs par équipe pour cette phase
            if (matchesByTeamInPhase.size > 0) {
              playerMatchesByPhase.set(phase, matchesByTeamInPhase);
            }

            // Déterminer l'équipe de brûlage pour cette phase
            let highestBurnedTeamInPhase: number | null = null;

            if (isParisChampionship) {
              // Règle Article 12 du championnat de Paris :
              // Un joueur est brûlé s'il a joué 3 fois ou plus dans UNE équipe de numéro inférieur
              // On cherche la plus basse équipe (numéro le plus élevé) où il est brûlé
              const teamNumbers = Array.from(matchesByTeamInPhase.keys()).sort((a, b) => a - b);
              
              for (let i = 0; i < teamNumbers.length; i++) {
                const currentTeamNumber = teamNumbers[i];
                
                // Vérifier s'il y a une équipe de numéro inférieur où le joueur a joué 3 fois ou plus
                for (let j = 0; j < i; j++) {
                  const lowerTeamNumber = teamNumbers[j];
                  const matchCountInLowerTeam = matchesByTeamInPhase.get(lowerTeamNumber) || 0;
                  
                  // Si le joueur a 3 matchs ou plus dans cette équipe inférieure, il est brûlé dans l'équipe actuelle
                  if (matchCountInLowerTeam >= 3) {
                    highestBurnedTeamInPhase = currentTeamNumber;
                    break; // Prendre la première équipe où il est brûlé (la plus basse)
                  }
                }
                
                if (highestBurnedTeamInPhase !== null) {
                  break;
                }
              }
            } else {
              // Règle FFTT championnat par équipes : Un joueur est brûlé dans l'équipe où il a joué son 2ème match
              // (en comptant tous les matchs dans l'ordre croissant des numéros d'équipe)
              // Exemple : {1: 3, 2: 1} -> liste triée : [1, 1, 1, 2] -> 2ème match = équipe 1
              
              // Créer une liste de tous les matchs triés par numéro d'équipe croissant
              const allMatches: number[] = [];
              for (const [teamNumber, matchCount] of matchesByTeamInPhase) {
                // Ajouter le numéro d'équipe autant de fois qu'il y a de matchs
                for (let i = 0; i < matchCount; i++) {
                  allMatches.push(teamNumber);
                }
              }

              // Trier par numéro d'équipe croissant
              allMatches.sort((a, b) => a - b);

              // Si le joueur a joué au moins 2 matchs, il est brûlé dans l'équipe du 2ème match
              if (allMatches.length >= 2) {
                highestBurnedTeamInPhase = allMatches[1]; // 2ème élément (index 1)
              }
            }

            // Si le joueur est brûlé dans cette phase, enregistrer
            if (highestBurnedTeamInPhase !== null) {
              playerBurnoutByPhase.set(phase, highestBurnedTeamInPhase);
            }
          }

          // Stocker les résultats pour ce joueur
          if (playerBurnoutByPhase.size > 0) {
            highestBurnedTeamByPlayerByPhase.set(
              playerLicence,
              playerBurnoutByPhase
            );
          }
          if (playerMatchesByPhase.size > 0) {
            matchesByTeamByPlayerByPhase.set(
              playerLicence,
              playerMatchesByPhase
            );
          }
        }

        // Compter le nombre total de joueurs brûlés (toutes phases confondues pour le log)
        // let totalBurnedPlayers = 0;
        // for (const phaseMap of highestBurnedTeamByPlayerByPhase.values()) {
        //   totalBurnedPlayers += phaseMap.size;
        // }

        console.log(
          `✅ ${highestBurnedTeamByPlayerByPhase.size} joueurs brûlés en ${typeName}`
        );

        return {
          highestBurnedTeamByPlayerByPhase,
          matchesByTeamByPlayerByPhase,
        };
      };

      // Calculer les brûlages séparément pour masculin et féminin
      const {
        highestBurnedTeamByPlayerByPhase:
          highestMasculineBurnedTeamByPlayerByPhase,
        matchesByTeamByPlayerByPhase: masculineMatchesByTeamByPlayerByPhase,
      } = calculateBurnoutForTeamType(
        matchCountByPlayerPhaseTeamMasculin,
        "masculin"
      );

      const {
        highestBurnedTeamByPlayerByPhase:
          highestFeminineBurnedTeamByPlayerByPhase,
        matchesByTeamByPlayerByPhase: feminineMatchesByTeamByPlayerByPhase,
      } = calculateBurnoutForTeamType(
        matchCountByPlayerPhaseTeamFeminin,
        "féminin"
      );

      // Calculer les brûlages pour le championnat de Paris (mixte, pas de distinction M/F)
      // Utiliser 3 matchs au lieu de 2 pour le brûlage (Article 12)
      const {
        highestBurnedTeamByPlayerByPhase: highestBurnedTeamByPlayerByPhaseParis,
        matchesByTeamByPlayerByPhase: matchesByTeamByPlayerByPhaseParis,
      } = calculateBurnoutForTeamType(
        matchCountByPlayerPhaseTeamParis,
        "Paris (mixte)",
        true // isParisChampionship = true
      );

      // Récupérer les données actuelles des joueurs pour éviter les mises à jour inutiles
      // Inclure tous les joueurs qui ont participé OU qui ont des matchs enregistrés (masculin ou féminin, championnat par équipes ou Paris)
      const allPlayerIds = new Set([
        ...Array.from(participatingPlayers),
        ...Array.from(participatingPlayersParis),
        ...Array.from(masculineMatchesByTeamByPlayerByPhase.keys()),
        ...Array.from(feminineMatchesByTeamByPlayerByPhase.keys()),
        ...Array.from(matchesByTeamByPlayerByPhaseParis.keys()),
      ]);
      const playerIds = Array.from(allPlayerIds);
      const playersToUpdate = [];

      // OPTIMISATION : Utiliser le cache de joueurs si fourni, sinon récupérer avec getAll()
      console.log(`📥 Récupération de ${playerIds.length} joueurs...`);

      // Créer une Map pour un accès rapide aux données existantes
      const playerDataMap = new Map<string, Record<string, unknown>>();

      if (playersCache) {
        // Utiliser le cache de joueurs déjà chargé (évite les reads supplémentaires)
        console.log(
          `✅ Utilisation du cache de joueurs (${playersCache.length} joueurs en cache)`
        );
        for (const player of playersCache) {
          if (playerIds.includes(player.id)) {
            playerDataMap.set(player.id, player);
          }
        }
      } else {
        // Fallback : récupérer avec getAll() si pas de cache
        const docRefs = playerIds.map((playerId) =>
          db.collection("players").doc(playerId)
        );

        // getAll() peut récupérer jusqu'à 10 documents à la fois
        // Diviser en sous-batches de 10 et les traiter en parallèle
        const getAllBatchSize = 10;
        const getAllBatches: Array<Array<DocumentReference>> = [];

        for (let k = 0; k < docRefs.length; k += getAllBatchSize) {
          getAllBatches.push(docRefs.slice(k, k + getAllBatchSize));
        }

        // Traiter les batches getAll() en parallèle (max 5 à la fois pour ne pas surcharger)
        const maxConcurrentGetAll = 5;
        for (let k = 0; k < getAllBatches.length; k += maxConcurrentGetAll) {
          const concurrentBatches = getAllBatches.slice(
            k,
            k + maxConcurrentGetAll
          );
          const getAllPromises = concurrentBatches.map((batch) =>
            db.getAll(...batch)
          );

          const results = await Promise.all(getAllPromises);

          results.forEach((docs) => {
            docs.forEach((doc) => {
              if (doc.exists) {
                playerDataMap.set(
                  doc.id,
                  doc.data() as Record<string, unknown>
                );
              }
            });
          });
        }
      }

      for (const playerId of playerIds) {
        try {
          const playerData = playerDataMap.get(playerId);
          if (playerData) {
            const updates: Record<string, unknown> = {};

            // Mettre à jour hasPlayedAtLeastOneMatch si pas déjà true (championnat par équipes)
            if (
              participatingPlayers.has(playerId) &&
              !playerData?.hasPlayedAtLeastOneMatch
            ) {
              updates.hasPlayedAtLeastOneMatch = true;
            }

            // Mettre à jour hasPlayedAtLeastOneMatchParis si pas déjà true (championnat de Paris)
            if (
              participatingPlayersParis.has(playerId) &&
              !playerData?.hasPlayedAtLeastOneMatchParis
            ) {
              updates.hasPlayedAtLeastOneMatchParis = true;
            }

            // Mettre à jour participation.championnat si pas déjà true
            const participation = playerData?.participation as
              | { championnat?: boolean; championnatParis?: boolean }
              | undefined;
            if (
              participatingPlayers.has(playerId) &&
              !participation?.championnat
            ) {
              updates["participation.championnat"] = true;
            }

            // Mettre à jour participation.championnatParis si pas déjà true
            if (
              participatingPlayersParis.has(playerId) &&
              !participation?.championnatParis
            ) {
              updates["participation.championnatParis"] = true;
            }

            // Mettre à jour highestMasculineTeamNumberByPhase si le joueur est brûlé en masculin
            const highestMasculineBurnedTeamByPhase =
              highestMasculineBurnedTeamByPlayerByPhase.get(playerId);
            const hasMasculineMatches =
              masculineMatchesByTeamByPlayerByPhase.has(playerId);

            if (highestMasculineBurnedTeamByPhase) {
              // Le joueur est brûlé en masculin pour au moins une phase
              const currentHighestByPhase =
                (playerData?.highestMasculineTeamNumberByPhase as
                  | { aller?: number; retour?: number }
                  | undefined) || {};

              const newHighestByPhase: {
                aller?: number;
                retour?: number;
              } = { ...currentHighestByPhase };

              // Mettre à jour pour chaque phase
              for (const [
                phase,
                burnedTeam,
              ] of highestMasculineBurnedTeamByPhase) {
                if (phase === "aller" || phase === "retour") {
                  const currentHighest = currentHighestByPhase[phase] ?? null;

                  // Mettre à jour si la valeur actuelle est absente ou si la nouvelle valeur est différente
                  // La valeur calculée est la source de vérité basée sur les matchs réels
                  if (
                    currentHighest === null ||
                    burnedTeam !== currentHighest
                  ) {
                    newHighestByPhase[phase] = burnedTeam;
                  }
                }
              }

              // Si au moins une phase a été mise à jour, sauvegarder
              const hasChanges = Object.keys(newHighestByPhase).some(
                (phase) =>
                  newHighestByPhase[phase as "aller" | "retour"] !==
                  currentHighestByPhase[phase as "aller" | "retour"]
              );

              if (hasChanges || Object.keys(newHighestByPhase).length > 0) {
                updates.highestMasculineTeamNumberByPhase = newHighestByPhase;
              }
            } else if (!hasMasculineMatches) {
              // Le joueur n'a plus de matchs masculins, supprimer le brûlage si le champ existe
              if (
                (playerData?.highestMasculineTeamNumberByPhase as unknown) !==
                undefined
              ) {
                updates.highestMasculineTeamNumberByPhase = FieldValue.delete();
              }
            }

            // Mettre à jour highestFeminineTeamNumberByPhase si le joueur est brûlé en féminin
            const highestFeminineBurnedTeamByPhase =
              highestFeminineBurnedTeamByPlayerByPhase.get(playerId);
            const hasFeminineMatches =
              feminineMatchesByTeamByPlayerByPhase.has(playerId);

            if (highestFeminineBurnedTeamByPhase) {
              // Le joueur est brûlé en féminin pour au moins une phase
              const currentHighestByPhase =
                (playerData?.highestFeminineTeamNumberByPhase as
                  | { aller?: number; retour?: number }
                  | undefined) || {};

              const newHighestByPhase: {
                aller?: number;
                retour?: number;
              } = { ...currentHighestByPhase };

              // Mettre à jour pour chaque phase
              for (const [
                phase,
                burnedTeam,
              ] of highestFeminineBurnedTeamByPhase) {
                if (phase === "aller" || phase === "retour") {
                  const currentHighest = currentHighestByPhase[phase] ?? null;

                  // Mettre à jour si la valeur actuelle est absente ou si la nouvelle valeur est différente
                  // La valeur calculée est la source de vérité basée sur les matchs réels
                  if (
                    currentHighest === null ||
                    burnedTeam !== currentHighest
                  ) {
                    newHighestByPhase[phase] = burnedTeam;
                  }
                }
              }

              // Si au moins une phase a été mise à jour, sauvegarder
              const hasChanges = Object.keys(newHighestByPhase).some(
                (phase) =>
                  newHighestByPhase[phase as "aller" | "retour"] !==
                  currentHighestByPhase[phase as "aller" | "retour"]
              );

              if (hasChanges || Object.keys(newHighestByPhase).length > 0) {
                updates.highestFeminineTeamNumberByPhase = newHighestByPhase;
              }
            } else if (!hasFeminineMatches) {
              // Le joueur n'a plus de matchs féminins, supprimer le brûlage si le champ existe
              if (
                (playerData?.highestFeminineTeamNumberByPhase as unknown) !==
                undefined
              ) {
                updates.highestFeminineTeamNumberByPhase = FieldValue.delete();
              }
            }

            // Mettre à jour masculineMatchesByTeamByPhase pour l'affichage dans le tooltip
            // Toujours mettre à jour pour avoir les stats complètes, même si le joueur n'est pas brûlé
            const masculineMatchesByPhase =
              masculineMatchesByTeamByPlayerByPhase.get(playerId);
            if (masculineMatchesByPhase && masculineMatchesByPhase.size > 0) {
              // Convertir la Map par phase en objet pour Firestore
              const matchesByTeamByPhaseObj: {
                aller?: { [teamNumber: number]: number };
                retour?: { [teamNumber: number]: number };
              } = {};

              for (const [phase, matchesByTeam] of masculineMatchesByPhase) {
                const matchesByTeamObj: { [teamNumber: number]: number } = {};
                matchesByTeam.forEach((count, teamNumber) => {
                  matchesByTeamObj[teamNumber] = count;
                });
                matchesByTeamByPhaseObj[phase as "aller" | "retour"] =
                  matchesByTeamObj;
              }

              updates.masculineMatchesByTeamByPhase = matchesByTeamByPhaseObj;
            }

            // Mettre à jour feminineMatchesByTeamByPhase pour l'affichage dans le tooltip
            // Toujours mettre à jour pour avoir les stats complètes, même si le joueur n'est pas brûlé
            const feminineMatchesByPhase =
              feminineMatchesByTeamByPlayerByPhase.get(playerId);
            if (feminineMatchesByPhase && feminineMatchesByPhase.size > 0) {
              // Convertir la Map par phase en objet pour Firestore
              const matchesByTeamByPhaseObj: {
                aller?: { [teamNumber: number]: number };
                retour?: { [teamNumber: number]: number };
              } = {};

              for (const [phase, matchesByTeam] of feminineMatchesByPhase) {
                const matchesByTeamObj: { [teamNumber: number]: number } = {};
                matchesByTeam.forEach((count, teamNumber) => {
                  matchesByTeamObj[teamNumber] = count;
                });
                matchesByTeamByPhaseObj[phase as "aller" | "retour"] =
                  matchesByTeamObj;
              }

              updates.feminineMatchesByTeamByPhase = matchesByTeamByPhaseObj;
            }

            // Mettre à jour highestTeamNumberByPhaseParis si le joueur est brûlé au championnat de Paris (mixte)
            const highestBurnedTeamByPhaseParis =
              highestBurnedTeamByPlayerByPhaseParis.get(playerId);
            const hasMatchesParis =
              matchesByTeamByPlayerByPhaseParis.has(playerId);

            if (highestBurnedTeamByPhaseParis) {
              // Le joueur est brûlé pour au moins une phase (Paris)
              const currentHighestByPhase =
                (playerData?.highestTeamNumberByPhaseParis as
                  | { aller?: number; retour?: number }
                  | undefined) || {};

              const newHighestByPhase: {
                aller?: number;
                retour?: number;
              } = { ...currentHighestByPhase };

              // Mettre à jour pour chaque phase
              for (const [phase, burnedTeam] of highestBurnedTeamByPhaseParis) {
                if (phase === "aller" || phase === "retour") {
                  const currentHighest = currentHighestByPhase[phase] ?? null;

                  if (
                    currentHighest === null ||
                    burnedTeam !== currentHighest
                  ) {
                    newHighestByPhase[phase] = burnedTeam;
                  }
                }
              }

              const hasChanges = Object.keys(newHighestByPhase).some(
                (phase) =>
                  newHighestByPhase[phase as "aller" | "retour"] !==
                  currentHighestByPhase[phase as "aller" | "retour"]
              );

              if (hasChanges || Object.keys(newHighestByPhase).length > 0) {
                updates.highestTeamNumberByPhaseParis = newHighestByPhase;
              }
            } else if (!hasMatchesParis) {
              // Le joueur n'a plus de matchs Paris, supprimer le brûlage si le champ existe
              if (
                (playerData?.highestTeamNumberByPhaseParis as unknown) !==
                undefined
              ) {
                updates.highestTeamNumberByPhaseParis = FieldValue.delete();
              }
            }

            // Mettre à jour matchesByTeamByPhaseParis pour l'affichage dans le tooltip
            const matchesByPhaseParis =
              matchesByTeamByPlayerByPhaseParis.get(playerId);
            if (matchesByPhaseParis && matchesByPhaseParis.size > 0) {
              // Convertir la Map par phase en objet pour Firestore
              const matchesByTeamByPhaseObj: {
                aller?: { [teamNumber: number]: number };
                retour?: { [teamNumber: number]: number };
              } = {};

              for (const [phase, matchesByTeam] of matchesByPhaseParis) {
                const matchesByTeamObj: { [teamNumber: number]: number } = {};
                matchesByTeam.forEach((count, teamNumber) => {
                  matchesByTeamObj[teamNumber] = count;
                });
                matchesByTeamByPhaseObj[phase as "aller" | "retour"] =
                  matchesByTeamObj;
              }

              updates.matchesByTeamByPhaseParis = matchesByTeamByPhaseObj;
            }

            // Ajouter updatedAt si il y a des mises à jour
            if (Object.keys(updates).length > 0) {
              updates.updatedAt = Timestamp.now();
              playersToUpdate.push({ playerId, updates });
            }
          }
        } catch (error) {
          console.error(
            `❌ Erreur lors de la récupération du joueur ${playerId}:`,
            error
          );
          errors++;
        }
      }

      console.log(
        `\n📊 ${playersToUpdate.length} joueurs nécessitent une mise à jour de leur statut`
      );

      // Mettre à jour par batch
      const batchSize = 500;
      for (let i = 0; i < playersToUpdate.length; i += batchSize) {
        const batch = db.batch();
        const batchEnd = Math.min(i + batchSize, playersToUpdate.length);

        for (let j = i; j < batchEnd; j++) {
          const { playerId, updates } = playersToUpdate[j];
          const playerRef = db.collection("players").doc(playerId);
          batch.update(playerRef, updates);
          updated++;
        }

        try {
          await batch.commit();
          console.log(
            `✅ Batch ${Math.floor(i / batchSize) + 1} traité: ${
              batchEnd - i
            } joueurs mis à jour`
          );
        } catch (error) {
          console.error(
            `❌ Erreur lors du commit du batch ${
              Math.floor(i / batchSize) + 1
            }:`,
            error
          );
          errors += batchEnd - i;
        }
      }

      console.log(
        `✅ Participation mise à jour: ${updated} joueurs, ${errors} erreurs`
      );
      return { updated, errors };
    } catch (error) {
      console.error(
        "❌ Erreur lors de la mise à jour de la participation:",
        error
      );
      return { updated, errors: 0 };
    }
  }

  /**
   * Sauvegarde les matchs dans les sous-collections des équipes
   */
  async saveMatchesToTeamSubcollections(
    matches: MatchData[],
    db: Firestore
  ): Promise<{ saved: number; errors: number }> {
    return saveMatchesToTeamSubcollections(matches, db);
  }

}
