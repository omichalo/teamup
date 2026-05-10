import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import type { MatchData } from "./team-matches-sync-types";

type SyncPlayer = NonNullable<MatchData["joueursSQY"]>[number];
type ResultPlayer = { nom: string; prenom: string; points?: number };

function normalizeName(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

function playerNameKey(player: { nom?: string; prenom?: string }): string {
  return `${normalizeName(player.prenom)}|${normalizeName(player.nom)}`;
}

function buildPlayersFromResults(match: MatchData): ResultPlayer[] {
  const details = match.resultatsIndividuels;
  if (!details) return [];

  const joueursA = Object.values(details.joueursA ?? {});
  const joueursB = Object.values(details.joueursB ?? {});
  if (joueursA.length === 0 && joueursB.length === 0) return [];

  const nomEquipeA = normalizeName(details.nomEquipeA);
  const nomEquipeB = normalizeName(details.nomEquipeB);

  if (nomEquipeA.includes("SQY PING") && !nomEquipeB.includes("SQY PING")) {
    return joueursA;
  }
  if (nomEquipeB.includes("SQY PING") && !nomEquipeA.includes("SQY PING")) {
    return joueursB;
  }

  // Fallback défensif si les noms équipes sont absents/incohérents.
  return joueursA.length >= joueursB.length ? joueursA : joueursB;
}

function reconcileJoueursSQY(match: MatchData): SyncPlayer[] {
  const existingPlayers = (match.joueursSQY ?? []) as SyncPlayer[];
  const resultPlayers = buildPlayersFromResults(match);
  if (resultPlayers.length === 0) {
    return existingPlayers;
  }

  const existingByName = new Map<string, SyncPlayer>();
  existingPlayers.forEach((player, index) => {
    const key = playerNameKey(player);
    if (!existingByName.has(key)) {
      existingByName.set(key, {
        ...player,
        id: player.id || `${key || "unknown"}_${index + 1}`,
      });
    }
  });

  return resultPlayers.map((player, index) => {
    const key = playerNameKey(player);
    const existing = existingByName.get(key);
    return {
      id: existing?.id || `${key || "unknown"}_${index + 1}`,
      nom: player.nom || existing?.nom || "",
      prenom: player.prenom || existing?.prenom || "",
      licence: existing?.licence || "",
      points: typeof existing?.points === "number" ? existing.points : (player.points ?? 0),
      sexe: existing?.sexe || "M",
    };
  });
}

export async function saveMatchesToTeamSubcollections(
  matches: MatchData[],
  db: Firestore
): Promise<{ saved: number; errors: number }> {
  let saved = 0;
  const errors = 0;

  try {
    console.log(
      `💾 Sauvegarde de ${matches.length} matchs dans les sous-collections...`
    );

    const matchesByTeam = new Map<string, MatchData[]>();
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
        console.warn(`⚠️ Match sans teamId: ${match.id} (teamId="${teamId}")`);
        matchesWithoutTeamId++;
      }
    });

    console.log(
      `📊 Matchs avec teamId: ${matchesWithTeamId}, sans teamId: ${matchesWithoutTeamId}`
    );

    console.log(`📊 ${matchesByTeam.size} équipes avec des matchs`);
    console.log(`📊 Équipes: ${Array.from(matchesByTeam.keys()).join(", ")}`);

    const totalMatchesToSave = Array.from(matchesByTeam.values()).reduce(
      (sum, teamMatches) => sum + teamMatches.length,
      0
    );
    console.log(
      `📊 Total de matchs à sauvegarder: ${totalMatchesToSave} (sur ${matches.length} matchs reçus)`
    );

    if (db && matchesByTeam.size > 0) {
      const teamIds = Array.from(matchesByTeam.keys());
      const teamRefs = teamIds.map((teamId) => db.collection("teams").doc(teamId));
      const teamDocs = await db.getAll(...teamRefs);
      const existingTeamIds = teamDocs.filter((doc) => doc.exists).map((doc) => doc.id);
      const missingTeamIds = teamIds.filter((id) => !existingTeamIds.includes(id));

      if (missingTeamIds.length > 0) {
        console.warn(
          `⚠️ ${
            missingTeamIds.length
          } équipes référencées dans les matchs n'existent pas dans Firestore (exécuter d'abord la sync équipes) : ${missingTeamIds.join(
            ", "
          )}`
        );
      } else {
        console.log(`✅ Toutes les équipes référencées existent dans Firestore`);
      }
    }

    const batchSize = 500;
    const batchPromises: Array<Promise<void>> = [];

    for (const [teamId, teamMatches] of matchesByTeam) {
      if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
        console.warn(
          `⚠️ Équipe ignorée (teamId vide): ${teamMatches.length} matchs non sauvegardés`
        );
        continue;
      }
      const safeTeamId = teamId.trim();

      console.log(
        `💾 Préparation de ${teamMatches.length} matchs pour ${safeTeamId}...`
      );

      for (let i = 0; i < teamMatches.length; i += batchSize) {
        const batch = db.batch();
        const batchEnd = Math.min(i + batchSize, teamMatches.length);
        const matchesInThisBatch = batchEnd - i;

        for (let j = i; j < batchEnd; j++) {
          const match = teamMatches[j];
          const matchId = typeof match.id === "string" ? match.id.trim() : "";
          if (!matchId) {
            console.warn(
              `⚠️ Match ignoré (id vide): teamId=${safeTeamId}, lien=${match.lienDetails || match.ffttId}`
            );
            continue;
          }
          const docRef = db
            .collection("teams")
            .doc(safeTeamId)
            .collection("matches")
            .doc(matchId);

          const reconciledJoueursSQY = reconcileJoueursSQY(match);

          const matchData = {
            ...match,
            date: Timestamp.fromDate(match.date),
            createdAt: Timestamp.fromDate(match.createdAt),
            updatedAt: Timestamp.fromDate(match.updatedAt),
          };

          Object.keys(matchData).forEach((key) => {
            if ((matchData as Record<string, unknown>)[key] === undefined) {
              delete (matchData as Record<string, unknown>)[key];
            }
          });

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

          const serializableMatchData = {
            ...matchData,
            joueursSQY:
              reconciledJoueursSQY.map((joueur) =>
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

          const updateDataRaw = {
            ...serializableMatchData,
            joueursSQY: serializableMatchData.joueursSQY || [],
            joueursAdversaires: serializableMatchData.joueursAdversaires || [],
            score: serializableMatchData.score || null,
            resultatsIndividuels: serializableMatchData.resultatsIndividuels || null,
          };

          const removeUndefined = (
            obj: Record<string, unknown>
          ): Record<string, unknown> => {
            const cleaned: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(obj)) {
              if (value === undefined) {
                continue;
              }
              if (value === null) {
                cleaned[key] = null;
              } else if (Array.isArray(value)) {
                cleaned[key] = value.map((item) =>
                  typeof item === "object" && item !== null
                    ? removeUndefined(item as Record<string, unknown>)
                    : item
                );
              } else if (typeof value === "object" && value !== null) {
                cleaned[key] = removeUndefined(value as Record<string, unknown>);
              } else {
                cleaned[key] = value;
              }
            }
            return cleaned;
          };

          const updateData = removeUndefined(updateDataRaw as Record<string, unknown>);

          const traceSync =
            process.env.NODE_ENV === "development" ||
            process.env.DEBUG_SYNC_TEAM_MATCHES === "true";

          const collectFirestoreDiagnostics = (
            obj: unknown,
            path = "updateData"
          ): string[] => {
            const issues: string[] = [];
            if (obj === null || obj === undefined) return issues;
            if (typeof obj === "string") {
              if (obj === "" || obj.trim() === "") issues.push(`${path} = chaîne vide`);
              return issues;
            }
            if (Array.isArray(obj)) {
              obj.forEach((item, index) => {
                if (item === "" || (typeof item === "string" && item.trim() === "")) {
                  issues.push(`${path}[${index}] = chaîne vide`);
                } else if (
                  typeof item === "object" &&
                  item !== null &&
                  !(item instanceof Timestamp)
                ) {
                  issues.push(...collectFirestoreDiagnostics(item, `${path}[${index}]`));
                }
              });
              return issues;
            }
            if (typeof obj === "object" && !(obj instanceof Timestamp)) {
              for (const [key, value] of Object.entries(obj)) {
                if (key === "" || (typeof key === "string" && key.trim() === "")) {
                  issues.push(`${path} a une clé vide`);
                }
                issues.push(
                  ...collectFirestoreDiagnostics(value, `${path}.${key || "\"\""}`)
                );
              }
            }
            return issues;
          };

          const pathStr = docRef.path;
          const pathSegments = pathStr.split("/");
          const hasEmptySegment = pathSegments.some((s) => s === "" || s.trim() === "");
          if (traceSync) {
            console.log(
              `[sync-trace] path=${pathStr} segments=${pathSegments.length} hasEmptySegment=${hasEmptySegment}`
            );
          }
          const diagnostics = collectFirestoreDiagnostics(updateData);
          if (diagnostics.length > 0) {
            console.warn(
              `[sync-trace] Données problématiques pour matchId=${matchId} teamId=${safeTeamId}:`,
              diagnostics
            );
          }
          if (hasEmptySegment) {
            console.warn(
              `[sync-trace] Chemin avec segment vide: path=${pathStr} teamId=${safeTeamId} matchId=${matchId}`
            );
          }

          const sanitizeForFirestore = (
            obj: Record<string, unknown>
          ): Record<string, unknown> => {
            const out: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(obj)) {
              if (key === "" || (typeof key === "string" && key.trim() === "")) {
                continue;
              }
              if (Array.isArray(value)) {
                out[key] = value.map((item) =>
                  item === "" || (typeof item === "string" && item.trim() === "")
                    ? null
                    : typeof item === "object" && item !== null && !Array.isArray(item)
                      ? sanitizeForFirestore(item as Record<string, unknown>)
                      : item
                );
              } else if (
                typeof value === "object" &&
                value !== null &&
                !(value instanceof Timestamp)
              ) {
                out[key] = sanitizeForFirestore(value as Record<string, unknown>);
              } else {
                out[key] = value;
              }
            }
            return out;
          };

          const sanitizedData = sanitizeForFirestore(updateData as Record<string, unknown>);

          batch.set(docRef, sanitizedData, { merge: true });
          saved++;
        }

        console.log(
          `  📝 Batch préparé: ${matchesInThisBatch} matchs ajoutés au batch (saved=${saved})`
        );

        const currentTeamId = safeTeamId;
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
              console.error(
                `[sync-trace] Batch en échec: teamId=${currentTeamId} nbMatchs=${currentBatchSize}. Vérifier les traces [sync-trace] ci-dessus pour les chemins et données problématiques.`
              );
              throw error;
            })
        );
      }
    }

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
