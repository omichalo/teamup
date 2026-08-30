import type { FFTTLicenseLookupPlayer } from "@/lib/club-registration/license-lookup";
import { normalizeLastName } from "@/lib/shared/person-name-format";
import {
  isUsablePlayerFfttMirror,
  type PlayerFfttMirror,
} from "./fftt-mirror";

function trimString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function overlayString(
  mirrorValue: string | undefined,
  storedValue: string | undefined
): string | undefined {
  return trimString(mirrorValue) ?? trimString(storedValue);
}

export function storedLookupToPartial(
  stored: unknown
): Partial<FFTTLicenseLookupPlayer> {
  if (!stored || typeof stored !== "object") {
    return {};
  }
  const data = stored as Record<string, unknown>;
  const licence = trimString(data.licence)?.replace(/\D/g, "");
  const pointsLicence =
    typeof data.pointsLicence === "number" && Number.isFinite(data.pointsLicence)
      ? data.pointsLicence
      : data.pointsLicence === null
        ? null
        : undefined;

  const nom = trimString(data.nom);
  const prenom = trimString(data.prenom);
  const numClub = trimString(data.numClub);
  const nomClub = trimString(data.nomClub);
  const categorie = trimString(data.categorie);
  const typeLicence = trimString(data.typeLicence);
  const certificat = trimString(data.certificat);
  const nationalite = trimString(data.nationalite);

  return {
    ...(licence ? { licence } : {}),
    ...(nom ? { nom } : {}),
    ...(prenom ? { prenom } : {}),
    ...(typeof data.isHomme === "boolean" ? { isHomme: data.isHomme } : {}),
    ...(numClub ? { numClub } : {}),
    ...(nomClub ? { nomClub } : {}),
    ...(categorie ? { categorie } : {}),
    ...(data.typeLicence === null
      ? { typeLicence: null }
      : typeLicence
        ? { typeLicence }
        : {}),
    ...(certificat ? { certificat } : {}),
    ...(nationalite ? { nationalite } : {}),
    ...(pointsLicence !== undefined ? { pointsLicence } : {}),
  };
}

function assignOptionalString(
  target: FFTTLicenseLookupPlayer,
  key: "nom" | "prenom" | "numClub" | "nomClub" | "categorie" | "certificat" | "nationalite",
  value: string | undefined
): void {
  if (value) {
    target[key] = key === "nom" ? normalizeLastName(value) : value;
  }
}

export function mergeFfttLicenseLookupFromMirror(
  stored: unknown,
  mirror: PlayerFfttMirror | null
): FFTTLicenseLookupPlayer | undefined {
  const base = storedLookupToPartial(stored);
  if (!isUsablePlayerFfttMirror(mirror)) {
    return base.licence ? { ...base, licence: base.licence } : undefined;
  }

  const licence = mirror.licence || base.licence;
  if (!licence) {
    return undefined;
  }

  const merged: FFTTLicenseLookupPlayer = { licence };
  assignOptionalString(merged, "nom", overlayString(mirror.nom, base.nom));
  assignOptionalString(merged, "prenom", overlayString(mirror.prenom, base.prenom));
  assignOptionalString(
    merged,
    "numClub",
    overlayString(mirror.numClub, base.numClub)
  );
  assignOptionalString(
    merged,
    "nomClub",
    overlayString(mirror.nomClub, base.nomClub)
  );
  assignOptionalString(
    merged,
    "categorie",
    overlayString(mirror.categorie, base.categorie)
  );
  assignOptionalString(
    merged,
    "certificat",
    overlayString(mirror.certificat, base.certificat)
  );
  assignOptionalString(
    merged,
    "nationalite",
    overlayString(mirror.nationalite, base.nationalite)
  );

  if (typeof mirror.isHomme === "boolean") {
    merged.isHomme = mirror.isHomme;
  } else if (typeof base.isHomme === "boolean") {
    merged.isHomme = base.isHomme;
  }

  merged.typeLicence =
    mirror.typeLicence !== undefined ? mirror.typeLicence : (base.typeLicence ?? null);

  if (typeof mirror.pointsLicence === "number" && Number.isFinite(mirror.pointsLicence)) {
    merged.pointsLicence = mirror.pointsLicence;
  } else if (typeof base.pointsLicence === "number" && Number.isFinite(base.pointsLicence)) {
    merged.pointsLicence = base.pointsLicence;
  } else if (base.pointsLicence === null) {
    merged.pointsLicence = null;
  }

  return merged;
}

export function ffttCategorieFromLookup(lookup: unknown): string | undefined {
  if (!lookup || typeof lookup !== "object") {
    return undefined;
  }
  return trimString((lookup as { categorie?: unknown }).categorie);
}
