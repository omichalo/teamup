import {
  formatFfttIdentityLabel,
  hasFfttIdentityMismatch,
  hasFfttSexMismatch,
  sexFromFfttIsHomme,
  type FfttIdentityComparable,
} from "./compare-fftt-identity";
import type { FFTTLicenseLookupPlayer } from "./license-lookup";
import { normalizeLastName } from "@/lib/shared/person-name-format";

export type FfttLicenseLookupIdentity = {
  firstName: string;
  lastName: string;
  sex: "" | "female" | "male" | "other";
};

export type FfttLicenseLookupPatch = {
  ffttLicense: string;
  ffttLicenseLookup: FFTTLicenseLookupPlayer;
  firstName?: string;
  lastName?: string;
  sex?: "female" | "male" | "other";
};

function buildFfttNamePatchFromLookup(
  player: { prenom?: string | undefined; nom?: string | undefined }
): Pick<FfttLicenseLookupPatch, "firstName" | "lastName"> {
  const patch: Pick<FfttLicenseLookupPatch, "firstName" | "lastName"> = {};
  if (player.prenom?.trim()) {
    patch.firstName = player.prenom.trim();
  }
  if (player.nom?.trim()) {
    patch.lastName = normalizeLastName(player.nom);
  }
  return patch;
}

export function buildFfttIdentityPatchFromLookup(player: {
  prenom?: string | undefined;
  nom?: string | undefined;
  isHomme?: boolean | undefined;
}): Pick<FfttLicenseLookupPatch, "firstName" | "lastName" | "sex"> {
  return {
    ...buildFfttNamePatchFromLookup(player),
    ...(typeof player.isHomme === "boolean"
      ? { sex: sexFromFfttIsHomme(player.isHomme) }
      : {}),
  };
}

/** Préremplit identité seulement si les champs sont encore vides ; n'écrase jamais silencieusement. */
export function buildFfttLicenseLookupPatch(
  player: FFTTLicenseLookupPlayer,
  current: FfttLicenseLookupIdentity
): {
  patch: FfttLicenseLookupPatch;
  identityMismatch: boolean;
  sexMismatch: boolean;
  prefilledNames: boolean;
  prefilledSex: boolean;
} {
  const patch: FfttLicenseLookupPatch = {
    ffttLicense: player.licence,
    ffttLicenseLookup: player,
  };

  const namePatch = buildFfttNamePatchFromLookup(player);
  const declared: FfttIdentityComparable = {
    firstName: current.firstName,
    lastName: current.lastName,
  };
  const ffttIdentity: FfttIdentityComparable = {
    ...(namePatch.firstName ? { firstName: namePatch.firstName } : {}),
    ...(namePatch.lastName ? { lastName: namePatch.lastName } : {}),
  };
  const identityMismatch = hasFfttIdentityMismatch(declared, ffttIdentity);
  const sexMismatch = hasFfttSexMismatch(current.sex, player.isHomme);

  let prefilledNames = false;
  if (!current.firstName.trim() && namePatch.firstName) {
    patch.firstName = namePatch.firstName;
    prefilledNames = true;
  }
  if (!current.lastName.trim() && namePatch.lastName) {
    patch.lastName = namePatch.lastName;
    prefilledNames = true;
  }

  let prefilledSex = false;
  if (!current.sex && typeof player.isHomme === "boolean") {
    patch.sex = sexFromFfttIsHomme(player.isHomme);
    prefilledSex = true;
  }

  return { patch, identityMismatch, sexMismatch, prefilledNames, prefilledSex };
}

export function formatFfttLicenseLookupIdentityLabel(
  player: Pick<FFTTLicenseLookupPlayer, "prenom" | "nom">
): string {
  return formatFfttIdentityLabel({
    ...(player.prenom ? { firstName: player.prenom } : {}),
    ...(player.nom ? { lastName: player.nom } : {}),
  });
}
