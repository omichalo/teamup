import { currentClubLicenseFields } from "@/lib/players/current-club-license";
import { resolveLicensePresence } from "./license-presence";
import type { ChampionshipPlayerRecord, LicensePresence } from "./schema";
import type { Player } from "@/types/team-management";

export type ChampionshipAlertCode =
  | "unpaid"
  | "payment_requested"
  | "not_in_club_list"
  | "fftt_sqy_unlicensed"
  | "other_club"
  | "other_federation"
  | "no_license";

export type ChampionshipRosterView = ChampionshipPlayerRecord & {
  id: string;
  discordMentions: string[];
  isWheelchair: boolean;
};

const EMPTY_TEAMS = { masculine: [] as string[], feminine: [] as string[] };

const SEASONAL_MATCH_STAT_KEYS = [
  "hasPlayedAtLeastOneMatch",
  "hasPlayedAtLeastOneMatchParis",
  "highestMasculineTeamNumberByPhase",
  "highestFeminineTeamNumberByPhase",
  "highestTeamNumberByPhaseParis",
  "masculineMatchesByTeamByPhase",
  "feminineMatchesByTeamByPhase",
  "matchesByTeamByPhaseParis",
] as const;

function withoutSeasonalMatchStats(player: Player): Player {
  const rest: Record<string, unknown> = { ...player };
  for (const key of SEASONAL_MATCH_STAT_KEYS) {
    delete rest[key];
  }
  return rest as unknown as Player;
}

function withCurrentClubLicense(player: Player): Player {
  return { ...player, ...currentClubLicenseFields(player) };
}

function alertsFromPlayerMirror(player: Player): ChampionshipAlertCode[] {
  return alertsFromRoster({
    licensePresence: resolveLicensePresence({
      ffttLicense: player.license,
      listedInClub: player.listedInClub === true,
      typeLicence: player.typeLicence,
      playerNomClub: player.nomClub ?? player.club ?? null,
    }),
  });
}

export function alertsFromRoster(record: {
  paymentStatus?: string | null;
  licensePresence: LicensePresence;
}): ChampionshipAlertCode[] {
  const alerts: ChampionshipAlertCode[] = [];
  if (record.paymentStatus === "payment_requested") {
    alerts.push("payment_requested");
  } else if (record.paymentStatus && record.paymentStatus !== "paid") {
    alerts.push("unpaid");
  }
  switch (record.licensePresence) {
    case "none":
      alerts.push("no_license");
      break;
    case "in_club_list":
      break;
    case "fftt_sqy_unlicensed":
      alerts.push("fftt_sqy_unlicensed");
      break;
    case "other_club":
      alerts.push("other_club");
      break;
    case "other_federation":
      alerts.push("other_federation");
      break;
    case "unknown":
      alerts.push("not_in_club_list");
      break;
    default:
      break;
  }
  return alerts;
}

function emptyPlayer(id: string): Player {
  return {
    id,
    name: "",
    firstName: "",
    license: "",
    typeLicence: "",
    gender: "M",
    nationality: "FR",
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    preferredTeams: { ...EMPTY_TEAMS },
    participation: {},
  };
}

export function mergePlayersWithChampionshipRoster(
  players: Player[],
  roster: ChampionshipRosterView[]
): Player[] {
  const byId = new Map(players.map((player) => [player.id, { ...player }]));
  const rosterByLicense = new Map<string, ChampionshipRosterView>();

  for (const entry of roster) {
    rosterByLicense.set(entry.id, entry);
    const license = entry.ffttLicense;
    if (license) {
      rosterByLicense.set(license, entry);
    }
  }

  const mergedIds = new Set<string>();
  const result: Player[] = [];

  for (const player of byId.values()) {
    const entry =
      rosterByLicense.get(player.id) ??
      (player.license ? rosterByLicense.get(player.license) : undefined);
    if (!entry) {
      result.push(
        withCurrentClubLicense({
          ...withoutSeasonalMatchStats(player),
          participation: {
            ...player.participation,
            championnat: false,
            championnatParis: false,
          },
          championshipAlerts: alertsFromPlayerMirror(player),
          championshipPersonKey: player.id,
          hasPlayedAtLeastOneMatch: false,
          hasPlayedAtLeastOneMatchParis: false,
        })
      );
      continue;
    }
    mergedIds.add(entry.id);
    if (entry.ffttLicense) {
      mergedIds.add(entry.ffttLicense);
    }
    result.push(withCurrentClubLicense(applyRosterToPlayer(player, entry)));
  }

  for (const entry of roster) {
    if (mergedIds.has(entry.id)) {
      continue;
    }
    if (entry.ffttLicense && mergedIds.has(entry.ffttLicense)) {
      continue;
    }
    result.push(
      withCurrentClubLicense(applyRosterToPlayer(emptyPlayer(entry.id), entry))
    );
    mergedIds.add(entry.id);
  }

  return result;
}

function applyRosterToPlayer(
  player: Player,
  entry: ChampionshipRosterView
): Player {
  const gender =
    entry.sex === "female" ? "F" : entry.sex === "male" ? "M" : player.gender;
  return {
    ...withoutSeasonalMatchStats(player),
    id: player.id || entry.id,
    name: entry.lastName || player.name,
    firstName: entry.firstName || player.firstName,
    license: entry.ffttLicense || player.license,
    gender,
    isTemporary: entry.isTemporary === true || player.isTemporary === true,
    isWheelchair: entry.isWheelchair === true,
    discordMentions: entry.discordMentions,
    preferredTeams: entry.preferredTeams ?? player.preferredTeams,
    participation: {
      ...player.participation,
      championnat: entry.championnat,
      championnatParis: entry.championnatParis,
    },
    championshipAlerts: alertsFromRoster(entry),
    championshipPersonKey: entry.personKey || entry.id,
    listedInClub: player.listedInClub === true,
    hasPlayedAtLeastOneMatch: entry.hasPlayedAtLeastOneMatch === true,
    hasPlayedAtLeastOneMatchParis: entry.hasPlayedAtLeastOneMatchParis === true,
    ...(entry.highestMasculineTeamNumberByPhase
      ? { highestMasculineTeamNumberByPhase: entry.highestMasculineTeamNumberByPhase }
      : {}),
    ...(entry.highestFeminineTeamNumberByPhase
      ? { highestFeminineTeamNumberByPhase: entry.highestFeminineTeamNumberByPhase }
      : {}),
    ...(entry.highestTeamNumberByPhaseParis
      ? { highestTeamNumberByPhaseParis: entry.highestTeamNumberByPhaseParis }
      : {}),
    ...(entry.masculineMatchesByTeamByPhase
      ? { masculineMatchesByTeamByPhase: entry.masculineMatchesByTeamByPhase }
      : {}),
    ...(entry.feminineMatchesByTeamByPhase
      ? { feminineMatchesByTeamByPhase: entry.feminineMatchesByTeamByPhase }
      : {}),
    ...(entry.matchesByTeamByPhaseParis
      ? { matchesByTeamByPhaseParis: entry.matchesByTeamByPhaseParis }
      : {}),
  } as Player;
}
