import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import {
  getFFTTConfig,
  createFFTTAPI,
  determinePhaseFromDivision,
} from "@/lib/shared/fftt-utils";
import type { FFTTRencontre, FFTTDetailsRencontre, FFTTJoueur } from "@/lib/shared/fftt-types";

export const runtime = "nodejs";

/** Normalise un nom d'équipe pour la comparaison (majuscules, trim, espaces réduits). */
function normalizeTeamName(name: string): string {
  return (name || "").trim().replace(/\s+/g, " ").toUpperCase();
}

/** Indique si le nom d'équipe correspond exactement à l'adversaire (même équipe, pas une autre du même club). */
function teamNameEqualsOpponent(
  equipeName: string,
  opponentName: string
): boolean {
  if (!opponentName || !opponentName.trim()) return false;
  return normalizeTeamName(equipeName) === normalizeTeamName(opponentName);
}

function extractClubFromLien(lien: string, param: string): string {
  const regex = new RegExp(`${param}=([^&]+)`);
  const m = lien.match(regex);
  return m ? m[1] : "";
}

/** Normalise un nom pour la comparaison (trim, majuscules, espaces simples). */
function normalizePlayerName(s: string): string {
  return (s || "").trim().replace(/\s+/g, " ").toUpperCase();
}

/** Retourne true si la chaîne adversaire (API) correspond au joueur (nom, prenom). */
function adversaireMatchesPlayer(
  adversaire: string,
  nom: string,
  prenom: string
): boolean {
  const a = normalizePlayerName(adversaire);
  if (!a) return false;
  const prenomNorm = (prenom ?? "").trim().toUpperCase();
  const nomNorm = (nom ?? "").trim().toUpperCase();
  const full1 = `${prenomNorm} ${nomNorm}`.trim();
  const full2 = `${nomNorm} ${prenomNorm}`.trim();
  return a === full1 || a === full2 || a === nomNorm || a === prenomNorm;
}

/** Calcule victoires/défaites par joueur à partir des parties et du côté adverse (A ou B). */
function computeVictoiresDefaites(
  composition: OpponentMatchComposition["composition"],
  parties: FFTTDetailsRencontre["parties"],
  opponentSide: "A" | "B"
): Map<number, { victoires: number; defaites: number }> {
  const byIndex = new Map<number, { victoires: number; defaites: number }>();
  for (let i = 0; i < composition.length; i++) {
    byIndex.set(i, { victoires: 0, defaites: 0 });
  }
  for (const p of parties) {
    const opponentName = opponentSide === "A" ? p.adversaireA : p.adversaireB;
    const scoreOpp = opponentSide === "A" ? p.scoreA : p.scoreB;
    const scoreOther = opponentSide === "A" ? p.scoreB : p.scoreA;
    const win = scoreOpp > scoreOther;
    const idx = composition.findIndex((j) =>
      adversaireMatchesPlayer(opponentName, j.nom, j.prenom)
    );
    if (idx >= 0) {
      const cur = byIndex.get(idx)!;
      if (win) cur.victoires += 1;
      else cur.defaites += 1;
      byIndex.set(idx, cur);
    }
  }
  return byIndex;
}

type FFTTApi = {
  getJoueurDetailsByLicence: (licence: string) => Promise<unknown>;
  getJoueursByNom: (nom: string, prenom?: string) => Promise<Array<{ licence: string; points?: number | null }>>;
};

/** Entrée de diagnostic pour un joueur lors de l'enrichissement. */
export interface OpponentCompositionsEnrichmentDebug {
  nom: string;
  prenom: string;
  licence: string | null | undefined;
  hadPointsBefore: boolean;
  calledApi: boolean;
  /** Clés de l'objet retourné par getJoueurDetailsByLicence (pour vérifier la structure). */
  apiResponseKeys?: string[];
  pointsAfter: number | null;
  error?: string;
  /** Recherche par nom effectuée (getJoueursByNom) car licence manquante. */
  searchByName?: boolean;
  /** Nombre de joueurs retournés par getJoueursByNom. */
  searchByNameResultCount?: number;
  /** Licence trouvée via getJoueursByNom (avant appel getJoueurDetailsByLicence). */
  licenceFromSearch?: string;
}

/** Entrée de diagnostic pour un match (identification de l'équipe adverse + joueurs bruts). */
export interface OpponentCompositionsMatchDebug {
  date: string;
  otherTeamName: string;
  detailsNomEquipeA: string;
  detailsNomEquipeB: string;
  opponentName: string;
  /** Côté retenu pour l'adversaire : A, B ou fallback. */
  sidePicked: "A" | "B" | "fallback";
  /** Joueurs tels que retournés par getDetailsRencontreByLien (avant enrichissement). */
  joueursFromDetails: Array<{ nom: string; prenom: string; licence: string | undefined; points: number | null | undefined }>;
  enrichment: OpponentCompositionsEnrichmentDebug[];
}

