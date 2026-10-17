import type { Firestore } from "firebase-admin/firestore";
import { isRejectedRegistration } from "@/lib/attendance/alerts";
import { displayNameFromParts } from "@/lib/attendance/roster";
import { getRegistrationData } from "@/lib/attendance/store";
import {
  buildCampAttendanceMarkId,
  newCampExternalId,
} from "./attendance-mark";
import type { CampAttendanceMarkBody } from "./camp-attendance-mark-schema";
import {
  resolveCampClubRegistrationId,
  resolveCampEnrolledRegistrationId,
} from "./camp-attendance-mark-schema";
import {
  deleteCampMarkById,
  getCampRegistration,
  getSlotsByIds,
  listMarksForSlot,
  listRegistrationsForSlot,
  upsertCampMark,
} from "./store";
import type { CampAttendanceMark, CampSlot } from "./types";

export type CampMarkApplyResult =
  | { ok: true; mark: CampAttendanceMark }
  | { ok: false; status: number; error: string };

export type CampMarkDeleteResult =
  | { ok: true; markId: string }
  | { ok: false; status: number; error: string };

async function loadActiveCampSlot(
  db: Firestore,
  slotId: string,
  date: string
): Promise<
  | { ok: true; slot: CampSlot }
  | { ok: false; status: number; error: string }
> {
  const slots = await getSlotsByIds(db, [slotId]);
  const slot = slots[0];
  if (!slot || slot.date !== date) {
    return { ok: false, status: 404, error: "Créneau stage introuvable" };
  }
  if (slot.cancelled) {
    return {
      ok: false,
      status: 409,
      error: "Séance annulée : pointage impossible",
    };
  }
  return { ok: true, slot };
}

export async function applyCampAttendanceMark(params: {
  db: Firestore;
  body: CampAttendanceMarkBody;
  actorUid: string;
}): Promise<CampMarkApplyResult> {
  const { db, body, actorUid } = params;
  const slotResult = await loadActiveCampSlot(db, body.slotId, body.date);
  if (!slotResult.ok) {
    return slotResult;
  }
  const { slot } = slotResult;
  const markedAt = new Date().toISOString();

  if (body.kind === "enrolled") {
    const campRegistrationId = resolveCampEnrolledRegistrationId(body);
    if (!campRegistrationId) {
      return { ok: false, status: 400, error: "Inscription stage requise" };
    }
    const registration = await getCampRegistration(db, campRegistrationId);
    if (!registration || registration.status === "cancelled") {
      return { ok: false, status: 404, error: "Inscription stage introuvable" };
    }
    if (!registration.slotIds.includes(slot.id)) {
      return {
        ok: false,
        status: 400,
        error: "Cette inscription n’est pas sur ce créneau",
      };
    }
    const id = buildCampAttendanceMarkId({
      slotId: slot.id,
      kind: "enrolled",
      campRegistrationId,
    });
    if (!id) {
      return { ok: false, status: 400, error: "Identifiant invalide" };
    }
    const displayName =
      `${registration.firstName} ${registration.lastName}`.trim() ||
      campRegistrationId;
    const mark = await upsertCampMark(db, {
      id,
      campId: slot.campId,
      slotId: slot.id,
      date: body.date,
      kind: "enrolled",
      campRegistrationId,
      clubRegistrationId: null,
      externalId: null,
      firstName: registration.firstName,
      lastName: registration.lastName,
      phone: registration.phone || null,
      note: null,
      displayName,
      markedAt,
      markedByUid: actorUid,
    });
    return { ok: true, mark };
  }

  if (body.kind === "member_walkin") {
    const clubRegistrationId = resolveCampClubRegistrationId(body);
    if (!clubRegistrationId) {
      return { ok: false, status: 400, error: "Dossier adhérent requis" };
    }
    const data = await getRegistrationData(db, clubRegistrationId);
    if (!data || isRejectedRegistration(data)) {
      return { ok: false, status: 404, error: "Dossier introuvable" };
    }
    const enrolled = await listRegistrationsForSlot(db, slot.id);
    const alreadyEnrolled = enrolled.some(
      (reg) => reg.clubRegistrationId === clubRegistrationId
    );
    if (alreadyEnrolled) {
      return {
        ok: false,
        status: 409,
        error: "Cet adhérent est déjà inscrit sur ce créneau de stage",
      };
    }
    const firstName = typeof data.firstName === "string" ? data.firstName : "";
    const lastName = typeof data.lastName === "string" ? data.lastName : "";
    const displayName =
      displayNameFromParts(firstName, lastName) || clubRegistrationId;
    const id = buildCampAttendanceMarkId({
      slotId: slot.id,
      kind: "member_walkin",
      clubRegistrationId,
    });
    if (!id) {
      return { ok: false, status: 400, error: "Identifiant invalide" };
    }
    const mark = await upsertCampMark(db, {
      id,
      campId: slot.campId,
      slotId: slot.id,
      date: body.date,
      kind: "member_walkin",
      campRegistrationId: null,
      clubRegistrationId,
      externalId: null,
      firstName,
      lastName,
      phone: typeof data.phone === "string" ? data.phone : null,
      note: null,
      displayName,
      markedAt,
      markedByUid: actorUid,
    });
    return { ok: true, mark };
  }

  // external
  if (!body.external) {
    return { ok: false, status: 400, error: "Identité extérieur requise" };
  }
  const externalId = newCampExternalId();
  const id = buildCampAttendanceMarkId({
    slotId: slot.id,
    kind: "external",
    externalId,
  });
  if (!id) {
    return { ok: false, status: 400, error: "Identifiant invalide" };
  }
  const displayName =
    displayNameFromParts(body.external.firstName, body.external.lastName) ||
    "Extérieur";
  const mark = await upsertCampMark(db, {
    id,
    campId: slot.campId,
    slotId: slot.id,
    date: body.date,
    kind: "external",
    campRegistrationId: null,
    clubRegistrationId: null,
    externalId,
    firstName: body.external.firstName,
    lastName: body.external.lastName,
    phone: body.external.phone?.trim() || null,
    note: body.external.note?.trim() || null,
    displayName,
    markedAt,
    markedByUid: actorUid,
  });
  return { ok: true, mark };
}

