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
import {
  computeVictoiresDefaitesFromParties,
  playerNameMatches,
  type PartieLike,
} from "@/lib/shared/victoires-defaites";

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

/** Calcule victoires/défaites par index de composition à partir des parties (simples uniquement). */
function computeVictoiresDefaitesByIndex(
  composition: OpponentMatchComposition["composition"],
  parties: FFTTDetailsRencontre["parties"],
  opponentSide: "A" | "B"
): Map<number, { victoires: number; defaites: number }> {
  const partiesLike: PartieLike[] = parties.map((p) => ({
    joueurA: p.adversaireA ?? "",
    joueurB: p.adversaireB ?? "",
    scoreA: p.scoreA,
    scoreB: p.scoreB,
  }));
  const sideACountsAsOurs = opponentSide === "A";
  const getPlayerKey = (playerName: string): string | null => {
    const idx = composition.findIndex((j) =>
      playerNameMatches(playerName, j.nom, j.prenom)
    );
    return idx >= 0 ? String(idx) : null;
  };
  const map = computeVictoiresDefaitesFromParties(
    partiesLike,
    sideACountsAsOurs,
    getPlayerKey
  );
  const byIndex = new Map<number, { victoires: number; defaites: number }>();
  for (let i = 0; i < composition.length; i++) {
    byIndex.set(i, { victoires: 0, defaites: 0 });
  }
  map.forEach((vd, key) => {
    const idx = Number(key);
    if (Number.isInteger(idx) && idx >= 0 && idx < composition.length) {
      byIndex.set(idx, vd);
    }
  });
  return byIndex;
}

type FFTTApi = {
  getJoueurDetailsByLicence: (licence: string) => Promise<unknown>;
  getJoueursByNom: (nom: string, prenom?: string) => Promise<Array<{ licence: string; points?: number | null }>>;
};

type EnrichmentCacheEntry = { points: number | null; licence?: string };

/**
 * Enrichit les points manquants via getJoueurDetailsByLicence (contournement connu API FFTT).
 * Si la licence est absente, tente getJoueursByNom(nom, prenom) pour la récupérer, puis getJoueurDetailsByLicence.
 * pointsCache : cache licence|nom|prenom -> { points, licence? } pour éviter les appels FFTT en double
 * et pour que les joueurs identiques aient toujours la même licence (même clé dans le tableau).
 */
async function enrichCompositionPoints(
  api: FFTTApi,
  composition: OpponentMatchComposition["composition"],
  pointsCache?: Map<string, EnrichmentCacheEntry>
): Promise<OpponentMatchComposition["composition"]> {
  const cache = pointsCache ?? new Map<string, EnrichmentCacheEntry>();

  const setCache = (key: string, entry: EnrichmentCacheEntry) => {
    cache.set(key, entry);
    if (entry.licence && key !== entry.licence) {
      cache.set(entry.licence, entry);
    }
  };

  const enriched = await Promise.all(
    composition.map(async (j) => {
      let hasPoints =
        typeof j.points === "number" && Number.isFinite(j.points);
      let licence = j.licence?.trim() || undefined;
      const nom = (j.nom ?? "").trim();
      const prenom = (j.prenom ?? "").trim();
      const cacheKey = licence || `${nom}|${prenom}`;

      if (cacheKey && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!;
        const resolvedLicence = licence || cached.licence;
        return {
          ...j,
          ...(resolvedLicence ? { licence: resolvedLicence } : {}),
          points: hasPoints ? (j.points as number) : cached.points,
        };
      }

      // Fallback : si pas de points et pas de licence, chercher par nom
      if (!hasPoints && !licence && nom) {
        try {
          const byNom = await api.getJoueursByNom(nom, prenom || undefined);
          if (Array.isArray(byNom) && byNom.length > 0) {
            const first = byNom[0];
            if (first?.licence) {
              licence = String(first.licence).trim();
              const pts =
                typeof first.points === "number" && Number.isFinite(first.points)
                  ? first.points
                  : null;
              if (pts != null) {
                hasPoints = true;
                const entry: EnrichmentCacheEntry = { points: pts, licence };
                if (cacheKey) setCache(cacheKey, entry);
                return { ...j, licence, points: pts };
              }
            }
          }
        } catch {
          return j;
        }
      }

      const shouldCallApi = !hasPoints && Boolean(licence);
      if (!shouldCallApi) {
        const effectiveLicence = licence !== undefined ? licence : j.licence;
        return licence !== j.licence
          ? { ...j, points: j.points ?? null, ...(effectiveLicence !== undefined ? { licence: effectiveLicence } : {}) }
          : j;
      }

      try {
        const details = await api.getJoueurDetailsByLicence(licence!);
        const raw = details as Record<string, unknown> | null | undefined;
        const pointsValue =
          raw && typeof raw.points === "number" && Number.isFinite(raw.points)
            ? raw.points
            : raw && typeof raw.pointsLicence === "number" && Number.isFinite(raw.pointsLicence)
              ? raw.pointsLicence
              : null;
        const points = pointsValue ?? j.points ?? null;
        const entry: EnrichmentCacheEntry = { points, ...(licence !== undefined ? { licence } : {}) };
        if (cacheKey) setCache(cacheKey, entry);
        return { ...j, points, ...(licence !== undefined ? { licence } : {}) };
      } catch {
        if (cacheKey) setCache(cacheKey, { points: null });
        const { licence: _jLicence, ...rest } = j;
        const effectiveLicence = licence !== undefined ? licence : _jLicence;
        return { ...rest, points: rest.points ?? null, ...(effectiveLicence !== undefined ? { licence: effectiveLicence } : {}) };
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
    const toFetch = opponentMatches.slice(0, 10);
    const pointsCache = new Map<string, EnrichmentCacheEntry>();

    const detailsResults = await Promise.all(
      toFetch.map(async (rencontre) => {
        const club1 = extractClubFromLien(rencontre.lien, "clubnum_1");
        const club2 = extractClubFromLien(rencontre.lien, "clubnum_2");
        let raw: unknown = null;
        try {
          raw = await api.getDetailsRencontreByLien(
            rencontre.lien,
            club1,
            club2
          );
        } catch {
          // Ignorer les erreurs de détail (match sans détail)
        }
        return { rencontre, raw };
      })
    );

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

    for (const { rencontre, raw } of detailsResults) {
      let details: FFTTDetailsRencontre | null = null;
      if (raw && typeof raw === "object") {
        const d = raw as Record<string, unknown>;
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

        composition = await enrichCompositionPoints(api, composition, pointsCache);

        if (
          details.parties.length > 0 &&
          (sidePicked === "A" || sidePicked === "B")
        ) {
          const vd = computeVictoiresDefaitesByIndex(
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

    return NextResponse.json({ matches: results });
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
