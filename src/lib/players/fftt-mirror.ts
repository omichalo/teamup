import type { Firestore } from "firebase-admin/firestore";

export const PLAYERS_COLLECTION = "players";
const GETALL_CHUNK = 100;

export type PlayerFfttMirror = {
  licence: string;
  listedInClub: boolean;
  isTemporary: boolean;
  nom?: string;
  prenom?: string;
  isHomme?: boolean;
  numClub?: string;
  nomClub?: string;
  categorie?: string;
  typeLicence: string | null;
  certificat?: string;
  nationalite?: string;
  pointsLicence?: number | null;
  updatedAtIso?: string | null;
};

export type RosterPlayerMirror = {
  listedInClub: boolean;
  typeLicence: string | null;
  nomClub: string | null;
};

export function isUsablePlayerFfttMirror(
  mirror: PlayerFfttMirror | null | undefined
): mirror is PlayerFfttMirror {
  return Boolean(mirror && !mirror.isTemporary);
}

function trimString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function timestampToIso(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

export function playerDocDataToFfttMirror(
  licence: string,
  data: Record<string, unknown>
): PlayerFfttMirror {
  const fromDoc = trimString(data.licence)?.replace(/\D/g, "");
  const normalizedLicence = fromDoc || licence.replace(/\D/g, "");
  const sexe = trimString(data.sexe)?.toUpperCase();
  const isHomme =
    typeof data.isHomme === "boolean"
      ? data.isHomme
      : sexe === "M"
        ? true
        : sexe === "F"
          ? false
          : undefined;
  const nomClub = trimString(data.nomClub) ?? trimString(data.club);
  const pointsLicence =
    finiteNumber(data.pointsLicence) ?? finiteNumber(data.points);
  const typeLicence = trimString(data.typeLicence) ?? null;

  const nom = trimString(data.nom);
  const prenom = trimString(data.prenom);
  const numClub = trimString(data.numClub);
  const categorie = trimString(data.categorie);
  const certificat = trimString(data.certificat);
  const nationalite = trimString(data.nationalite);

  return {
    licence: normalizedLicence,
    listedInClub: data.listedInClub === true,
    isTemporary: data.isTemporary === true,
    typeLicence,
    updatedAtIso: timestampToIso(data.updatedAt),
    ...(nom ? { nom } : {}),
    ...(prenom ? { prenom } : {}),
    ...(typeof isHomme === "boolean" ? { isHomme } : {}),
    ...(numClub ? { numClub } : {}),
    ...(nomClub ? { nomClub } : {}),
    ...(categorie ? { categorie } : {}),
    ...(certificat ? { certificat } : {}),
    ...(nationalite ? { nationalite } : {}),
    ...(pointsLicence !== undefined ? { pointsLicence } : {}),
  };
}

export function toRosterPlayerMirror(
  mirror: PlayerFfttMirror | null
): RosterPlayerMirror {
  if (!isUsablePlayerFfttMirror(mirror)) {
    return { listedInClub: false, typeLicence: null, nomClub: null };
  }
  return {
    listedInClub: mirror.listedInClub,
    typeLicence: mirror.typeLicence,
    nomClub: mirror.nomClub ?? null,
  };
}

export async function getPlayerFfttMirror(
  db: Firestore,
  licence: string | null | undefined
): Promise<PlayerFfttMirror | null> {
  const id = (licence ?? "").replace(/\D/g, "");
  if (!id) {
    return null;
  }
  const snap = await db.collection(PLAYERS_COLLECTION).doc(id).get();
  if (!snap.exists) {
    return null;
  }
  return playerDocDataToFfttMirror(id, snap.data() ?? {});
}

export async function loadRosterPlayerMirror(
  db: Firestore,
  licence: string | null | undefined
): Promise<RosterPlayerMirror | null> {
  const id = (licence ?? "").replace(/\D/g, "");
  if (!id) {
    return null;
  }
  return toRosterPlayerMirror(await getPlayerFfttMirror(db, id));
}

export async function getPlayerFfttMirrorsByLicence(
  db: Firestore,
  licences: string[]
): Promise<Map<string, PlayerFfttMirror | null>> {
  const unique = [
    ...new Set(
      licences.map((licence) => licence.replace(/\D/g, "")).filter(Boolean)
    ),
  ];
  const result = new Map<string, PlayerFfttMirror | null>();
  if (unique.length === 0) {
    return result;
  }

  for (let i = 0; i < unique.length; i += GETALL_CHUNK) {
    const chunk = unique.slice(i, i + GETALL_CHUNK);
    const snaps = await db.getAll(
      ...chunk.map((licence) => db.collection(PLAYERS_COLLECTION).doc(licence))
    );
    chunk.forEach((licence, index) => {
      const snap = snaps[index];
      if (!snap?.exists) {
        result.set(licence, null);
        return;
      }
      result.set(licence, playerDocDataToFfttMirror(licence, snap.data() ?? {}));
    });
  }

  return result;
}
