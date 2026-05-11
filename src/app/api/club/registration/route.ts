export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import { getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { FieldValue } from "firebase-admin/firestore";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import { clubRegistrationPayloadSchema } from "@/lib/club-registration/schema";
import { isMinorAt } from "@/lib/club-registration/age";
import { checkRateLimit } from "@/lib/auth/rate-limit";

const COLLECTION = "clubRegistrations";

/** Champs métier renvoyés au client (hors Timestamps bruts). */
const REGISTRATION_CLIENT_FIELDS = [
  "adherentRole",
  "firstName",
  "lastName",
  "sex",
  "birthCity",
  "birthDate",
  "adherentEmail",
  "adherentPhonePrimary",
  "adherentPhoneSecondary",
  "addressLine1",
  "addressLine2",
  "postalCode",
  "city",
  "representatives",
  "mainSectionId",
  "additionalSectionIds",
  "slotIds",
  "medicalCertificateDeclaration",
  "wantsRegistrationCertificate",
  "familyRegistrationOrder",
  "reductionTypes",
  "passSportCode",
  "firstFemaleRegistrationSqy",
  "photoConsent",
  "emergencyMedicalAuthorization",
  "supervisionAcknowledgement",
  "internalRulesAccepted",
  "wantsCompetitorExtras",
  "competitionJerseySize",
  "competitionIds",
  "isMinor",
  "submitterUid",
  "submitterAccountEmail",
  "schemaVersion",
  "status",
] as const;

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== "") {
      out[k] = v;
    }
  }
  return out;
}

/** GET /api/club/registration?id={registrationId} — lecture d'un dossier (owner ou admin). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return jsonNoStore({ error: "Paramètre 'id' requis" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.PLAYER, USER_ROLES.COACH, USER_ROLES.ADMIN])) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }
    const data = snap.data();
    if (!data) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    const isAdmin = role === USER_ROLES.ADMIN;
    if (!isAdmin && data.submitterUid !== decoded.uid) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const registration: Record<string, unknown> = { id: snap.id };
    for (const key of REGISTRATION_CLIENT_FIELDS) {
      if (data[key] !== undefined) {
        registration[key] = data[key];
      }
    }
    registration.submittedAt = data.submittedAt?.toDate?.()?.toISOString?.() ?? null;
    registration.updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() ?? null;

    return jsonNoStore({ registration }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration GET]", error);
    return jsonNoStore({ error: "Impossible de charger le dossier" }, { status: 500 });
  }
}

/**
 * POST /api/club/registration — création d'un nouveau dossier (auto-id Firestore).
 *
 * Auth requise (cookie de session, email vérifié). Le rôle minimum accepté est
 * `PLAYER` car un visiteur qui s'inscrit pour lui-même ou pour un mineur passe
 * forcément par un compte dont le rôle par défaut est `PLAYER`. Les `COACH` et
 * `ADMIN` sont également autorisés (ex. inscription par un encadrant).
 */
export async function POST(req: Request) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    if (!hasAnyRole(role, [USER_ROLES.PLAYER, USER_ROLES.COACH, USER_ROLES.ADMIN])) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const rate = checkRateLimit(`club-registration:${decoded.uid}`, 8, 60 * 60 * 1000);
    if (!rate.allowed) {
      return jsonNoStore(
        { error: "Trop de soumissions dans la période autorisée. Réessayez plus tard." },
        { status: 429 }
      );
    }

    const json = (await req.json()) ?? {};
    const parsed = clubRegistrationPayloadSchema.safeParse(json);

    if (!parsed.success) {
      const first = parsed.error.flatten();
      return jsonNoStore(
        { error: "Données invalides", fieldErrors: first.fieldErrors },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const db = getFirestoreAdmin();

    const baseFields = stripUndefined({ ...payload });
    const now = FieldValue.serverTimestamp();

    const docRef = await db.collection(COLLECTION).add({
      ...baseFields,
      isMinor: isMinorAt(payload.birthDate),
      submitterUid: decoded.uid,
      submitterAccountEmail: decoded.email ?? null,
      schemaVersion: 1,
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
      createdAt: now,
    });

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_SUBMITTED, decoded.uid, {
      resource: "clubRegistration",
      resourceId: docRef.id,
      success: true,
    });

    return jsonNoStore({ success: true, id: docRef.id }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration POST]", error);
    return jsonNoStore({ error: "Impossible d’enregistrer le dossier" }, { status: 500 });
  }
}