/**
 * Enrichit les points manquants via getJoueurDetailsByLicence (contournement connu API FFTT).
 * Si la licence est absente, tente getJoueursByNom(nom, prenom) pour la récupérer, puis getJoueurDetailsByLicence.
 * Si debugCollector est fourni, y pousse une entrée par joueur pour analyser le souci.
 */
async function enrichCompositionPoints(
  api: FFTTApi,
  composition: OpponentMatchComposition["composition"],
  debugCollector?: OpponentCompositionsEnrichmentDebug[]
): Promise<OpponentMatchComposition["composition"]> {
  const enriched = await Promise.all(
    composition.map(async (j) => {
      let hasPoints =
        typeof j.points === "number" && Number.isFinite(j.points);
      let licence = j.licence?.trim() || undefined;
      const nom = (j.nom ?? "").trim();
      const prenom = (j.prenom ?? "").trim();

      const debugEntry: OpponentCompositionsEnrichmentDebug = {
        nom: j.nom ?? "",
        prenom: j.prenom ?? "",
        licence: licence ?? j.licence,
        hadPointsBefore: hasPoints,
        calledApi: false,
        pointsAfter: hasPoints ? (j.points as number) : null,
      };

      // Fallback : si pas de points et pas de licence, chercher par nom
      if (!hasPoints && !licence && nom) {
        try {
          const byNom = await api.getJoueursByNom(nom, prenom || undefined);
          debugEntry.searchByName = true;
          debugEntry.searchByNameResultCount = byNom?.length ?? 0;
          if (Array.isArray(byNom) && byNom.length > 0) {
            const first = byNom[0];
            if (first?.licence) {
              licence = String(first.licence).trim();
              debugEntry.licenceFromSearch = licence;
              debugEntry.licence = licence;
              const pts =
                typeof first.points === "number" && Number.isFinite(first.points)
                  ? first.points
                  : null;
              if (pts != null) {
                hasPoints = true;
                debugEntry.pointsAfter = pts;
                debugCollector?.push(debugEntry);
                return { ...j, ...(licence ? { licence } : {}), points: pts };
              }
            }
          }
        } catch (err) {
          debugEntry.error = err instanceof Error ? err.message : String(err);
          debugCollector?.push(debugEntry);
          return j;
        }
      }

      const shouldCallApi = !hasPoints && Boolean(licence);
      debugEntry.calledApi = shouldCallApi;
      if (j.licence !== licence) debugEntry.licence = licence;

      if (!shouldCallApi) {
        debugCollector?.push(debugEntry);
        return licence !== j.licence
          ? { ...j, ...(licence ? { licence } : {}), points: j.points ?? null }
          : j;
      }

      try {
        const details = await api.getJoueurDetailsByLicence(licence!);
        const raw = details as Record<string, unknown> | null | undefined;
        if (debugCollector && raw && typeof raw === "object") {
          debugEntry.apiResponseKeys = Object.keys(raw);
        }
        const pointsValue =
          raw && typeof raw.points === "number" && Number.isFinite(raw.points)
            ? raw.points
            : raw && typeof raw.pointsLicence === "number" && Number.isFinite(raw.pointsLicence)
              ? raw.pointsLicence
              : null;
        const points = pointsValue ?? j.points ?? null;
        debugEntry.pointsAfter = points;
        debugCollector?.push(debugEntry);
        return { ...j, ...(licence ? { licence } : {}), points };
      } catch (err) {
        debugEntry.error = err instanceof Error ? err.message : String(err);
        debugEntry.pointsAfter = j.points ?? null;
        debugCollector?.push(debugEntry);
        return { ...j, ...(licence ? { licence } : {}) };
      }
    })
  );
  return enriched;
}

export interface OpponentMatchComposition {
  date: string;
  journee?: number;
  /** Nom de l'autre équipe (adversaire de l'adversaire dans ce match). */
  otherTeamName: string;
  /** Score du match (ex: "4-2"). */
  score?: string | undefined;
  /** Composition utilisée par l'équipe adverse dans ce match. */
  composition: Array<{
    nom: string;
    prenom: string;
    points?: number | null;
    licence?: string;
    /** Nombre de victoires dans ce match (parties individuelles). */
    victoires?: number;
    /** Nombre de défaites dans ce match (parties individuelles). */
    defaites?: number;
  }>;
}

