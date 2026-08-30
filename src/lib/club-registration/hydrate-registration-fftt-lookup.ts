import type { Firestore } from "firebase-admin/firestore";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import { resolveKnownFfttLicenseNumber } from "@/lib/license-validation/known-fftt-license";
import {
  getPlayerFfttMirror,
  getPlayerFfttMirrorsByLicence,
  type PlayerFfttMirror,
} from "@/lib/players/fftt-mirror";
import {
  ffttCategorieFromLookup,
  mergeFfttLicenseLookupFromMirror,
} from "@/lib/players/map-player-to-license-lookup";

export function registrationLicenseForMirror(
  registration: RegistrationClientRecord
): string {
  const lookup = registration.ffttLicenseLookup;
  const lookupLicence =
    lookup && typeof lookup === "object"
      ? (lookup as Record<string, unknown>).licence
      : undefined;
  return resolveKnownFfttLicenseNumber(registration.ffttLicense, lookupLicence);
}

export function applyFfttMirrorToRegistration(
  registration: RegistrationClientRecord,
  mirror: PlayerFfttMirror | null
): RegistrationClientRecord {
  const merged = mergeFfttLicenseLookupFromMirror(
    registration.ffttLicenseLookup,
    mirror
  );
  const next: RegistrationClientRecord = { ...registration };
  if (merged) {
    next.ffttLicenseLookup = merged;
  }
  const categorie = ffttCategorieFromLookup(
    merged ?? registration.ffttLicenseLookup
  );
  if (categorie) {
    next.ffttCategorie = categorie;
  } else {
    delete next.ffttCategorie;
  }
  return next;
}

export async function hydrateRegistrationFfttLookup(
  db: Firestore,
  registration: RegistrationClientRecord
): Promise<RegistrationClientRecord> {
  const licence = registrationLicenseForMirror(registration);
  const mirror = await getPlayerFfttMirror(db, licence);
  return applyFfttMirrorToRegistration(registration, mirror);
}

export async function hydrateRegistrationsFfttLookup(
  db: Firestore,
  registrations: RegistrationClientRecord[]
): Promise<RegistrationClientRecord[]> {
  const licences = registrations
    .map(registrationLicenseForMirror)
    .filter((licence) => licence.length > 0);
  const mirrors = await getPlayerFfttMirrorsByLicence(db, licences);
  return registrations.map((registration) => {
    const licence = registrationLicenseForMirror(registration);
    return applyFfttMirrorToRegistration(
      registration,
      licence ? (mirrors.get(licence) ?? null) : null
    );
  });
}
