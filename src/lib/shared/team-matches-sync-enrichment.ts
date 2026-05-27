import type { Firestore } from "firebase-admin/firestore";
import type { MatchData, PlayerSearch } from "./team-matches-sync-types";
import { hasUsablePlayerName } from "./team-matches-roster-utils";

/**
 * Extrait l'ID du club depuis le lien de rencontre.
 */
export function extractClubIdFromLien(lien: string, param: string): string | null {
  const regex = new RegExp(`${param}=([^&]+)`);
  const match = lien.match(regex);
  return match ? match[1] : null;
}

/**
 * Enrichit les données des joueurs SQY quand les licences sont vides.
 */
export async function enrichSQYPlayersFromClub(
  match: MatchData,
  db?: Firestore,
  playersCache?: Array<{ id: string; [key: string]: unknown }>
): Promise<MatchData> {
  if (!match.joueursSQY || match.joueursSQY.length === 0) {
    return match;
  }

  try {
    let allPlayers: Array<{ id: string; [key: string]: unknown }>;

    if (playersCache) {
      allPlayers = playersCache;
    } else if (db) {
      const playersSnapshot = await db.collection("players").get();
      allPlayers = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } else {
      return match;
    }

    const enrichedJoueursSQY = match.joueursSQY.map((joueur) => {
      if (
        (!joueur.licence || joueur.licence.trim() === "") &&
        hasUsablePlayerName(joueur)
      ) {
        const normalizeName = (name: string) =>
          name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();

        const joueurNomNormalized = normalizeName(
          (joueur as { nom?: string }).nom || ""
        );
        const joueurPrenomNormalized = normalizeName(
          (joueur as { prenom?: string }).prenom || ""
        );

        let foundPlayer = allPlayers.find(
          (p) =>
            (p as PlayerSearch).nom &&
            (p as PlayerSearch).prenom &&
            (p as PlayerSearch).nom!.toLowerCase() ===
              (joueur as { nom?: string }).nom?.toLowerCase() &&
            (p as PlayerSearch).prenom!.toLowerCase() ===
              (joueur as { prenom?: string }).prenom?.toLowerCase()
        );

        if (!foundPlayer) {
          foundPlayer = allPlayers.find(
            (p) =>
              (p as PlayerSearch).nom &&
              (p as PlayerSearch).prenom &&
              normalizeName((p as PlayerSearch).nom!) === joueurNomNormalized &&
              normalizeName((p as PlayerSearch).prenom!) ===
                joueurPrenomNormalized
          );
        }

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
        }

        console.log(
          `⚠️  Joueur non trouvé par nom: ${(joueur as { prenom?: string }).prenom} ${
            (joueur as { nom?: string }).nom
          }`
        );
      }
      return joueur;
    });

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
    console.error("❌ Erreur lors de l'enrichissement des joueurs SQY:", error);
    return match;
  }
}
