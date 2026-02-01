import { FFTTAPI } from "@omichalo/ffttapi-node";
import { getFFTTConfig } from "./fftt-utils";
import {
  FFTTEquipe,
  FFTTRencontre,
  FFTTDetailsRencontre,
  FFTTJoueur,
} from "./fftt-types";
import { createBaseMatch, isFemaleTeam } from "./fftt-utils";
import type { Firestore, DocumentReference } from "firebase-admin/firestore";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

// Type pour les joueurs dans les recherches
interface PlayerSearch {
  id?: string; // Optionnel car pas toujours disponible
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
  idEpreuve?: number; // ID de l'épreuve FFTT (15954, 15955, 15980, etc.)
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
      console.log(
        `🔄 Synchronisation des matchs pour l&apos;équipe ${teamId}...`
      );
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

      const matchesWithJournees =
        this.recalculateJourneesByDate(processedMatches);

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
        this.recalculateJourneesByDate(allMatches);

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
          allMatches.map((match) =>
            this.enrichSQYPlayersFromClub(match, db, playersCache)
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
   * Extrait l&apos;ID du club depuis le lien de rencontre
   */
  private extractClubIdFromLien(lien: string, param: string): string | null {
    const regex = new RegExp(`${param}=([^&]+)`);
    const match = lien.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Enrichit les données des joueurs SQY quand les licences sont vides
   * @param match - Le match à enrichir
   * @param db - Instance Firestore (optionnel si playersCache est fourni)
   * @param playersCache - Cache optionnel des joueurs pour éviter les reads répétés
   */
  async enrichSQYPlayersFromClub(
    match: MatchData,
    db?: Firestore,
    playersCache?: Array<{ id: string; [key: string]: unknown }>
  ): Promise<MatchData> {
    // Si pas de joueurs SQY, pas besoin d&apos;enrichir
    if (!match.joueursSQY || match.joueursSQY.length === 0) {
      return match;
    }

    try {
      // Utiliser le cache si fourni, sinon charger depuis Firestore
      let allPlayers: Array<{ id: string; [key: string]: unknown }>;

      if (playersCache) {
        allPlayers = playersCache;
      } else if (db) {
        // Récupérer tous les joueurs du club SQY PING (fallback si pas de cache)
        const playersSnapshot = await db.collection("players").get();
        allPlayers = playersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } else {
        // Pas de cache ni de db, retourner le match tel quel
        return match;
      }

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
            matches.map((match) => this.enrichSQYPlayersFromClub(match, db))
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
    let saved = 0;
    const errors = 0;

    try {
      console.log(
        `💾 Sauvegarde de ${matches.length} matchs dans les sous-collections...`
      );

      // Grouper les matchs par équipe
      const matchesByTeam = new Map<string, MatchData[]>();

      // Grouper les matchs par équipe (utiliser le champ teamId du match)
      let matchesWithTeamId = 0;
      let matchesWithoutTeamId = 0;

      matches.forEach((match) => {
        const teamId = match.teamId;

        if (teamId && teamId.trim() !== "") {
          if (!matchesByTeam.has(teamId)) {
            matchesByTeam.set(teamId, []);
          }
          matchesByTeam.get(teamId)!.push(match);
          matchesWithTeamId++;
        } else {
          console.warn(
            `⚠️ Match sans teamId: ${match.id} (teamId="${teamId}")`
          );
          matchesWithoutTeamId++;
        }
      });

      console.log(
        `📊 Matchs avec teamId: ${matchesWithTeamId}, sans teamId: ${matchesWithoutTeamId}`
      );

      console.log(`📊 ${matchesByTeam.size} équipes avec des matchs`);
      console.log(`📊 Équipes: ${Array.from(matchesByTeam.keys()).join(", ")}`);

      // Calculer le total de matchs à sauvegarder
      const totalMatchesToSave = Array.from(matchesByTeam.values()).reduce(
        (sum, teamMatches) => sum + teamMatches.length,
        0
      );
      console.log(
        `📊 Total de matchs à sauvegarder: ${totalMatchesToSave} (sur ${matches.length} matchs reçus)`
      );

      // Vérifier que les teamId existent dans Firestore
      if (db && matchesByTeam.size > 0) {
        const teamIds = Array.from(matchesByTeam.keys());
        const teamRefs = teamIds.map((teamId) =>
          db.collection("teams").doc(teamId)
        );
        const teamDocs = await db.getAll(...teamRefs);
        const existingTeamIds = teamDocs
          .filter((doc) => doc.exists)
          .map((doc) => doc.id);
        const missingTeamIds = teamIds.filter(
          (id) => !existingTeamIds.includes(id)
        );

        if (missingTeamIds.length > 0) {
          console.warn(
            `⚠️ ${
              missingTeamIds.length
            } équipes référencées dans les matchs n'existent pas dans Firestore: ${missingTeamIds.join(
              ", "
            )}`
          );
        } else {
          console.log(
            `✅ Toutes les équipes référencées existent dans Firestore`
          );
        }
      }

      // OPTIMISATION : Paralléliser les commits de batch pour différentes équipes
      // Sauvegarder par batch
      const batchSize = 500;

      // Préparer tous les batches pour toutes les équipes
      const batchPromises: Array<Promise<void>> = [];

      for (const [teamId, teamMatches] of matchesByTeam) {
        console.log(
          `💾 Préparation de ${teamMatches.length} matchs pour ${teamId}...`
        );

        for (let i = 0; i < teamMatches.length; i += batchSize) {
          const batch = db.batch();
          const batchEnd = Math.min(i + batchSize, teamMatches.length);
          const matchesInThisBatch = batchEnd - i;

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

            // Fonction helper pour nettoyer un objet joueur (supprimer les propriétés undefined)
            const cleanPlayer = (joueur: {
              licence?: string | undefined;
              nom?: string | undefined;
              prenom?: string | undefined;
              points?: number | undefined;
              sexe?: string | undefined;
            }): Record<string, unknown> => {
              const cleaned: Record<string, unknown> = {};
              if (joueur.licence !== undefined && joueur.licence !== null) {
                cleaned.licence = joueur.licence;
              }
              if (joueur.nom !== undefined && joueur.nom !== null) {
                cleaned.nom = joueur.nom;
              }
              if (joueur.prenom !== undefined && joueur.prenom !== null) {
                cleaned.prenom = joueur.prenom;
              }
              if (joueur.points !== undefined && joueur.points !== null) {
                cleaned.points = joueur.points;
              }
              if (joueur.sexe !== undefined && joueur.sexe !== null) {
                cleaned.sexe = joueur.sexe;
              }
              return cleaned;
            };

            // Convertir les objets JoueurRencontre en objets simples pour Firestore
            const serializableMatchData = {
              ...matchData,
              joueursSQY:
                matchData.joueursSQY?.map((joueur) =>
                  cleanPlayer({
                    licence: joueur.licence,
                    nom: (joueur as { nom?: string }).nom,
                    prenom: (joueur as { prenom?: string }).prenom,
                    points: joueur.points,
                    sexe: joueur.sexe,
                  })
                ) || [],
              joueursAdversaires:
                matchData.joueursAdversaires?.map((joueur) =>
                  cleanPlayer({
                    licence: joueur.licence,
                    nom: (joueur as { nom?: string }).nom,
                    prenom: (joueur as { prenom?: string }).prenom,
                    points: joueur.points,
                    sexe: joueur.sexe,
                  })
                ) || [],
            };

            // Forcer la mise à jour des champs importants même s'ils étaient vides avant
            const updateDataRaw = {
              ...serializableMatchData,
              // Toujours mettre à jour ces champs même s'ils étaient vides
              joueursSQY: serializableMatchData.joueursSQY || [],
              joueursAdversaires:
                serializableMatchData.joueursAdversaires || [],
              score: serializableMatchData.score || null,
              resultatsIndividuels:
                serializableMatchData.resultatsIndividuels || null,
            };

            // Fonction récursive pour supprimer toutes les propriétés undefined
            const removeUndefined = (
              obj: Record<string, unknown>
            ): Record<string, unknown> => {
              const cleaned: Record<string, unknown> = {};
              for (const [key, value] of Object.entries(obj)) {
                if (value === undefined) {
                  continue; // Ignorer les valeurs undefined
                }
                if (value === null) {
                  cleaned[key] = null; // Garder null
                } else if (Array.isArray(value)) {
                  // Nettoyer les tableaux
                  cleaned[key] = value.map((item) =>
                    typeof item === "object" && item !== null
                      ? removeUndefined(item as Record<string, unknown>)
                      : item
                  );
                } else if (typeof value === "object" && value !== null) {
                  // Nettoyer les objets imbriqués
                  cleaned[key] = removeUndefined(
                    value as Record<string, unknown>
                  );
                } else {
                  cleaned[key] = value;
                }
              }
              return cleaned;
            };

            const updateData = removeUndefined(
              updateDataRaw as Record<string, unknown>
            );

            batch.set(docRef, updateData, { merge: true });
            saved++;
          }

          console.log(
            `  📝 Batch préparé: ${matchesInThisBatch} matchs ajoutés au batch (saved=${saved})`
          );

          // Ajouter la promesse de commit au tableau pour parallélisation
          // Capturer les valeurs dans une closure pour éviter les problèmes de référence
          const currentTeamId = teamId;
          const currentBatchSize = batchEnd - i;

          batchPromises.push(
            batch
              .commit()
              .then(() => {
                console.log(
                  `✅ Batch sauvegardé pour ${currentTeamId} (${currentBatchSize} matchs)`
                );
              })
              .catch((error) => {
                console.error(
                  `❌ Erreur lors du commit du batch pour ${currentTeamId}:`,
                  error
                );
                throw error;
              })
          );
        }
      }

      // Attendre que tous les batches soient committés en parallèle
      await Promise.all(batchPromises);

      console.log(
        `✅ Synchronisation terminée: ${saved} matchs sauvegardés sur ${matches.length} matchs reçus`
      );
      if (saved !== matches.length) {
        console.warn(
          `⚠️ Attention: ${
            matches.length - saved
          } matchs n'ont pas été sauvegardés (probablement sans teamId)`
        );
      }
      return { saved, errors };
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      return { saved, errors: matches.length - saved };
    }
  }

  /**
   * Assigne le numéro de journée d'après la position du match (1er, 2e, 3e...)
   * dans l'ordre chronologique, par équipe ET par phase.
   * Grouper par (teamId, phase) évite de mélanger Phase 1 (aller) et Phase 2 (retour)
   * pour une même équipe (ex. team_1 fallback ou équipes partageant un identifiant).
   */
  private recalculateJourneesByDate(matches: MatchData[]): MatchData[] {
    const matchesByTeamAndPhase = new Map<string, MatchData[]>();

    matches.forEach((match) => {
      const teamId =
        match.teamId?.trim() ||
        `team_${match.teamNumber}_${match.isFemale ? "F" : "M"}`;
      const phase = (match.phase || "aller").toLowerCase();
      const teamPhaseKey = `${teamId}|${phase}`;
      if (!matchesByTeamAndPhase.has(teamPhaseKey)) {
        matchesByTeamAndPhase.set(teamPhaseKey, []);
      }
      matchesByTeamAndPhase.get(teamPhaseKey)!.push(match);
    });

    const recalculatedMatches: MatchData[] = [];

    matchesByTeamAndPhase.forEach((teamMatches) => {
      const sortedMatches = [...teamMatches].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });

      sortedMatches.forEach((match, index) => {
        match.journee = index + 1;
      });

      recalculatedMatches.push(...sortedMatches);
    });

    return recalculatedMatches;
  }
}
