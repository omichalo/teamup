export const runtime = "nodejs";

import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, USER_ROLES } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  linkRegistrationAccount,
  normalizeLinkTargetEmail,
} from "@/lib/club-registration/link-registration-account";
import { buildRegistrationAccountLinkedEmail } from "@/lib/email/registration-account-linked-email";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import { sendMail } from "@/lib/mailer";
import { getAppBaseUrl } from "@/lib/club-registration/stripe";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";

const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

/**
 * POST /api/club/registration/[id]/link-account — associe (remplace) le compte
 * portail d'un dossier (admin / secrétariat). Corps : `{ targetEmail }`.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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
    if (!hasAnyRole(role, MANAGER_ROLES)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id?.trim()) {
      return jsonNoStore({ error: "Identifiant de dossier requis" }, { status: 400 });
    }

    const rate = checkRateLimit(
      `club-registration-link-account:${decoded.uid}`,
      30,
      60 * 60 * 1000
    );
    if (!rate.allowed) {
      return jsonNoStore(
        {
          error:
            "Trop d'associations de compte dans la période autorisée. Réessayez plus tard.",
        },
        { status: 429 }
      );
    }

    const body = ((await req.json().catch(() => ({}))) ?? {}) as {
      targetEmail?: unknown;
    };
    const targetEmail = normalizeLinkTargetEmail(body.targetEmail);
    if (!targetEmail) {
      return jsonNoStore(
        { error: "Indiquez l'e-mail d'un compte TeamUp existant." },
        { status: 400 }
      );
    }

    let targetUser;
    try {
      targetUser = await adminAuth.getUserByEmail(targetEmail);
    } catch {
      return jsonNoStore(
        {
          error:
            "Aucun compte TeamUp avec cet e-mail. L'adhérent doit d'abord créer son compte.",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const result = await linkRegistrationAccount({
      db: getFirestoreAdmin(),
      registrationId: id,
      actorUid: decoded.uid,
      target: {
        uid: targetUser.uid,
        email: targetUser.email ?? targetEmail,
      },
    });

    if (!result.ok) {
      return jsonNoStore(
        {
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        },
        { status: result.status }
      );
    }

    const db = getFirestoreAdmin();
    const snap = await db.collection("clubRegistrations").doc(id).get();
    const data = snap.data() ?? {};
    const adherentName =
      formatPersonDisplayName(
        typeof data.firstName === "string" ? data.firstName : undefined,
        typeof data.lastName === "string" ? data.lastName : undefined
      ) || "adhérent";

    try {
      const mail = buildRegistrationAccountLinkedEmail({
        adherentName,
        registrationId: id,
        appOrigin: getAppBaseUrl(req),
      });
      await sendMail({
        to: result.targetEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        attachments: [getSqyPingLogoAttachment()],
      });
    } catch (emailError) {
      console.error(
        "[api/club/registration/[id]/link-account] notify email",
        emailError
      );
    }

    return jsonNoStore(
      {
        success: true,
        linkedAccountUids: result.linkedAccountUids,
        linkedAccountEmails: result.linkedAccountEmails,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/registration/[id]/link-account]", error);
    return jsonNoStore(
      { error: "Impossible d'associer le compte au dossier" },
      { status: 500 }
    );
  }
}
