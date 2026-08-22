/**
 * Types métier du roster saisonnier, sans Zod.
 * Cloud Functions (TS 4.9) compile le graphe de sync et ne peut pas parser Zod v4.
 */

export const LICENSE_PRESENCE_VALUES = [
  "in_club_list",
  "fftt_sqy_unlicensed",
  "other_club",
  "other_federation",
  "none",
  "unknown",
] as const;

export type LicensePresence = (typeof LICENSE_PRESENCE_VALUES)[number];

export type ChampionshipAlertCode =
  | "unpaid"
  | "payment_requested"
  | "not_in_club_list"
  | "fftt_sqy_unlicensed"
  | "other_club"
  | "other_federation"
  | "no_license";

export type PreferredTeams = {
  masculine: string[];
  feminine: string[];
};

export type BurnoutByPhase = {
  aller?: number | undefined;
  retour?: number | undefined;
};

export type MatchesByTeamByPhase = {
  aller?: Record<string, number> | undefined;
  retour?: Record<string, number> | undefined;
};

export type ChampionshipPlayerRecord = {
  personKey: string;
  seasonLabel: string;
  registrationId: string | null;
  ffttLicense: string | null;
  firstName: string;
  lastName: string;
  sex?: "female" | "male" | "other" | "" | undefined;
  includedFromDossier: boolean;
  coachIncluded: boolean;
  coachExcluded: boolean;
  championnat: boolean;
  championnatParis: boolean;
  paymentStatus: string | null;
  registrationStatus: string | null;
  licensePresence: LicensePresence;
  licenseValidationStatus: string | null;
  preferredTeams: PreferredTeams;
  isTemporary: boolean;
  hasPlayedAtLeastOneMatch?: boolean | undefined;
  hasPlayedAtLeastOneMatchParis?: boolean | undefined;
  highestMasculineTeamNumberByPhase?: BurnoutByPhase | undefined;
  highestFeminineTeamNumberByPhase?: BurnoutByPhase | undefined;
  highestTeamNumberByPhaseParis?: BurnoutByPhase | undefined;
  masculineMatchesByTeamByPhase?: MatchesByTeamByPhase | undefined;
  feminineMatchesByTeamByPhase?: MatchesByTeamByPhase | undefined;
  matchesByTeamByPhaseParis?: MatchesByTeamByPhase | undefined;
};

export type PlayerClubProfileRecord = {
  personKey: string;
  discordMentions: string[];
  isWheelchair: boolean;
};

export type RosterParticipationPatch = {
  championnat?: boolean | undefined;
  championnatParis?: boolean | undefined;
  coachExcluded?: boolean | undefined;
  isTemporary?: boolean | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  sex?: "female" | "male" | "other" | "" | undefined;
  ffttLicense?: string | null | undefined;
  isWheelchair?: boolean | undefined;
  discordMentions?: string[] | undefined;
  preferredTeams?: PreferredTeams | undefined;
};
