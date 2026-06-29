import type { RegistrationLicenseConflict } from "@/lib/club-registration/find-registration-license-conflicts";
import {
  buildFfttIdentityPatchFromLookup,
  buildFfttLicenseLookupPatch,
  type FfttLicenseLookupIdentity,
  type FfttLicenseLookupPatch,
} from "@/lib/club-registration/apply-fftt-license-lookup";
import {
  lookupFFTTLicense,
  type FFTTLicenseLookupPlayer,
  type RegistrationLicenseUsageSummary,
} from "@/lib/club-registration/license-lookup";

export type FfttLicenseLookupUiState = {
  licenseUsage: RegistrationLicenseUsageSummary;
  identityMismatch: boolean;
  prefilledNames: boolean;
};

const EMPTY_USAGE: RegistrationLicenseUsageSummary = {
  blocking: [],
  warnings: [],
};

export async function runFfttLicenseLookupFlow(params: {
  licence: string;
  current: FfttLicenseLookupIdentity;
  excludeRegistrationId?: string;
}): Promise<
  | { ok: false; error: string }
  | { ok: true; found: false; licenseUsage: RegistrationLicenseUsageSummary }
  | {
      ok: true;
      found: true;
      player: FFTTLicenseLookupPlayer;
      patch: ReturnType<typeof buildFfttLicenseLookupPatch>["patch"];
      licenseUsage: RegistrationLicenseUsageSummary;
      identityMismatch: boolean;
      sexMismatch: boolean;
      prefilledNames: boolean;
      prefilledSex: boolean;
    }
> {
  const result = await lookupFFTTLicense(params.licence, {
    ...(params.excludeRegistrationId
      ? { excludeRegistrationId: params.excludeRegistrationId }
      : {}),
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const licenseUsage = result.licenseUsage ?? EMPTY_USAGE;

  if (!result.found) {
    return { ok: true, found: false, licenseUsage };
  }

  const built = buildFfttLicenseLookupPatch(result.player, params.current);
  return {
    ok: true,
    found: true,
    player: result.player,
    patch: built.patch,
    licenseUsage,
    identityMismatch: built.identityMismatch,
    sexMismatch: built.sexMismatch,
    prefilledNames: built.prefilledNames,
    prefilledSex: built.prefilledSex,
  };
}

export function buildApplyFfttIdentityPatch(
  player: {
    prenom?: string | undefined;
    nom?: string | undefined;
    isHomme?: boolean | undefined;
  }
): Partial<Pick<FfttLicenseLookupPatch, "firstName" | "lastName" | "sex">> {
  return buildFfttIdentityPatchFromLookup(player);
}

/** @deprecated Utiliser buildApplyFfttIdentityPatch */
export const buildApplyFfttNamesPatch = buildApplyFfttIdentityPatch;

export function hasBlockingLicenseUsage(
  usage: RegistrationLicenseUsageSummary | undefined
): boolean {
  return (usage?.blocking.length ?? 0) > 0;
}

export type { RegistrationLicenseConflict };
