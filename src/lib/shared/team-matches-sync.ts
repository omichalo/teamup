import { FFTTAPI } from "@omichalo/ffttapi-node";
import { getFFTTConfig } from "./fftt-utils";
import {
  FFTTEquipe,
  FFTTRencontre,
  FFTTDetailsRencontre,
  FFTTJoueur,
} from "./fftt-types";
import { createBaseMatch, isFemaleTeam } from "./fftt-utils";
import type { Firestore } from "firebase-admin/firestore";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

// Type pour les joueurs dans les recherches
interface PlayerSearch {
  id: string;
  nom?: string;
  prenom?: string;
  licence?: string;
  points?: number;
  sexe?: string;
}

// Fonctions de conversion de type pour la bibliothèque FFTT
function convertToFFTTRencontre(rencontre: unknown): FFTTRencontre {
  const r = rencontre as Record<string, unknown>;
  return {
    nomEquipeA: String(r.nomEquipeA || ""),
    nomEquipeB: String(r.nomEquipeB || ""),
    scoreEquipeA: typeof r.scoreEquipeA === "number" ? r.scoreEquipeA : null,
    scoreEquipeB: typeof r.scoreEquipeB === "number" ? r.scoreEquipeB : null,
    lien: String(r.lien || ""),
    ...(r.libelle ? { libelle: String(r.libelle) } : {}),
    ...(r.dateReelle instanceof Date ? { dateReelle: r.dateReelle } : {}),
    ...(r.datePrevue instanceof Date ? { datePrevue: r.datePrevue } : {}),
  };
}

function convertToFFTTDetailsRencontre(details: unknown): FFTTDetailsRencontre {
  const d = details as Record<string, unknown>;
  
  // Gérer joueursA : peut être un tableau ou un objet
  let joueursA: FFTTJoueur[] = [];
  if (d.joueursA) {
    if (Array.isArray(d.joueursA)) {
      joueursA = d.joueursA.map(convertToFFTTJoueur);
    } else if (typeof d.joueursA === "object" && d.joueursA !== null) {
      // Si c'est un objet, convertir les valeurs en tableau
      joueursA = Object.values(d.joueursA).map(convertToFFTTJoueur);
    }
  }
  
  // Gérer joueursB : peut être un tableau ou un objet
  let joueursB: FFTTJoueur[] = [];
  if (d.joueursB) {
    if (Array.isArray(d.joueursB)) {
      joueursB = d.joueursB.map(convertToFFTTJoueur);
    } else if (typeof d.joueursB === "object" && d.joueursB !== null) {
      // Si c'est un objet, convertir les valeurs en tableau
      joueursB = Object.values(d.joueursB).map(convertToFFTTJoueur);
    }
  }
  
  return {
    nomEquipeA: String(d.nomEquipeA || ""),
    nomEquipeB: String(d.nomEquipeB || ""),
    joueursA,
    joueursB,
    parties: Array.isArray(d.parties) ? d.parties.map(convertToPartie) : [],
    ...(typeof d.expectedScoreEquipeA === "number" && {
      expectedScoreEquipeA: d.expectedScoreEquipeA,
    }),
    ...(typeof d.expectedScoreEquipeB === "number" && {
      expectedScoreEquipeB: d.expectedScoreEquipeB,
    }),
    ...(typeof d.scoreEquipeA === "number" || d.scoreEquipeA === null
      ? { scoreEquipeA: d.scoreEquipeA }
      : {}),
    ...(typeof d.scoreEquipeB === "number" || d.scoreEquipeB === null
      ? { scoreEquipeB: d.scoreEquipeB }
      : {}),
  };
}

function convertToFFTTJoueur(joueur: unknown): FFTTJoueur {
  const j = joueur as Record<string, unknown>;
  return {
    licence: String(j.licence || ""),
    nom: String(j.nom || ""),
    prenom: String(j.prenom || ""),
    points: typeof j.points === "number" ? j.points : null,
    sexe: j.sexe ? String(j.sexe) : "M", // Valeur par défaut si undefined
    ...(j.club ? { club: String(j.club) } : {}),
  };
}