/**
 * GET /api/fftt/opponent-compositions?teamId=xxx&phase=aller|retour&opponentName=xxx
 * Récupère les compositions de l'équipe adverse lors de ses précédents matchs (données FFTT, pas stockées).
 * Réservé aux coachs et admins.
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    const teamId = req.nextUrl.searchParams.get("teamId")?.trim();
    const phaseParam = req.nextUrl.searchParams.get("phase");
    const phase =
      phaseParam === "retour" || phaseParam === "aller" ? phaseParam : null;
    const opponentName = req.nextUrl.searchParams.get("opponentName")?.trim();
    const debugMode =
      req.nextUrl.searchParams.get("debug") === "1" ||
      req.nextUrl.searchParams.get("debug") === "true";

    if (!teamId || !phase || !opponentName) {
      return NextResponse.json(
        { error: "Paramètres teamId, phase et opponentName requis" },
        { status: 400 }
      );
    }

    const { clubCode } = getFFTTConfig();
    const api = createFFTTAPI();
    await api.initialize();

    const equipes = (await api.getEquipesByClub(clubCode)) as Array<{
      idEquipe: number;
      libelle: string;
      division: string;
      lienDivision: string;
      idEpreuve?: number;
      libelleEpreuve?: string;
      isFemale?: boolean;
    }>;

    const phaseFromId = teamId.endsWith("_aller")
      ? "aller"
      : teamId.endsWith("_retour")
        ? "retour"
        : null;
    const idEquipeStr = phaseFromId
      ? teamId.replace(/_(aller|retour)$/, "")
      : teamId;

    const ourEquipe = equipes.find((e) => {
      if (e.idEquipe.toString() !== idEquipeStr) return false;
      return determinePhaseFromDivision(e.division) === (phaseFromId ?? phase);
    });

    if (!ourEquipe?.lienDivision) {
      return NextResponse.json(
        { error: "Équipe ou division non trouvée" },
        { status: 404 }
      );
    }

    const rencontres = (await api.getRencontrePouleByLienDivision(
      ourEquipe.lienDivision
    )) as unknown[];

    const opponentMatches = rencontres.filter((r: unknown) => {
      const renc = r as FFTTRencontre;
      return (
        teamNameEqualsOpponent(renc.nomEquipeA, opponentName) ||
        teamNameEqualsOpponent(renc.nomEquipeB, opponentName)
      );
    }) as FFTTRencontre[];

    const results: OpponentMatchComposition[] = [];
    const matchDebugList: OpponentCompositionsMatchDebug[] = [];

    for (const rencontre of opponentMatches.slice(0, 10)) {
      const club1 = extractClubFromLien(rencontre.lien, "clubnum_1");
      const club2 = extractClubFromLien(rencontre.lien, "clubnum_2");
      let details: FFTTDetailsRencontre | null = null;
      try {
        const raw = await api.getDetailsRencontreByLien(
          rencontre.lien,
          club1,
          club2
        );
        if (raw && typeof raw === "object") {
          const d = raw as unknown as Record<string, unknown>;
          const toJoueurs = (arr: unknown): FFTTJoueur[] => {
            const mapOne = (x: Record<string, unknown>): FFTTJoueur => {
              const j: FFTTJoueur = {
                licence: String(x.licence ?? ""),
                nom: String(x.nom ?? ""),
                prenom: String(x.prenom ?? ""),
                points:
                  typeof x.points === "number"
                    ? x.points
                    : (x.points as number | null) ?? null,
              };
              if (x.sexe) j.sexe = String(x.sexe);
              return j;
            };
            if (Array.isArray(arr)) {
              return arr.map((j: unknown) => mapOne(j as Record<string, unknown>));
            }
            if (typeof arr === "object" && arr !== null) {
              return Object.values(arr).map((j: unknown) =>
                mapOne(j as Record<string, unknown>)
              );
            }
            return [];
          };
          details = {
            nomEquipeA: String(d.nomEquipeA ?? ""),
            nomEquipeB: String(d.nomEquipeB ?? ""),
            joueursA: toJoueurs(d.joueursA),
            joueursB: toJoueurs(d.joueursB),
            parties: Array.isArray(d.parties)
              ? (d.parties as Array<Record<string, unknown>>).map((p) => ({
                  adversaireA: String(p.adversaireA ?? ""),
                  adversaireB: String(p.adversaireB ?? ""),
                  scoreA: typeof p.scoreA === "number" ? p.scoreA : 0,
                  scoreB: typeof p.scoreB === "number" ? p.scoreB : 0,
                  setDetails: String(p.setDetails ?? ""),
                }))
              : [],
          };
        }
      } catch {
        // Ignorer les erreurs de détail (match sans détail)
      }

      // Déterminer la composition adverse à partir des DÉTAILS (nomEquipeA/B), pas de la rencontre,
      // car l'ordre A/B peut différer entre la liste des rencontres et la réponse getDetailsRencontreByLien.
      const matchOpponentA = teamNameEqualsOpponent(rencontre.nomEquipeA, opponentName);
      let otherTeamName = matchOpponentA ? rencontre.nomEquipeB : rencontre.nomEquipeA;
      let composition: OpponentMatchComposition["composition"] = [];
      if (details) {
        const opponentIsA = teamNameEqualsOpponent(details.nomEquipeA, opponentName);
        const opponentIsB = teamNameEqualsOpponent(details.nomEquipeB, opponentName);
        let sidePicked: "A" | "B" | "fallback" = "fallback";
        let rawJoueurs: Array<{ nom: string; prenom: string; licence: string | undefined; points: number | null | undefined }> = [];

        const toCompositionItem = (
          j: { nom: string; prenom: string; licence: string | undefined; points: number | null | undefined }
        ): { nom: string; prenom: string; points: number | null; licence?: string } => ({
          nom: j.nom,
          prenom: j.prenom,
          points: j.points ?? null,
          ...(j.licence != null && j.licence !== "" ? { licence: j.licence } : {}),
        });

        if (opponentIsA && !opponentIsB) {
          sidePicked = "A";
          rawJoueurs = details.joueursA.map((j) => ({
            nom: j.nom ?? "",
            prenom: j.prenom ?? "",
            licence: j.licence,
            points: j.points ?? null,
          }));
          composition = rawJoueurs.map(toCompositionItem);
          otherTeamName = details.nomEquipeB;
        } else if (opponentIsB && !opponentIsA) {
          sidePicked = "B";
          rawJoueurs = details.joueursB.map((j) => ({
            nom: j.nom ?? "",
            prenom: j.prenom ?? "",
            licence: j.licence,
            points: j.points ?? null,
          }));
          composition = rawJoueurs.map(toCompositionItem);
          otherTeamName = details.nomEquipeA;
        } else {
          const fallbackJoueurs = matchOpponentA ? details.joueursA : details.joueursB;
          rawJoueurs = fallbackJoueurs.map((j) => ({
            nom: j.nom ?? "",
            prenom: j.prenom ?? "",
            licence: j.licence,
            points: j.points ?? null,
          }));
          composition = rawJoueurs.map(toCompositionItem);
          otherTeamName = matchOpponentA ? details.nomEquipeB : details.nomEquipeA;
        }

        const enrichmentDebug: OpponentCompositionsEnrichmentDebug[] = [];
        composition = await enrichCompositionPoints(
          api,
          composition,
          debugMode ? enrichmentDebug : undefined
        );

        if (
          details.parties.length > 0 &&
          (sidePicked === "A" || sidePicked === "B")
        ) {
          const vd = computeVictoiresDefaites(
            composition,
            details.parties,
            sidePicked
          );
          composition = composition.map((j, idx) => {
            const stats = vd.get(idx);
            return {
              ...j,
              ...(stats
                ? {
                    victoires: stats.victoires,
                    defaites: stats.defaites,
                  }
                : {}),
            };
          });
        }

        if (debugMode) {
          const date =
            rencontre.dateReelle ?? rencontre.datePrevue ?? new Date();
          const dateStr =
            typeof date === "string"
              ? date
              : (date as Date).toISOString().slice(0, 10);
          matchDebugList.push({
            date: dateStr,
            otherTeamName,
            detailsNomEquipeA: details.nomEquipeA ?? "",
            detailsNomEquipeB: details.nomEquipeB ?? "",
            opponentName,
            sidePicked,
            joueursFromDetails: rawJoueurs,
            enrichment: enrichmentDebug,
          });
        }
      }

      const date =
        rencontre.dateReelle ?? rencontre.datePrevue ?? new Date();
      const dateStr =
        typeof date === "string"
          ? date
          : (date as Date).toISOString().slice(0, 10);
      const score =
        rencontre.scoreEquipeA != null && rencontre.scoreEquipeB != null
          ? `${rencontre.scoreEquipeA}-${rencontre.scoreEquipeB}`
          : undefined;

      results.push({
        date: dateStr,
        otherTeamName,
        ...(score !== undefined ? { score } : {}),
        composition,
      });
    }

    const body: { matches: OpponentMatchComposition[]; _debug?: unknown } = {
      matches: results,
    };
    if (debugMode) {
      body._debug = {
        opponentName,
        phase,
        teamId,
        matchCount: results.length,
        matches: matchDebugList,
      };
    }
    return NextResponse.json(body);
  } catch (error) {
    console.error(
      "Erreur API opponent-compositions:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Erreur lors de la récupération des compositions adverses" },
      { status: 500 }
    );
  }
}
