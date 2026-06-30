export const runtime = "nodejs";

import { FieldValue } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { calculateQuoteForRecord } from "@/lib/club-registration-config/pricing-resolve";
import {
  readVoluntaryDonationCents,
  resolveRegistrationDonationPricing,
} from "@/lib/club-registration/resolve-registration-donation";
import type { PriceQuote } from "@/lib/pricing/types";

const COLLECTION = "clubRegistrations";

const PRICING_INPUT_FIELDS = [
  "birthDate",
  "mainSectionId",
  "slotIds",
  "additionalSectionIds",
  "wantsCompetitorExtras",
  "wantsOptionalJersey",
  "competitionIds",
  "familyRegistrationOrder",
  "sex",
  "firstFemaleRegistrationSqy",
  "handisportPracticeLevel",
  "reductionTypes",
] as const;

function pickPricingFields(body: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of PRICING_INPUT_FIELDS) {
    if (body[key] !== undefined) {
      picked[key] = body[key];
    }
  }
  return picked;
}

async function computeQuoteFromRecord(
  record: Record<string, unknown>
): Promise<{ quote: PriceQuote } | { error: string }> {
  const quote = await calculateQuoteForRecord(record);
  if (!quote) {
    return { error: "Date de naissance manquante ou invalide pour le calcul tarifaire." };
  }
  return { quote };
}

/** GET — devis calculé à partir du dossier enregistré. */
export const GET = withAuth(
  async (_req: Request, context: unknown) => {
    try {
      const { params } = context as { params: Promise<{ id: string }> };
      const { id } = await params;
      const db = getFirestoreAdmin();
      const snap = await db.collection(COLLECTION).doc(id).get();
      if (!snap.exists) {
        return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
      }

      const data = snap.data() ?? {};
      const result = await computeQuoteFromRecord(data);
      if ("error" in result) {
        return jsonNoStore({ error: result.error }, { status: 400 });
      }

      return jsonNoStore(
        {
          quote: result.quote,
          storedQuote: data.pricingQuote ?? null,
          pricingQuoteStatus: data.pricingQuoteStatus ?? null,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("[api/club/registration/pricing GET]", error);
      return jsonNoStore({ error: "Impossible de calculer le devis" }, { status: 500 });
    }
  },
  [USER_ROLES.ADMIN, USER_ROLES.SECRETARY]
);

/**
 * POST — recalcule à partir du dossier + champs optionnels (formulaire admin),
 * persiste le snapshot et peut aligner `paymentAmountCents` sur le total.
 */
export const POST = withAuth(
  async (req: Request, context: unknown) => {
    try {
      if (!validateOrigin(req)) {
        return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
      }

      const { params, decoded } = context as {
        params: Promise<{ id: string }>;
        decoded: { uid: string };
      };
      const { id } = await params;
      const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
      const persist = body.persist === true;
      const applyPaymentAmount = body.applyPaymentAmount === true;

      const db = getFirestoreAdmin();
      const docRef = db.collection(COLLECTION).doc(id);
      const snap = await docRef.get();
      if (!snap.exists) {
        return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
      }

      const merged = { ...(snap.data() ?? {}), ...pickPricingFields(body) };
      const result = await computeQuoteFromRecord(merged);
      if ("error" in result) {
        return jsonNoStore({ error: result.error }, { status: 400 });
      }

      const { quote } = result;

      if (persist) {
        const patch: Record<string, unknown> = {
          pricingQuote: quote,
          pricingQuoteStatus: "proposed",
          pricingQuoteComputedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (applyPaymentAmount && quote.totalCents > 0) {
          const donation = resolveRegistrationDonationPricing(quote, merged);
          patch.paymentAmountCents = donation.invoiceTotalCents;
          patch.donationDiscountCents = donation.donationDiscountCents;
        }
        if (body.handisportPracticeLevel !== undefined) {
          patch.handisportPracticeLevel = body.handisportPracticeLevel;
        }

        await docRef.set(patch, { merge: true });

        logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_UPDATED, decoded.uid, {
          resource: "clubRegistration",
          resourceId: id,
          details: {
            action: "pricing_recalculated",
            totalCents: quote.totalCents,
            applyPaymentAmount,
          },
          success: true,
        });
      }

      const donationCents = readVoluntaryDonationCents(merged);
      const paymentAmountCents =
        applyPaymentAmount && result.quote.totalCents > 0
          ? resolveRegistrationDonationPricing(result.quote, merged).invoiceTotalCents
          : undefined;

      return jsonNoStore(
        {
          quote: result.quote,
          persisted: persist,
          paymentAmountCents,
          voluntaryDonationCents: donationCents,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("[api/club/registration/pricing POST]", error);
      return jsonNoStore({ error: "Impossible de calculer le devis" }, { status: 500 });
    }
  },
  [USER_ROLES.ADMIN, USER_ROLES.SECRETARY]
);
