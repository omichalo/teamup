import type { Firestore } from "firebase-admin/firestore";
import { COLLECTION as REGISTRATIONS_COLLECTION } from "@/lib/club-registration/list-registrations";
import { registrationMatchesActiveSeason } from "@/lib/club-registration/resolve-registration-season-label";
import { readKnownFfttLicenseFromRegistrationData } from "@/lib/license-validation/known-fftt-license";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import {
  CHAMPIONNAT_EQUIPE_COMPETITION_ID,
  CHAMPIONNAT_PARIS_COMPETITION_ID,
} from "./competition-mapping";
import {
  isPaidChampionshipRegistration,
  type PaidChampionshipNotPlayedItem,
} from "./paid-championship-not-played";
import { resolveChampionshipPersonKey } from "./person-key";
import type { ChampionshipPlayerRecord } from "./records";
import { listChampionshipPlayers } from "./store";
import {
  hasPlayedParisChampionship,
  hasPlayedTeamChampionship,
  readUnregisteredPlayPaymentStatus,
  type UnregisteredPlayCompetition,
  type UnregisteredPlayPaymentStatus,
} from "./unregistered-play-follow-up";

export type UnregisteredPlayListItem = {
  personKey: string;
  competition: UnregisteredPlayCompetition;
  firstName: string;
  lastName: string;
  displayName: string;
  ffttLicense: string | null;
  registrationId: string | null;
  registrationStatus: string | null;
  dossierCompetitionIds: string[];
  paymentStatus: UnregisteredPlayPaymentStatus | null;
  coachIncluded: boolean;
};

export type ChampionshipSecretariatFollowUps = {
  playedWithoutOption: UnregisteredPlayListItem[];
  paidWithoutPlay: PaidChampionshipNotPlayedItem[];
};

type DossierIndex = {
  competitionIds: string[];
  status: string | null;
  paymentStatus: string | null;
  paidAt: unknown;
  ffttLicense: string | null;
  firstName: string | null;
  lastName: string | null;
};

type RosterPlayer = ChampionshipPlayerRecord & { id: string };

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function championshipOptionIds(competitionIds: string[]): string[] {
  return competitionIds.filter(
    (id) =>
      id === CHAMPIONNAT_EQUIPE_COMPETITION_ID ||
      id === CHAMPIONNAT_PARIS_COMPETITION_ID ||
      id.startsWith("championnat") ||
      id.startsWith("criterium")
  );
}

function pickDossier(
  byId: Map<string, DossierIndex & { id: string }>,
  byLicense: Map<string, Array<DossierIndex & { id: string }>>,
  registrationId: string | null,
  license: string | null
): (DossierIndex & { id: string }) | null {
  if (registrationId) {
    const direct = byId.get(registrationId);
    if (direct) return direct;
  }
  if (!license) return null;
  const candidates = (byLicense.get(license) ?? []).filter(
    (r) => r.status !== "rejected"
  );
  if (candidates.length === 0) return null;
  return (
    candidates.find(
      (r) =>
        r.competitionIds.includes(CHAMPIONNAT_EQUIPE_COMPETITION_ID) ||
        r.competitionIds.includes(CHAMPIONNAT_PARIS_COMPETITION_ID)
    ) ?? candidates[0]
  );
}

async function loadSeasonDossiers(
  db: Firestore,
  seasonLabel: string
): Promise<{
  byId: Map<string, DossierIndex & { id: string }>;
  byLicense: Map<string, Array<DossierIndex & { id: string }>>;
}> {
  const byId = new Map<string, DossierIndex & { id: string }>();
  const byLicense = new Map<string, Array<DossierIndex & { id: string }>>();
  const snap = await db.collection(REGISTRATIONS_COLLECTION).get();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!registrationMatchesActiveSeason(data, seasonLabel)) continue;
    const license = readKnownFfttLicenseFromRegistrationData(
      data as Record<string, unknown>
    );
    const entry = {
      id: doc.id,
      competitionIds: asStringArray(data.competitionIds),
      status: typeof data.status === "string" ? data.status : null,
      paymentStatus:
        typeof data.paymentStatus === "string" ? data.paymentStatus : null,
      paidAt: data.paidAt ?? null,
      ffttLicense: license,
      firstName: typeof data.firstName === "string" ? data.firstName : null,
      lastName: typeof data.lastName === "string" ? data.lastName : null,
    };
    byId.set(doc.id, entry);
    if (license) {
      const list = byLicense.get(license) ?? [];
      list.push(entry);
      byLicense.set(license, list);
    }
  }
  return { byId, byLicense };
}

