import { z } from "zod";

export const LICENSE_PRESENCE_VALUES = [
  "in_club_list",
  "fftt_sqy_unlicensed",
  "other_club",
  "other_federation",
  "none",
  "unknown",
] as const;

export type LicensePresence = (typeof LICENSE_PRESENCE_VALUES)[number];

export const licensePresenceSchema = z.enum(LICENSE_PRESENCE_VALUES);

export const preferredTeamsSchema = z.object({
  masculine: z.array(z.string()).default([]),
  feminine: z.array(z.string()).default([]),
});

export const burnoutByPhaseSchema = z
  .object({
    aller: z.number().int().optional(),
    retour: z.number().int().optional(),
  })
  .optional();

export const matchesByTeamByPhaseSchema = z
  .object({
    aller: z.record(z.string(), z.number()).optional(),
    retour: z.record(z.string(), z.number()).optional(),
  })
  .optional();

export const championshipPlayerSchema = z.object({
  personKey: z.string().min(1),
  seasonLabel: z.string().min(1),
  registrationId: z.string().nullable(),
  ffttLicense: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  sex: z.enum(["female", "male", "other", ""]).optional(),
  includedFromDossier: z.boolean(),
  coachIncluded: z.boolean(),
  coachExcluded: z.boolean(),
  championnat: z.boolean(),
  championnatParis: z.boolean(),
  paymentStatus: z.string().nullable(),
  registrationStatus: z.string().nullable(),
  licensePresence: licensePresenceSchema,
  licenseValidationStatus: z.string().nullable(),
  preferredTeams: preferredTeamsSchema,
  isTemporary: z.boolean().default(false),
  hasPlayedAtLeastOneMatch: z.boolean().optional(),
  hasPlayedAtLeastOneMatchParis: z.boolean().optional(),
  highestMasculineTeamNumberByPhase: burnoutByPhaseSchema,
  highestFeminineTeamNumberByPhase: burnoutByPhaseSchema,
  highestTeamNumberByPhaseParis: burnoutByPhaseSchema,
  masculineMatchesByTeamByPhase: matchesByTeamByPhaseSchema,
  feminineMatchesByTeamByPhase: matchesByTeamByPhaseSchema,
  matchesByTeamByPhaseParis: matchesByTeamByPhaseSchema,
});

export type ChampionshipPlayerRecord = z.infer<typeof championshipPlayerSchema>;

export const playerClubProfileSchema = z.object({
  personKey: z.string().min(1),
  discordMentions: z.array(z.string()).default([]),
  isWheelchair: z.boolean().default(false),
});

export type PlayerClubProfileRecord = z.infer<typeof playerClubProfileSchema>;

export const rosterParticipationPatchSchema = z
  .object({
    championnat: z.boolean().optional(),
    championnatParis: z.boolean().optional(),
    coachExcluded: z.boolean().optional(),
    isTemporary: z.boolean().optional(),
    firstName: z.string().trim().max(120).optional(),
    lastName: z.string().trim().max(120).optional(),
    sex: z.enum(["female", "male", "other", ""]).optional(),
    ffttLicense: z.string().regex(/^[0-9]{5,12}$/).nullable().optional(),
    isWheelchair: z.boolean().optional(),
    discordMentions: z.array(z.string()).optional(),
    preferredTeams: preferredTeamsSchema.optional(),
  })
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    { message: "Aucun champ modifiable fourni" }
  );

export type RosterParticipationPatch = z.infer<typeof rosterParticipationPatchSchema>;
