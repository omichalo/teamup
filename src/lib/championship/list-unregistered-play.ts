import type { Firestore } from "firebase-admin/firestore";
import { COLLECTION as REGISTRATIONS_COLLECTION } from "@/lib/club-registration/list-registrations";
import { registrationMatchesActiveSeason } from "@/lib/club-registration/resolve-registration-season-label";
import { readKnownFfttLicenseFromRegistrationData } from "@/lib/license-validation/known-fftt-license";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import {
  CHAMPIONNAT_EQUIPE_COMPETITION_ID,
  CHAMPIONNAT_PARIS_COMPETITION_ID,
} from "./competition-mapping";
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

type DossierIndex = {
  competitionIds: string[];
  status: string | null;
  firstName: string | null;
  lastName: string | null;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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
    const entry = {
      id: doc.id,
      competitionIds: asStringArray(data.competitionIds),
      status: typeof data.status === "string" ? data.status : null,
      firstName: typeof data.firstName === "string" ? data.firstName : null,
      lastName: typeof data.lastName === "string" ? data.lastName : null,
    };
    byId.set(doc.id, entry);
    const license = readKnownFfttLicenseFromRegistrationData(
      data as Record<string, unknown>
    );
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

export async function listUnregisteredPlayFollowUps(
  db: Firestore,
  seasonLabel: string
): Promise<UnregisteredPlayListItem[]> {
  const [roster, dossiers] = await Promise.all([
    listChampionshipPlayers(db, seasonLabel),
    loadSeasonDossiers(db, seasonLabel),
  ]);

  const licenses = roster
    .map((r) => r.ffttLicense?.replace(/\D/g, "") || "")
    .filter(Boolean);
  const playerNames = await loadPlayerDisplayNames(db, licenses);

  const items: UnregisteredPlayListItem[] = [];

  for (const player of roster) {
    if (player.coachExcluded) continue;
    const license = player.ffttLicense?.replace(/\D/g, "") || null;
    const dossier = pickDossier(
      dossiers.byId,
      dossiers.byLicense,
      player.registrationId,
      license
    );
    const competitionIds = dossier?.competitionIds ?? [];
    const hasEquipe = competitionIds.includes(CHAMPIONNAT_EQUIPE_COMPETITION_ID);
    const hasParis = competitionIds.includes(CHAMPIONNAT_PARIS_COMPETITION_ID);

    const playedEquipe = hasPlayedTeamChampionship(player);
    const playedParis = hasPlayedParisChampionship(player);
    if (!playedEquipe && !playedParis) continue;

    const fromPlayers = license ? playerNames.get(license) : undefined;
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
      dossierCompetitionIds: competitionIds.filter(
        (id) =>
          id === CHAMPIONNAT_EQUIPE_COMPETITION_ID ||
          id === CHAMPIONNAT_PARIS_COMPETITION_ID ||
          id.startsWith("championnat") ||
          id.startsWith("criterium")
      ),
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

  items.sort((a, b) => {
    const byComp = a.competition.localeCompare(b.competition);
    if (byComp !== 0) return byComp;
    return a.displayName.localeCompare(b.displayName, "fr");
  });

  return items;
}