export async function deleteCampAttendanceMark(params: {
  db: Firestore;
  body: CampAttendanceMarkBody;
}): Promise<CampMarkDeleteResult> {
  const { db, body } = params;
  const slots = await getSlotsByIds(db, [body.slotId]);
  const slot = slots[0];
  if (!slot || slot.date !== body.date) {
    return { ok: false, status: 404, error: "Créneau stage introuvable" };
  }

  let markId: string | null = null;

  if (body.kind === "enrolled") {
    const campRegistrationId = resolveCampEnrolledRegistrationId(body);
    markId = buildCampAttendanceMarkId({
      slotId: body.slotId,
      kind: "enrolled",
      campRegistrationId,
    });
  } else if (body.kind === "member_walkin") {
    const clubRegistrationId = resolveCampClubRegistrationId(body);
    markId = buildCampAttendanceMarkId({
      slotId: body.slotId,
      kind: "member_walkin",
      clubRegistrationId,
    });
  } else {
    markId =
      body.markId?.trim() ||
      buildCampAttendanceMarkId({
        slotId: body.slotId,
        kind: "external",
        externalId: body.externalId ?? null,
      });
  }

  if (!markId) {
    return { ok: false, status: 400, error: "Identifiant invalide" };
  }

  // Vérifie que la mark appartient bien au slot (sécurité soft)
  const marks = await listMarksForSlot(db, body.slotId);
  const existing = marks.find((m) => m.id === markId);
  if (!existing) {
    return { ok: false, status: 404, error: "Présence introuvable" };
  }

  const deleted = await deleteCampMarkById(db, markId);
  if (!deleted) {
    return { ok: false, status: 404, error: "Présence introuvable" };
  }
  return { ok: true, markId };
}
