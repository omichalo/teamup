import type { Firestore } from "firebase-admin/firestore";
import { isRejectedRegistration } from "@/lib/attendance/alerts";
import { COLLECTION as CLUB_REGISTRATIONS_COLLECTION } from "@/lib/club-registration/list-registrations";
import type { UserRole } from "@/lib/auth/roles";
import { CAMP_SCHEMA_VERSION } from "./constants";
import { isCampManager } from "./access";
import { findCampFormula } from "./formulas";
import { computeCampPricingQuote } from "./pricing";
import type { CampRegistrationSubmitInput } from "./schema";
import {
  createCampRegistration,
  getCamp,
  getSlotsByIds,
} from "./store";
import type { CampRegistration } from "./types";

export async function submitCampRegistration(params: {
  db: Firestore;
  input: CampRegistrationSubmitInput;
  actorUid: string;
  actorRole: UserRole;
}): Promise<
  | { ok: true; registration: CampRegistration }
  | { ok: false; status: number; error: string }
> {
  const { db, input, actorUid, actorRole } = params;
  const camp = await getCamp(db, input.campId);
  if (!camp) {
    return { ok: false, status: 404, error: "Stage introuvable" };
  }

  const isStaff = isCampManager(actorRole);
  // Brouillon = configuration uniquement ; aucune inscription (y compris staff).
  if (camp.status === "draft") {
    return {
      ok: false,
      status: 403,
      error: "Ce stage est encore en brouillon — ouvrez-le pour accepter des inscriptions",
    };
  }
  if (!isStaff && camp.status !== "open") {
    return { ok: false, status: 403, error: "Les inscriptions à ce stage sont fermées" };
  }

  let clubRegistrationId = input.clubRegistrationId ?? null;
  let ownerUid = actorUid;

  if (clubRegistrationId) {
    const clubDoc = await db
      .collection(CLUB_REGISTRATIONS_COLLECTION)
      .doc(clubRegistrationId)
      .get();
    if (!clubDoc.exists) {
      return { ok: false, status: 400, error: "Dossier d’adhésion introuvable" };
    }
    const clubData = clubDoc.data() as Record<string, unknown>;
    if (isRejectedRegistration(clubData)) {
      return { ok: false, status: 400, error: "Dossier d’adhésion inactif" };
    }
    const submitterUid =
      typeof clubData.submitterUid === "string" ? clubData.submitterUid.trim() : "";
    if (submitterUid) {
      ownerUid = submitterUid;
    } else if (isStaff && input.ownerUid) {
      ownerUid = input.ownerUid;
    } else {
      return {
        ok: false,
        status: 400,
        error: "Ce dossier d’adhésion n’a pas de compte propriétaire",
      };
    }
  } else if (isStaff) {
    if (!input.ownerUid) {
      return {
        ok: false,
        status: 400,
        error:
          "Indiquez un adhérent (recherche) ou l’UID du compte pour un non-licencié",
      };
    }
    ownerUid = input.ownerUid;
  }

  if (input.isClubMember && !clubRegistrationId) {
    const snap = await db
      .collection(CLUB_REGISTRATIONS_COLLECTION)
      .where("submitterUid", "==", ownerUid)
      .limit(5)
      .get();
    const active = snap.docs.find((doc) => {
      const status = doc.data()?.status;
      return status !== "cancelled" && status !== "rejected";
    });
    if (active) {
      clubRegistrationId = active.id;
    }
  }

  const slots = await getSlotsByIds(db, input.slotIds);
  if (slots.length !== input.slotIds.length) {
    return { ok: false, status: 400, error: "Un ou plusieurs créneaux sont invalides" };
  }
  const formula = findCampFormula(camp, input.formulaId, input.siteId);
  if (!formula) {
    return { ok: false, status: 400, error: "Formule introuvable sur ce stage" };
  }
  const site = camp.sites.find((s) => s.id === input.siteId);
  if (!site?.formulas.some((f) => f.id === formula.id)) {
    return { ok: false, status: 400, error: "Formule incompatible avec le site" };
  }

  for (const slot of slots) {
    if (slot.campId !== camp.id) {
      return { ok: false, status: 400, error: "Créneau hors de ce stage" };
    }
    if (slot.cancelled) {
      return { ok: false, status: 400, error: `Créneau annulé : ${slot.label}` };
    }
    if (slot.formulaId !== input.formulaId || slot.siteId !== input.siteId) {
      return { ok: false, status: 400, error: "Créneau incompatible avec la formule" };
    }
  }

  const pricingQuote = computeCampPricingQuote({
    pricing: camp.pricing,
    isClubMember: input.isClubMember,
    pricingMode: formula.pricingMode,
    slots,
  });

  const now = new Date().toISOString();
  const registration = await createCampRegistration(db, {
    campId: camp.id,
    schemaVersion: CAMP_SCHEMA_VERSION,
    status: "awaiting_payment",
    ownerUid,
    createdByUid: actorUid,
    createdByRole: actorRole,
    source: isStaff ? "staff" : "self",
    firstName: input.firstName,
    lastName: input.lastName,
    birthDate: input.birthDate,
    phone: input.phone,
    email: input.email,
    isClubMember: input.isClubMember,
    clubRegistrationId,
    formulaId: input.formulaId,
    formulaLabel: formula.label,
    siteId: input.siteId,
    siteLabel: input.siteLabel,
    slotIds: input.slotIds,
    pricingQuote,
    payment: {
      chosenMethod: input.chosenMethod,
      status: "waiting_payment",
      invoiceNumber: null,
      stripeCheckoutSessionId: null,
      stripeCheckoutUrl: null,
      receivedPayments: [],
    },
    submittedAt: now,
    updatedAt: now,
    cancelledAt: null,
  });

  return { ok: true, registration };
}