async function loadPlayerDisplayNames(
  db: Firestore,
  licenses: string[]
): Promise<Map<string, { firstName: string; lastName: string }>> {
  const map = new Map<string, { firstName: string; lastName: string }>();
  const unique = [...new Set(licenses.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    const snaps = await db.getAll(
      ...chunk.map((id) => db.collection("players").doc(id))
    );
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() ?? {};
      const firstName =
        (typeof data.firstName === "string" && data.firstName) ||
        (typeof data.prenom === "string" && data.prenom) ||
        "";
      const lastName =
        (typeof data.name === "string" && data.name) ||
        (typeof data.lastName === "string" && data.lastName) ||
        (typeof data.nom === "string" && data.nom) ||
        "";
      if (firstName || lastName) {
        map.set(snap.id, { firstName, lastName });
      }
    }
  }
  return map;
}

function findRosterPlayer(
  rosterByPersonKey: Map<string, RosterPlayer>,
  rosterByLicense: Map<string, RosterPlayer>,
  rosterByRegistrationId: Map<string, RosterPlayer>,
  registrationId: string,
  license: string | null
): RosterPlayer | null {
  if (license) {
    const byLicense = rosterByLicense.get(license);
    if (byLicense) return byLicense;
  }
  const byReg = rosterByRegistrationId.get(registrationId);
  if (byReg) return byReg;
  const personKey = resolveChampionshipPersonKey({
    ffttLicense: license,
    registrationId,
  });
  if (personKey) {
    return rosterByPersonKey.get(personKey) ?? null;
  }
  return null;
}

function buildPlayedWithoutOptionItems(input: {
  roster: RosterPlayer[];
  dossiers: {
    byId: Map<string, DossierIndex & { id: string }>;
    byLicense: Map<string, Array<DossierIndex & { id: string }>>;
  };
  playerNames: Map<string, { firstName: string; lastName: string }>;
}): UnregisteredPlayListItem[] {
  const items: UnregisteredPlayListItem[] = [];

  for (const player of input.roster) {
    if (player.coachExcluded) continue;
    const license = player.ffttLicense?.replace(/\D/g, "") || null;
    const dossier = pickDossier(
      input.dossiers.byId,
      input.dossiers.byLicense,
      player.registrationId,
      license
    );
    const competitionIds = dossier?.competitionIds ?? [];
    const hasEquipe = competitionIds.includes(CHAMPIONNAT_EQUIPE_COMPETITION_ID);
    const hasParis = competitionIds.includes(CHAMPIONNAT_PARIS_COMPETITION_ID);

    const playedEquipe = hasPlayedTeamChampionship(player);
    const playedParis = hasPlayedParisChampionship(player);
    if (!playedEquipe && !playedParis) continue;

    const fromPlayers = license ? input.playerNames.get(license) : undefined;
    const firstName =
      player.firstName?.trim() ||
      dossier?.firstName?.trim() ||
      fromPlayers?.firstName ||
      "";
    const lastName =
      player.lastName?.trim() ||
      dossier?.lastName?.trim() ||
      fromPlayers?.lastName ||
      "";
    const displayName =
      formatPersonDisplayName(firstName, lastName) || player.personKey;

    const base = {
      personKey: player.personKey,
      firstName,
      lastName,
      displayName,
      ffttLicense: license,
      registrationId: dossier?.id ?? player.registrationId,
      registrationStatus: dossier?.status ?? player.registrationStatus,
      dossierCompetitionIds: championshipOptionIds(competitionIds),
      coachIncluded: player.coachIncluded === true,
    };

    if (playedEquipe && !hasEquipe) {
      items.push({
        ...base,
        competition: "equipe",
        paymentStatus: readUnregisteredPlayPaymentStatus(
          player.unregisteredEquipePaymentStatus
        ),
      });
    }
    if (playedParis && !hasParis) {
      items.push({
        ...base,
        competition: "paris",
        paymentStatus: readUnregisteredPlayPaymentStatus(
          player.unregisteredParisPaymentStatus
        ),
      });
    }
  }

  return sortFollowUpItems(items);
}

