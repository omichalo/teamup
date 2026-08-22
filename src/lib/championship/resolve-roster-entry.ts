import {
  flagsFromCompetitionIds,
  hasChampionshipCompetitionIntent,
} from "./competition-mapping";
import { resolveLicensePresence } from "./license-presence";
import { resolveChampionshipPersonKey } from "./person-key";
import type { ChampionshipPlayerRecord } from "./records";

export type ExistingRosterState = {
  coachExcluded: boolean;
  coachIncluded: boolean;
  championnat?: boolean;
  championnatParis?: boolean;
  preferredTeams?: ChampionshipPlayerRecord["preferredTeams"];
  isTemporary?: boolean;
  hasPlayedAtLeastOneMatch?: boolean;
  hasPlayedAtLeastOneMatchParis?: boolean;
};

export type RegistrationRosterInput = {
  registrationId: string;
  status?: string | null;
  paymentStatus?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  sex?: string | null;
  competitionIds?: readonly string[] | null;
  ffttLicense?: string | null;
  licenseValidationStatus?: string | null;
  listedInClub?: boolean | null;
  typeLicence?: string | null;
  playerNomClub?: string | null;
};

export type ResolveRosterDecision =
  | { action: "skip"; reason: "rejected" | "no_intent" | "no_person_key" }
  | { action: "exclude"; personKey: string }
  | { action: "upsert"; record: ChampionshipPlayerRecord };

const EMPTY_TEAMS = { masculine: [] as string[], feminine: [] as string[] };

export function resolveRosterEntryFromRegistration(
  seasonLabel: string,
  registration: RegistrationRosterInput,
  existing?: ExistingRosterState | null
): ResolveRosterDecision {
  if (registration.status === "rejected") {
    return { action: "skip", reason: "rejected" };
  }

  const flags = flagsFromCompetitionIds(registration.competitionIds);
  const intent = hasChampionshipCompetitionIntent(registration.competitionIds);
  const personKey = resolveChampionshipPersonKey({
    ffttLicense: registration.ffttLicense ?? null,
    registrationId: registration.registrationId,
  });
  if (!personKey) {
    return { action: "skip", reason: "no_person_key" };
  }

  if (existing?.coachExcluded) {
    return { action: "exclude", personKey };
  }

  if (!intent && !existing?.coachIncluded) {
    return { action: "skip", reason: "no_intent" };
  }

  const championnat = intent
    ? flags.championnat
    : Boolean(existing?.championnat);
  const championnatParis = intent
    ? flags.championnatParis
    : Boolean(existing?.championnatParis);

  return {
    action: "upsert",
    record: {
      personKey,
      seasonLabel,
      registrationId: registration.registrationId,
      ffttLicense: registration.ffttLicense?.replace(/\D/g, "") || null,
      firstName: registration.firstName ?? "",
      lastName: registration.lastName ?? "",
      sex:
        registration.sex === "female" ||
        registration.sex === "male" ||
        registration.sex === "other"
          ? registration.sex
          : "",
      includedFromDossier: intent,
      coachIncluded: existing?.coachIncluded ?? false,
      coachExcluded: false,
      championnat,
      championnatParis,
      paymentStatus: registration.paymentStatus ?? null,
      registrationStatus: registration.status ?? null,
      licensePresence: resolveLicensePresence({
        ffttLicense: registration.ffttLicense ?? null,
        listedInClub: registration.listedInClub ?? null,
        typeLicence: registration.typeLicence ?? null,
        licenseValidationStatus: registration.licenseValidationStatus ?? null,
        playerNomClub: registration.playerNomClub ?? null,
      }),
      licenseValidationStatus: registration.licenseValidationStatus ?? null,
      preferredTeams: existing?.preferredTeams ?? EMPTY_TEAMS,
      isTemporary: existing?.isTemporary ?? false,
      hasPlayedAtLeastOneMatch: existing?.hasPlayedAtLeastOneMatch,
      hasPlayedAtLeastOneMatchParis: existing?.hasPlayedAtLeastOneMatchParis,
    },
  };
}
