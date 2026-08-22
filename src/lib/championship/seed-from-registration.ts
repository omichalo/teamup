import type { Firestore } from "firebase-admin/firestore";
import { COLLECTION as REGISTRATIONS_COLLECTION } from "@/lib/club-registration/list-registrations";
import { readKnownFfttLicenseFromRegistrationData } from "@/lib/license-validation/known-fftt-license";
import {
  deleteChampionshipPlayer,
  findChampionshipPlayerByRegistrationId,
  getChampionshipPlayer,
  upsertChampionshipPlayer,
} from "./store";
import {
  resolveRosterEntryFromRegistration,
  type ExistingRosterState,
  type RegistrationRosterInput,
} from "./resolve-roster-entry";
import { parseRegistrationPersonKey } from "./person-key";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function registrationToRosterInput(
  registrationId: string,
  data: Record<string, unknown>,
  player?: {
    listedInClub?: boolean | null;
    typeLicence?: string | null;
    nomClub?: string | null;
  } | null
): RegistrationRosterInput {
  return {
    registrationId,
    status: asString(data.status),
    paymentStatus: asString(data.paymentStatus),
    firstName: asString(data.firstName),
    lastName: asString(data.lastName),
    sex: asString(data.sex),
    competitionIds: asStringArray(data.competitionIds),
    ffttLicense: readKnownFfttLicenseFromRegistrationData(data),
    licenseValidationStatus: asString(data.licenseValidationStatus),
    listedInClub: player?.listedInClub ?? null,
    typeLicence: player?.typeLicence ?? null,
    playerNomClub:
      player?.nomClub ??
      (data.ffttLicenseLookup && typeof data.ffttLicenseLookup === "object"
        ? asString((data.ffttLicenseLookup as Record<string, unknown>).nomClub)
        : null),
  };
}

async function loadPlayerMirror(
  db: Firestore,
  license: string | null
): Promise<{
  listedInClub?: boolean | null;
  typeLicence?: string | null;
  nomClub?: string | null;
} | null> {
  if (!license) {
    return null;
  }
  const snap = await db.collection("players").doc(license).get();
  if (!snap.exists) {
    return { listedInClub: false, typeLicence: null, nomClub: null };
  }
  const data = snap.data() ?? {};
  return {
    listedInClub: data.listedInClub === true,
    typeLicence: asString(data.typeLicence),
    nomClub: asString(data.nomClub) ?? asString(data.club),
  };
}

type RosterStateSource = {
  coachExcluded?: boolean | undefined;
  coachIncluded?: boolean | undefined;
  championnat?: boolean | undefined;
  championnatParis?: boolean | undefined;
  preferredTeams?: ExistingRosterState["preferredTeams"] | undefined;
  isTemporary?: boolean | undefined;
  hasPlayedAtLeastOneMatch?: boolean | undefined;
  hasPlayedAtLeastOneMatchParis?: boolean | undefined;
};

function toExistingState(
  record: RosterStateSource | null | undefined
): ExistingRosterState | null {
  if (!record) {
    return null;
  }
  const state: ExistingRosterState = {
    coachExcluded: record.coachExcluded === true,
    coachIncluded: record.coachIncluded === true,
  };
  if (typeof record.championnat === "boolean") {
    state.championnat = record.championnat;
  }
  if (typeof record.championnatParis === "boolean") {
    state.championnatParis = record.championnatParis;
  }
  if (record.preferredTeams) {
    state.preferredTeams = record.preferredTeams;
  }
  if (typeof record.isTemporary === "boolean") {
    state.isTemporary = record.isTemporary;
  }
  if (typeof record.hasPlayedAtLeastOneMatch === "boolean") {
    state.hasPlayedAtLeastOneMatch = record.hasPlayedAtLeastOneMatch;
  }
  if (typeof record.hasPlayedAtLeastOneMatchParis === "boolean") {
    state.hasPlayedAtLeastOneMatchParis = record.hasPlayedAtLeastOneMatchParis;
  }
  return state;
}

export async function syncChampionshipRosterFromRegistration(
  db: Firestore,
  seasonLabel: string,
  registrationId: string
): Promise<{ action: "upsert" | "exclude" | "skip" }> {
  const snap = await db
    .collection(REGISTRATIONS_COLLECTION)
    .doc(registrationId)
    .get();
  if (!snap.exists) {
    return { action: "skip" };
  }
  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const license = readKnownFfttLicenseFromRegistrationData(data);
  const player = await loadPlayerMirror(db, license);

  const existingByReg = await findChampionshipPlayerByRegistrationId(
    db,
    seasonLabel,
    registrationId
  );
  const targetKeyPreview = license || existingByReg?.id || null;
  const existingByKey =
    targetKeyPreview && targetKeyPreview !== existingByReg?.id
      ? await getChampionshipPlayer(db, seasonLabel, targetKeyPreview)
      : null;
  const existing = toExistingState(existingByKey ?? existingByReg);

  const decision = resolveRosterEntryFromRegistration(
    seasonLabel,
    registrationToRosterInput(registrationId, data, player),
    existing
  );

  if (decision.action === "skip") {
    if (decision.reason === "no_intent") {
      const current = existingByReg ?? existingByKey;
      if (current?.includedFromDossier && !current.coachIncluded) {
        const { id: personKey, ...currentRecord } = current;
        await upsertChampionshipPlayer(db, {
          ...currentRecord,
          personKey,
          seasonLabel,
          includedFromDossier: false,
          championnat: false,
          championnatParis: false,
        });
        return { action: "exclude" };
      }
    }
    return { action: "skip" };
  }
  if (decision.action === "exclude") {
    const current = existingByReg ?? existingByKey;
    if (current) {
      const { id: personKey, ...currentRecord } = current;
      await upsertChampionshipPlayer(db, {
        ...currentRecord,
        personKey,
        seasonLabel,
        coachExcluded: true,
        championnat: false,
        championnatParis: false,
        includedFromDossier: false,
      });
    }
    return { action: "exclude" };
  }

  await upsertChampionshipPlayer(db, decision.record);

  const oldKey = existingByReg?.id;
  if (oldKey && oldKey !== decision.record.personKey) {
    const leftoverRegId = parseRegistrationPersonKey(oldKey);
    if (leftoverRegId === registrationId) {
      await deleteChampionshipPlayer(db, seasonLabel, oldKey);
    }
  }

  return { action: "upsert" };
}