function convertToPartie(partie: unknown): {
  adversaireA: string;
  adversaireB: string;
  scoreA: number;
  scoreB: number;
  setDetails: string;
} {
  const p = partie as Record<string, unknown>;
  return {
    adversaireA: String(p.adversaireA || ""),
    adversaireB: String(p.adversaireB || ""),
    scoreA: typeof p.scoreA === "number" ? p.scoreA : 0,
    scoreB: typeof p.scoreB === "number" ? p.scoreB : 0,
    setDetails: String(p.setDetails || ""),
  };
}

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
  journee: number;
  isFemale: boolean;
  division: string;
  teamId: string;
  epreuve: string;
  score?: string | undefined;
  result: string;
  rencontreId: string;
  equipeIds: { equipe1: string; equipe2: string };
  lienDetails: string;
  resultatsIndividuels?:
    | Array<{
        joueurA: string;
        joueurB: string;
        scoreA: number;
        scoreB: number;
      }>
    | undefined;
  joueursSQY?:
    | Array<{
        id: string;
        nom?: string;
        prenom?: string;
        licence?: string;
        points?: number;
        sexe?: string;
      }>
    | undefined;
  joueursAdversaires?:
    | Array<{
        id: string;
        nom?: string;
        prenom?: string;
        licence?: string;
        points?: number;
        sexe?: string;
      }>
    | undefined;
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
      console.log(`🔄 Synchronisation des matchs pour l&apos;équipe ${teamId}...`);
      await this.ffttApi.initialize();

      // Récupérer les équipes du club
      const equipes = await this.ffttApi.getEquipesByClub(this.clubCode);

      // Trouver l&apos;équipe spécifique
      const equipeFound = equipes.find(
        (eq: FFTTEquipe) =>
          eq.idEquipe.toString() === teamId.replace("sqyping_team_", "")
      );

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
          console.log(`🔍 Récupération des détails pour ${rencontre.lien}:`);

          // Extraire les numéros de club depuis le lien (comme dans real-matches-optimized.ts)
          const clubnum1Match = rencontre.lien.match(/clubnum_1=([^&]+)/);
          const clubnum2Match = rencontre.lien.match(/clubnum_2=([^&]+)/);

          let clubEquipeA, clubEquipeB;
          if (clubnum1Match && clubnum2Match) {
            // Vérifier quelle équipe est SQY PING
            const equip1Match = rencontre.lien.match(/equip_1=([^&]+)/);
            const equip2Match = rencontre.lien.match(/equip_2=([^&]+)/);

            if (equip1Match && equip1Match[1].includes("SQY+PING")) {
              clubEquipeA = clubnum1Match[1];
              clubEquipeB = clubnum2Match[1];
            } else if (equip2Match && equip2Match[1].includes("SQY+PING")) {
              clubEquipeA = clubnum2Match[1];
              clubEquipeB = clubnum1Match[1];
            } else {
              // Fallback: utiliser les IDs d&apos;équipe comme clubs
              clubEquipeA = this.extractClubIdFromLien(
                rencontre.lien,
                "clubnum_1"
              );
              clubEquipeB = this.extractClubIdFromLien(
                rencontre.lien,
                "clubnum_2"
              );
            }
          } else {
            // Fallback: utiliser les IDs d&apos;équipe comme clubs
            clubEquipeA = this.extractClubIdFromLien(
              rencontre.lien,
              "clubnum_1"
            );
            clubEquipeB = this.extractClubIdFromLien(
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
            this.clubCode,
            convertToFFTTDetailsRencontre(detailsRencontre)
          );
          processedMatches.push(matchData);
        } catch (error) {
          console.warn(
            `⚠️ Impossible de récupérer les détails pour ${rencontre.lien}:`,
            error
          );
          // Créer le match sans les détails des joueurs
          const matchData = createBaseMatch(
            rencontre as FFTTRencontre,
            equipe,
            this.clubCode
          );
          processedMatches.push(matchData);
        }
      }

      return {
        success: true,
        matchesCount: processedMatches.length,
        message: `Synchronisation réussie: ${processedMatches.length} matchs pour ${equipe.libelle}`,
        processedMatches,
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
      const filteredEquipes = equipes
        .filter(
          (equipe: FFTTEquipe) =>
            equipe.idEpreuve === 15954 || equipe.idEpreuve === 15955
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
      const matchesWithRecalculatedJournees = this.recalculateJourneesByDate(allMatches);

      // Enrichir les matchs avec les licences des joueurs avant de mettre à jour la participation
      let enrichedMatches = matchesWithRecalculatedJournees;
      if (db && allMatches.length > 0) {
        console.log(
          "🔄 Enrichissement des matchs avec les licences des joueurs..."
        );
        enrichedMatches = await Promise.all(
          allMatches.map((match) => this.enrichSQYPlayersFromClub(match, db))
        );
        console.log(
          `✅ ${enrichedMatches.length} matchs enrichis`
        );

        // Mettre à jour la participation des joueurs avec les matchs enrichis
        console.log(
          "🔄 Mise à jour de la participation des joueurs basée sur les matchs enrichis..."
        );
        const participationResult =
          await this.updatePlayerParticipationFromMatches(enrichedMatches, db);
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
      
      // Vérifier si c'est une équipe féminine pour debug
      const isFemaleForDebug = equipe.isFemale !== undefined 
        ? equipe.isFemale 
        : isFemaleTeam(
            equipe.libelle,
            equipe.division,
            equipe.libelleEpreuve,
            equipe.idEpreuve
          );
      
      console.log(`Récupération des matchs pour l'équipe: ${equipe.libelle} (ID: ${equipe.idEquipe}, Féminin: ${isFemaleForDebug})`);
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
          console.log(`   └─ Équipe: ${equipe.libelle} | Division: ${equipe.division}`);
        }

        // Transformer les matchs avec récupération des détails
        const processedMatches: MatchData[] = [];

        for (const rencontre of sqyPingMatches) {
          try {
            // Récupérer les détails de la rencontre pour avoir les joueurs
            if (isDebugTeam) {
              console.log(`🔍 Récupération des détails pour ${rencontre.lien}:`);
            }

            // Extraire les numéros de club depuis le lien (comme dans real-matches-optimized.ts)
            const clubnum1Match = rencontre.lien.match(/clubnum_1=([^&]+)/);
            const clubnum2Match = rencontre.lien.match(/clubnum_2=([^&]+)/);

            let clubEquipeA, clubEquipeB;
            if (clubnum1Match && clubnum2Match) {
              // Vérifier quelle équipe est SQY PING
              const equip1Match = rencontre.lien.match(/equip_1=([^&]+)/);
              const equip2Match = rencontre.lien.match(/equip_2=([^&]+)/);

              if (equip1Match && equip1Match[1].includes("SQY+PING")) {
                clubEquipeA = clubnum1Match[1];
                clubEquipeB = clubnum2Match[1];
              } else if (equip2Match && equip2Match[1].includes("SQY+PING")) {
                clubEquipeA = clubnum2Match[1];
                clubEquipeB = clubnum1Match[1];
              } else {
                // Fallback: utiliser les IDs d&apos;équipe comme clubs
                clubEquipeA =
                  (rencontre as FFTTRencontre & { idClubA?: string }).idClubA ||
                  "";
                clubEquipeB =
                  (rencontre as FFTTRencontre & { idClubB?: string }).idClubB ||
                  "";
              }
            } else {
              // Fallback: utiliser les IDs d&apos;équipe comme clubs
              clubEquipeA = this.extractClubIdFromLien(
                rencontre.lien,
                "clubnum_1"
              );
              clubEquipeB = this.extractClubIdFromLien(
                rencontre.lien,
                "clubnum_2"
              );
            }

            if (isDebugTeam) {
              console.log(`  - clubEquipeA: ${clubEquipeA}`);
              console.log(`  - clubEquipeB: ${clubEquipeB}`);
            }

            const detailsRencontre =
              await this.ffttApi.getDetailsRencontreByLien(
                rencontre.lien,
                clubEquipeA || "",
                clubEquipeB || ""
              );

            if (isDebugTeam) {
              console.log(
                `  - detailsRencontre:`,
                detailsRencontre ? "présent" : "absent"
              );
            }

            // Logger tous les matchs pour analyser pourquoi certains ne sont pas détectés (uniquement pour l'équipe debug)
            if (detailsRencontre && isDebugTeam) {
              const hasScore =
                detailsRencontre.scoreEquipeA > 0 ||
                detailsRencontre.scoreEquipeB > 0;
              const hasJoueurs =
                (detailsRencontre.joueursA &&
                  Object.keys(detailsRencontre.joueursA).length > 0) ||
                (detailsRencontre.joueursB &&
                  Object.keys(detailsRencontre.joueursB).length > 0);

              console.log(
                `  - Match: ${detailsRencontre.nomEquipeA} vs ${detailsRencontre.nomEquipeB}`
              );
              console.log(
                `  - Scores: ${detailsRencontre.scoreEquipeA}-${detailsRencontre.scoreEquipeB} (hasScore: ${hasScore})`
              );
              console.log(
                `  - Joueurs: A=${
                  Object.keys(detailsRencontre.joueursA || {}).length
                }, B=${
                  Object.keys(detailsRencontre.joueursB || {}).length
                } (hasJoueurs: ${hasJoueurs})`
              );

              if (hasScore && hasJoueurs) {
                console.log(
                  `  - ✅ MATCH JOUÉ DÉTECTÉ:`,
                  JSON.stringify(detailsRencontre, null, 2)
                );
              } else if (hasScore && !hasJoueurs) {
                console.log(
                  `  - ⚠️  MATCH AVEC SCORE MAIS SANS JOUEURS:`,
                  JSON.stringify(detailsRencontre, null, 2)
                );
              } else if (!hasScore && hasJoueurs) {
                console.log(
                  `  - ⚠️  MATCH AVEC JOUEURS MAIS SANS SCORE:`,
                  JSON.stringify(detailsRencontre, null, 2)
                );
              }
            }

            // Convertir les détails avant de créer le match
            const convertedDetails = convertToFFTTDetailsRencontre(detailsRencontre);
            
            // Logger les joueurs avant conversion dans createBaseMatch (uniquement pour l'équipe debug)
            if (detailsRencontre && isDebugTeam) {
              console.log(
                `  - 🔍 DEBUG: Avant createBaseMatch - joueursA type: ${Array.isArray(convertedDetails.joueursA) ? "array" : typeof convertedDetails.joueursA}, count: ${convertedDetails.joueursA?.length || 0}`
              );
              console.log(
                `  - 🔍 DEBUG: Avant createBaseMatch - joueursB type: ${Array.isArray(convertedDetails.joueursB) ? "array" : typeof convertedDetails.joueursB}, count: ${convertedDetails.joueursB?.length || 0}`
              );
            }
            
            // Logger le libellé pour debug (uniquement pour l'équipe debug)
            if (isDebugTeam && (rencontre as FFTTRencontre).libelle) {
              console.log(
                `  - 🔍 DEBUG: Libellé de la rencontre: "${(rencontre as FFTTRencontre).libelle}"`
              );
            }
            
            // Logger l'équipe utilisée pour créer le match (uniquement pour l'équipe debug)
            if (isDebugTeam) {
              console.log(
                `  - 🔍 DEBUG: Équipe utilisée pour createBaseMatch - libelle: "${equipe.libelle}", equipe.isFemale: ${equipe.isFemale}`
              );
            }
            
            const matchData = createBaseMatch(
              rencontre as FFTTRencontre,
              equipe,
              this.clubCode,
              convertedDetails
            );
            
            // Logger le résultat de createBaseMatch (uniquement pour l'équipe debug)
            if (isDebugTeam) {
              console.log(
                `  - 🔍 DEBUG: Après createBaseMatch - matchData.isFemale: ${matchData.isFemale}, teamNumber: ${matchData.teamNumber}`
              );
            }
            
            // Logger les informations du match avec le nom de l'équipe et le nombre de joueurs (uniquement pour l'équipe debug)
            if (isDebugTeam) {
              console.log(
                `  - 🔍 DEBUG: Journée extraite: ${matchData.journee}`
              );
              const joueursSQYCount = matchData.joueursSQY?.length || 0;
              const joueursAdversairesCount = matchData.joueursAdversaires?.length || 0;
              const matchDate = new Date(matchData.date).toLocaleDateString('fr-FR');
              
              console.log(
                `\n  📋 Match ${equipe.libelle} (Équipe ${matchData.teamNumber}):`
              );
              console.log(
                `     Date: ${matchDate} | Opposant: ${matchData.opponent} | Score: ${matchData.score || "N/A"}`
              );
              console.log(
                `     👥 Joueurs SQY Ping: ${joueursSQYCount} | Joueurs adversaires: ${joueursAdversairesCount}`
              );
              
              if (joueursSQYCount > 0 && matchData.joueursSQY) {
                console.log(`     🔹 Joueurs SQY Ping:`);
                matchData.joueursSQY.forEach((joueur, idx) => {
                  const licenceInfo = joueur.licence ? `(licence: ${joueur.licence})` : "(licence: VIDE)";
                  console.log(
                    `        ${idx + 1}. ${joueur.prenom || ""} ${joueur.nom || ""} ${licenceInfo}`
                  );
                });
              }
            }
            
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
              this.clubCode
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
   * Extrait l&apos;ID du club depuis le lien de rencontre
   */
  private extractClubIdFromLien(lien: string, param: string): string | null {
    const regex = new RegExp(`${param}=([^&]+)`);
    const match = lien.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Enrichit les données des joueurs SQY quand les licences sont vides
   */
  async enrichSQYPlayersFromClub(
    match: MatchData,
    db: Firestore
  ): Promise<MatchData> {
    // Si pas de joueurs SQY, pas besoin d&apos;enrichir
    if (!match.joueursSQY || match.joueursSQY.length === 0) {
      return match;
    }

    try {
      // Récupérer tous les joueurs du club SQY PING
      const playersSnapshot = await db.collection("players").get();
      const allPlayers = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Enrichir chaque joueur individuellement s&apos;il a une licence vide
      const enrichedJoueursSQY = match.joueursSQY.map((joueur) => {
        if (!joueur.licence || joueur.licence.trim() === "") {
          // Normaliser les noms pour la recherche (supprimer accents, espaces multiples, etc.)
          const normalizeName = (name: string) => {
            return name
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
              .replace(/\s+/g, " ") // Remplacer les espaces multiples par un seul
              .trim();
          };

          const joueurNomNormalized = normalizeName(
            (joueur as { nom?: string }).nom || ""
          );
          const joueurPrenomNormalized = normalizeName(
            (joueur as { prenom?: string }).prenom || ""
          );

          // Chercher un joueur par nom et prénom (recherche exacte d&apos;abord)
          let foundPlayer = allPlayers.find(
            (p) =>
              (p as PlayerSearch).nom &&
              (p as PlayerSearch).prenom &&
              (p as PlayerSearch).nom!.toLowerCase() ===
                (joueur as { nom?: string }).nom?.toLowerCase() &&
              (p as PlayerSearch).prenom!.toLowerCase() ===
                (joueur as { prenom?: string }).prenom?.toLowerCase()
          );

          // Si pas trouvé, essayer avec les noms normalisés
          if (!foundPlayer) {
            foundPlayer = allPlayers.find(
              (p) =>
                (p as PlayerSearch).nom &&
                (p as PlayerSearch).prenom &&
                normalizeName((p as PlayerSearch).nom!) ===
                  joueurNomNormalized &&
                normalizeName((p as PlayerSearch).prenom!) ===
                  joueurPrenomNormalized
            );
          }

          // Si toujours pas trouvé, essayer une recherche partielle (prénom + nom)
          if (!foundPlayer) {
            foundPlayer = allPlayers.find(
              (p) =>
                (p as PlayerSearch).nom &&
                (p as PlayerSearch).prenom &&
                (normalizeName((p as PlayerSearch).nom!).includes(
                  joueurNomNormalized
                ) ||
                  joueurNomNormalized.includes(
                    normalizeName((p as PlayerSearch).nom!)
                  )) &&
                (normalizeName((p as PlayerSearch).prenom!).includes(
                  joueurPrenomNormalized
                ) ||
                  joueurPrenomNormalized.includes(
                    normalizeName((p as PlayerSearch).prenom!)
                  ))
            );
          }

          if (foundPlayer) {
            console.log(
              `🔍 Joueur trouvé par nom: ${
                (joueur as { prenom?: string }).prenom
              } ${(joueur as { nom?: string }).nom} -> licence: ${
                (foundPlayer as PlayerSearch).licence
              }`
            );
            return {
              ...joueur,
              licence: (foundPlayer as PlayerSearch).licence,
              points:
                (foundPlayer as PlayerSearch).points ||
                (joueur as { points?: number }).points,
              sexe:
                (foundPlayer as PlayerSearch).sexe ||
                (joueur as { sexe?: string }).sexe,
            };
          } else {
            console.log(
              `⚠️  Joueur non trouvé par nom: ${
                (joueur as { prenom?: string }).prenom
              } ${(joueur as { nom?: string }).nom}`
            );
          }
        }
        return joueur;
      });

      // Sérialiser les joueurs pour éviter les problèmes de type
      const serializedJoueursSQY = enrichedJoueursSQY.map((joueur) => ({
        id: joueur.id,
        nom: joueur.nom || "",
        prenom: joueur.prenom || "",
        licence: joueur.licence || "",
        points: joueur.points || 0,
        sexe: joueur.sexe || "M",
      }));

      return {
        ...match,
        joueursSQY: serializedJoueursSQY,
      };
    } catch (error) {
      console.error(
        "❌ Erreur lors de l&apos;enrichissement des joueurs SQY:",
        error
      );
      return match;
    }
  }

  /**
   * Met à jour la participation des joueurs basée sur leur participation aux matchs
   */
  async updatePlayerParticipationFromMatches(
    matches: MatchData[],
    db: Firestore
  ): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;

    try {
      console.log(
        "🔄 Mise à jour de la participation des joueurs basée sur les matchs..."
      );

      // Enrichir d&apos;abord les données des joueurs SQY
      const enrichedMatches = await Promise.all(
        matches.map((match) => this.enrichSQYPlayersFromClub(match, db))
      );

      // Collecter tous les joueurs qui participent à au moins un match
      const participatingPlayers = new Set<string>();

      for (const match of enrichedMatches) {
        // Un match est considéré comme joué s&apos;il a des joueurs OU des résultats individuels OU des scores > 0
        const hasPlayers =
          match.joueursSQY &&
          Array.isArray(match.joueursSQY) &&
          match.joueursSQY.length > 0;
        const hasResults =
          match.resultatsIndividuels &&
          Array.isArray(match.resultatsIndividuels) &&
          match.resultatsIndividuels.length > 0;
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
          // Logs détaillés uniquement pour l'équipe debug (33882)
          const DEBUG_TEAM_ID = 33882;
          const isDebugTeam = match.teamId === DEBUG_TEAM_ID.toString();
          
          if (isDebugTeam) {
            // Récupérer le nom de l'équipe depuis teamId ou matchData
            const teamName = `Équipe ${match.teamNumber}${match.isFemale ? " (DAMES)" : " (MASCULINE)"}`;
            const matchDate = new Date(match.date).toLocaleDateString('fr-FR');
            
            console.log(
              `\n🎾 Match joué détecté - ${teamName}:`
            );
            console.log(
              `   📅 Date: ${matchDate} | Opposant: ${match.opponent} | Score: ${match.score || "0-0"}`
            );
            console.log(
              `   👥 Joueurs SQY Ping: ${match.joueursSQY?.length || 0} | Résultats individuels: ${match.resultatsIndividuels?.length || 0}`
            );
          }

          // Note: resultatsIndividuels ne contient pas de licence, on utilise joueursSQY

          // Vérifier aussi joueursSQY (nouveau format)
          if (hasPlayers) {
            for (const joueur of match.joueursSQY!) {
              if (joueur.licence && joueur.licence.trim() !== "") {
                participatingPlayers.add(joueur.licence);
                console.log(
                  `  ✅ Joueur ajouté: ${joueur.nom || ""} ${joueur.prenom || ""} (licence: ${joueur.licence})`
                );
              } else {
                console.log(
                  `  ⚠️  Joueur sans licence ignoré: ${joueur.nom || ""} ${joueur.prenom || ""} - Date: ${match.date} - Opponent: ${match.opponent}`
                );
              }
            }
          }
        }
      }

      console.log(
        `\n📊 Résumé: ${participatingPlayers.size} joueurs participants identifiés au total`
      );
      console.log(`   Licences: ${Array.from(participatingPlayers).join(", ")}`);

      // Calculer les équipes de brûlage séparément pour masculin et féminin
      console.log(
        "\n🔄 Calcul des équipes de brûlage (masculin et féminin)..."
      );

      // Structures séparées pour masculin et féminin: Map<licence, Map<phase, Map<teamNumber, count>>>
      const matchCountByPlayerPhaseTeamMasculin = new Map<
        string,
        Map<string, Map<number, number>>
      >();
      const matchCountByPlayerPhaseTeamFeminin = new Map<
        string,
        Map<string, Map<number, number>>
      >();

      // Compter les matchs par joueur, phase et équipe (séparer masculin et féminin)
      let debugCountMasculin = 0;
      let debugCountFeminin = 0;
      const DEBUG_LICENCE = "7872755"; // Licence pour debug
      
      for (const match of enrichedMatches) {
        const isFeminin = match.isFemale;
        if (isFeminin) {
          debugCountFeminin++;
        } else {
          debugCountMasculin++;
        }
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

            // Log pour debug de la licence spécifique
            if (playerLicence === DEBUG_LICENCE) {
              console.log(
                `🔍 DEBUG ${DEBUG_LICENCE}: Match ${isFeminin ? "FÉMININ" : "MASCULIN"} - Équipe ${teamNumber}, Phase ${phase}`
              );
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
        typeName: string
      ): {
        highestBurnedTeamByPlayerByPhase: Map<string, Map<string, number>>; // licence -> phase -> teamNumber
        matchesByTeamByPlayerByPhase: Map<string, Map<string, Map<number, number>>>; // licence -> phase -> teamNumber -> count
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
          const playerMatchesByPhase = new Map<
            string,
            Map<number, number>
          >();

          // Calculer le brûlage pour chaque phase séparément
          for (const [phase, teamMap] of phaseMap) {
            // Calculer le total de matchs pour cette phase uniquement
            let totalMatchesInPhase = 0;
            const matchesByTeamInPhase = new Map<number, number>();

            for (const [teamNumber, matchCount] of teamMap) {
              totalMatchesInPhase += matchCount;
              matchesByTeamInPhase.set(teamNumber, matchCount);
            }

            // Stocker les matchs par équipe pour cette phase
            if (matchesByTeamInPhase.size > 0) {
              playerMatchesByPhase.set(phase, matchesByTeamInPhase);
            }

            // Déterminer l'équipe de brûlage pour cette phase
            // Règle : Si un joueur a joué >= 2 matchs dans cette phase, il est brûlé
            // dans la plus basse équipe (numéro le plus élevé) où il a joué dans cette phase
            let highestBurnedTeamInPhase: number | null = null;

            if (totalMatchesInPhase >= 2) {
              // Le joueur est brûlé dans la plus basse équipe (numéro le plus élevé) où il a joué dans cette phase
              const teamNumbers = Array.from(matchesByTeamInPhase.keys());
              if (teamNumbers.length > 0) {
                highestBurnedTeamInPhase = Math.max(...teamNumbers);
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
            matchesByTeamByPlayerByPhase.set(playerLicence, playerMatchesByPhase);
          }
        }

        // Compter le nombre total de joueurs brûlés (toutes phases confondues pour le log)
        let totalBurnedPlayers = 0;
        for (const phaseMap of highestBurnedTeamByPlayerByPhase.values()) {
          totalBurnedPlayers += phaseMap.size;
        }

        console.log(
          `✅ ${highestBurnedTeamByPlayerByPhase.size} joueurs avec brûlage identifiés en ${typeName} (${totalBurnedPlayers} brûlages au total toutes phases confondues)`
        );

        // Log pour debug de la licence spécifique
        const DEBUG_LICENCE = "7872755";
        if (matchesByTeamByPlayerByPhase.has(DEBUG_LICENCE)) {
          const matchesByPhase = matchesByTeamByPlayerByPhase.get(
            DEBUG_LICENCE
          )!;
          const burnoutByPhase =
            highestBurnedTeamByPlayerByPhase.get(DEBUG_LICENCE) || new Map();
          console.log(
            `🔍 DEBUG ${DEBUG_LICENCE} (${typeName}):`
          );
          for (const [phase, matches] of matchesByPhase) {
            const totalMatches = Array.from(matches.values()).reduce(
              (a, b) => a + b,
              0
            );
            const burnedTeam = burnoutByPhase.get(phase);
            console.log(
              `  Phase ${phase}: Total matchs: ${totalMatches}, Équipes: ${Array.from(matches.entries())
                .map(([t, c]) => `${t}:${c}`)
                .join(", ")}, Brûlé: ${burnedTeam || "non"}`
            );
          }
        }

        return {
          highestBurnedTeamByPlayerByPhase,
          matchesByTeamByPlayerByPhase,
        };
      };

      console.log(
        `📊 Répartition des matchs: ${debugCountMasculin} masculins, ${debugCountFeminin} féminins`
      );
      console.log(
        `📊 Joueurs avec matchs masculins: ${matchCountByPlayerPhaseTeamMasculin.size}, avec matchs féminins: ${matchCountByPlayerPhaseTeamFeminin.size}`
      );

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


      // Récupérer les données actuelles des joueurs pour éviter les mises à jour inutiles
      // Inclure tous les joueurs qui ont participé OU qui ont des matchs enregistrés (masculin ou féminin)
      const allPlayerIds = new Set([
        ...Array.from(participatingPlayers),
        ...Array.from(masculineMatchesByTeamByPlayerByPhase.keys()),
        ...Array.from(feminineMatchesByTeamByPlayerByPhase.keys()),
      ]);
      const playerIds = Array.from(allPlayerIds);
      const playersToUpdate = [];

      for (const playerId of playerIds) {
        try {
          const playerDoc = await db.collection("players").doc(playerId).get();
          if (playerDoc.exists) {
            const playerData = playerDoc.data();
            const updates: Record<string, unknown> = {};

            // Mettre à jour hasPlayedAtLeastOneMatch si pas déjà true
            if (!playerData?.hasPlayedAtLeastOneMatch) {
              updates.hasPlayedAtLeastOneMatch = true;
            }

            // Mettre à jour participation.championnat si pas déjà true
            if (!playerData?.participation?.championnat) {
              updates["participation.championnat"] = true;
            }

            // Mettre à jour highestMasculineTeamNumberByPhase si le joueur est brûlé en masculin
            const highestMasculineBurnedTeamByPhase =
              highestMasculineBurnedTeamByPlayerByPhase.get(playerId);
            const hasMasculineMatches =
              masculineMatchesByTeamByPlayerByPhase.has(playerId);

            if (highestMasculineBurnedTeamByPhase) {
              // Le joueur est brûlé en masculin pour au moins une phase
              const currentHighestByPhase =
                playerData?.highestMasculineTeamNumberByPhase || {};

              const newHighestByPhase: {
                aller?: number;
                retour?: number;
              } = { ...currentHighestByPhase };

              // Mettre à jour pour chaque phase
              for (const [phase, burnedTeam] of highestMasculineBurnedTeamByPhase) {
                if (phase === "aller" || phase === "retour") {
                  const currentHighest = currentHighestByPhase[phase] ?? null;

                  // Mettre à jour uniquement si la nouvelle valeur est plus restrictive
                  // (équipe plus basse, donc numéro plus élevé) ou si la valeur actuelle est absente
                  if (currentHighest === null || burnedTeam > currentHighest) {
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
              if (playerData?.highestMasculineTeamNumberByPhase) {
                updates.highestMasculineTeamNumberByPhase =
                  FieldValue.delete() as any;
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
                playerData?.highestFeminineTeamNumberByPhase || {};

              const newHighestByPhase: {
                aller?: number;
                retour?: number;
              } = { ...currentHighestByPhase };

              // Mettre à jour pour chaque phase
              for (const [phase, burnedTeam] of highestFeminineBurnedTeamByPhase) {
                if (phase === "aller" || phase === "retour") {
                  const currentHighest = currentHighestByPhase[phase] ?? null;

                  // Mettre à jour uniquement si la nouvelle valeur est plus restrictive
                  // (équipe plus basse, donc numéro plus élevé) ou si la valeur actuelle est absente
                  if (currentHighest === null || burnedTeam > currentHighest) {
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
              if (playerData?.highestFeminineTeamNumberByPhase) {
                updates.highestFeminineTeamNumberByPhase =
                  FieldValue.delete() as any;
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
    let saved = 0;
    const errors = 0;

    try {
      console.log(
        `💾 Sauvegarde de ${matches.length} matchs dans les sous-collections...`
      );

      // Grouper les matchs par équipe
      const matchesByTeam = new Map<string, MatchData[]>();

      // Grouper les matchs par équipe (utiliser le champ teamId du match)
      matches.forEach((match) => {
        const teamId = match.teamId;

        if (teamId) {
          if (!matchesByTeam.has(teamId)) {
            matchesByTeam.set(teamId, []);
          }
          matchesByTeam.get(teamId)!.push(match);
        } else {
          console.warn(`⚠️ Match sans teamId: ${match.id}`);
        }
      });

      console.log(`📊 ${matchesByTeam.size} équipes avec des matchs`);
      console.log(`📊 Équipes: ${Array.from(matchesByTeam.keys()).join(", ")}`);

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
            Object.keys(matchData).forEach((key) => {
              if ((matchData as Record<string, unknown>)[key] === undefined) {
                delete (matchData as Record<string, unknown>)[key];
              }
            });

            // Convertir les objets JoueurRencontre en objets simples pour Firestore
            const serializableMatchData = {
              ...matchData,
              joueursSQY:
                matchData.joueursSQY?.map((joueur) => ({
                  licence: joueur.licence,
                  nom: (joueur as { nom?: string }).nom,
                  prenom: (joueur as { prenom?: string }).prenom,
                  points: joueur.points,
                  sexe: joueur.sexe,
                })) || [],
              joueursAdversaires:
                matchData.joueursAdversaires?.map((joueur) => ({
                  licence: joueur.licence,
                  nom: (joueur as { nom?: string }).nom,
                  prenom: (joueur as { prenom?: string }).prenom,
                  points: joueur.points,
                  sexe: joueur.sexe,
                })) || [],
            };

            // Forcer la mise à jour des champs importants même s&apos;ils étaient vides avant
            const updateData = {
              ...serializableMatchData,
              // Toujours mettre à jour ces champs même s&apos;ils étaient vides
              joueursSQY: serializableMatchData.joueursSQY || [],
              joueursAdversaires:
                serializableMatchData.joueursAdversaires || [],
              score: serializableMatchData.score || null,
              resultatsIndividuels:
                serializableMatchData.resultatsIndividuels || null,
            };

            batch.set(docRef, updateData, { merge: true });
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

  /**
   * Recalcule les numéros de journée en fonction de la date des matchs
   * Si un match a déjà une journée > 1 extraite depuis le libellé, on la garde
   * Sinon, on calcule en fonction de la position dans la liste triée par date
   */
  private recalculateJourneesByDate(matches: MatchData[]): MatchData[] {
    // Grouper les matchs par équipe
    const matchesByTeam = new Map<string, MatchData[]>();
    
    matches.forEach((match) => {
      const teamKey = match.teamId || `team_${match.teamNumber}`;
      if (!matchesByTeam.has(teamKey)) {
        matchesByTeam.set(teamKey, []);
      }
      matchesByTeam.get(teamKey)!.push(match);
    });

    // Pour chaque équipe, recalculer les journées
    const recalculatedMatches: MatchData[] = [];
    
    matchesByTeam.forEach((teamMatches) => {
      // Trier par date
      const sortedMatches = [...teamMatches].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });

      // Groupement par date (matchs le même jour = même journée)
      const matchesByDate = new Map<string, MatchData[]>();
      sortedMatches.forEach((match) => {
        const dateKey = new Date(match.date).toDateString();
        if (!matchesByDate.has(dateKey)) {
          matchesByDate.set(dateKey, []);
        }
        matchesByDate.get(dateKey)!.push(match);
      });

      // Assigner le numéro de journée basé sur l'ordre des dates uniques
      const uniqueDates = Array.from(matchesByDate.keys()).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
      });

      uniqueDates.forEach((dateKey, index) => {
        const journee = index + 1;
        matchesByDate.get(dateKey)!.forEach((match) => {
          // Ne remplacer la journée que si elle vaut 1 (non extraite ou extraction échouée)
          // Sinon, on garde la journée extraite depuis le libellé
          if (match.journee === 1) {
            match.journee = journee;
          }
        });
      });

      recalculatedMatches.push(...sortedMatches);
    });

    return recalculatedMatches;
  }
}