function buildPaidWithoutPlayItems(input: {
  roster: RosterPlayer[];
  dossiers: {
    byId: Map<string, DossierIndex & { id: string }>;
  };
  playerNames: Map<string, { firstName: string; lastName: string }>;
}): PaidChampionshipNotPlayedItem[] {
  const rosterByPersonKey = new Map(
    input.roster.map((player) => [player.personKey, player])
  );
  const rosterByLicense = new Map<string, RosterPlayer>();
  const rosterByRegistrationId = new Map<string, RosterPlayer>();
  for (const player of input.roster) {
    const license = player.ffttLicense?.replace(/\D/g, "") || "";
    if (license && !rosterByLicense.has(license)) {
      rosterByLicense.set(license, player);
    }
    if (player.registrationId && !rosterByRegistrationId.has(player.registrationId)) {
      rosterByRegistrationId.set(player.registrationId, player);
    }
  }

  const items: PaidChampionshipNotPlayedItem[] = [];

  for (const dossier of input.dossiers.byId.values()) {
    if (
      !isPaidChampionshipRegistration({
        status: dossier.status,
        paymentStatus: dossier.paymentStatus,
        paidAt: dossier.paidAt,
      })
    ) {
      continue;
    }

    const hasEquipe = dossier.competitionIds.includes(
      CHAMPIONNAT_EQUIPE_COMPETITION_ID
    );
    const hasParis = dossier.competitionIds.includes(
      CHAMPIONNAT_PARIS_COMPETITION_ID
    );
    if (!hasEquipe && !hasParis) continue;

    const ffttLicense = dossier.ffttLicense;

    const rosterPlayer = findRosterPlayer(
      rosterByPersonKey,
      rosterByLicense,
      rosterByRegistrationId,
      dossier.id,
      ffttLicense
    );
    if (rosterPlayer?.coachExcluded) continue;

    const personKey =
      rosterPlayer?.personKey ||
      resolveChampionshipPersonKey({
        ffttLicense,
        registrationId: dossier.id,
      }) ||
      dossier.id;

    const fromPlayers = ffttLicense
      ? input.playerNames.get(ffttLicense)
      : undefined;
    const firstName =
      rosterPlayer?.firstName?.trim() ||
      dossier.firstName?.trim() ||
      fromPlayers?.firstName ||
      "";
    const lastName =
      rosterPlayer?.lastName?.trim() ||
      dossier.lastName?.trim() ||
      fromPlayers?.lastName ||
      "";
    const displayName =
      formatPersonDisplayName(firstName, lastName) || personKey;

    const playedEquipe = rosterPlayer
      ? hasPlayedTeamChampionship(rosterPlayer)
      : false;
    const playedParis = rosterPlayer
      ? hasPlayedParisChampionship(rosterPlayer)
      : false;

    const base = {
      personKey,
      firstName,
      lastName,
      displayName,
      ffttLicense,
      registrationId: dossier.id,
      registrationStatus: dossier.status,
    };

    if (hasEquipe && !playedEquipe) {
      items.push({ ...base, competition: "equipe" });
    }
    if (hasParis && !playedParis) {
      items.push({ ...base, competition: "paris" });
    }
  }

  return sortFollowUpItems(items);
}

function sortFollowUpItems<T extends { competition: string; displayName: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const byComp = a.competition.localeCompare(b.competition);
    if (byComp !== 0) return byComp;
    return a.displayName.localeCompare(b.displayName, "fr");
  });
}

/**
 * Suivis secrétariat : a joué sans option dossier, et option payée sans match.
 */
export async function listChampionshipSecretariatFollowUps(
  db: Firestore,
  seasonLabel: string
): Promise<ChampionshipSecretariatFollowUps> {
  const [roster, dossiers] = await Promise.all([
    listChampionshipPlayers(db, seasonLabel),
    loadSeasonDossiers(db, seasonLabel),
  ]);

  const licenses = [
    ...roster.map((r) => r.ffttLicense?.replace(/\D/g, "") || "").filter(Boolean),
  ];
  // Also collect licenses linked to paid dossiers via byLicense keys.
  for (const license of dossiers.byLicense.keys()) {
    licenses.push(license);
  }
  const playerNames = await loadPlayerDisplayNames(db, licenses);

  return {
    playedWithoutOption: buildPlayedWithoutOptionItems({
      roster,
      dossiers,
      playerNames,
    }),
    paidWithoutPlay: buildPaidWithoutPlayItems({
      roster,
      dossiers: { byId: dossiers.byId },
      playerNames,
    }),
  };
}
