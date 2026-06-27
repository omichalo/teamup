import type { Firestore } from "firebase-admin/firestore";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { getSectionById } from "@/lib/club-registration-config/helpers";
import type { ClubRegistrationPayload } from "@/lib/club-registration/build-payload-schema";
import { listSecretaryEmails } from "@/lib/club-registration/list-secretary-emails";
import { resolveRegistrationContactEmail } from "@/lib/club-registration/resolve-registration-contact-email";
import { getAppBaseUrl } from "@/lib/club-registration/stripe";
import { buildRegistrationCreatedSecretaryEmail } from "@/lib/email/registration-created-secretary-email";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import { sendMail } from "@/lib/mailer";
import { normalizeApplicantNotes } from "@/lib/club-registration/applicant-notes";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";

export async function notifySecretariesOfNewRegistration(params: {
  db: Firestore;
  req: Request;
  registrationId: string;
  payload: ClubRegistrationPayload;
  config: RegistrationConfigV1;
  submitterAccountEmail: string | null;
  isMinor: boolean;
}): Promise<void> {
  const secretaryEmails = await listSecretaryEmails(params.db);
  if (secretaryEmails.length === 0) {
    return;
  }

  const submitterEmailLower = params.submitterAccountEmail?.trim().toLowerCase() ?? null;
  const recipients = secretaryEmails.filter(
    (email) => submitterEmailLower === null || email.toLowerCase() !== submitterEmailLower
  );
  if (recipients.length === 0) {
    return;
  }

  const adherentName =
    formatPersonDisplayName(params.payload.firstName, params.payload.lastName) ||
    "adhérent";
  const section =
    getSectionById(params.config, params.payload.mainSectionId)?.label ??
    params.payload.mainSectionId;
  const ffttLicense = params.payload.ffttLicense?.trim() || null;
  const applicantNotes = normalizeApplicantNotes(params.payload.applicantNotes ?? "") || null;

  const mail = buildRegistrationCreatedSecretaryEmail({
    adherentName,
    birthDate: params.payload.birthDate,
    adherentRole: params.payload.adherentRole,
    sectionLabel: section,
    contactEmail: resolveRegistrationContactEmail({
      adherentEmail: params.payload.adherentEmail,
      representatives: params.payload.representatives,
    }),
    contactPhone: params.payload.adherentPhonePrimary,
    ffttLicense,
    isMinor: params.isMinor,
    submitterAccountEmail: params.submitterAccountEmail,
    applicantNotes,
    registrationId: params.registrationId,
    appOrigin: getAppBaseUrl(params.req),
  });

  await Promise.all(
    recipients.map(async (to) => {
      try {
        await sendMail({
          to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          attachments: [getSqyPingLogoAttachment()],
        });
      } catch (error) {
        console.error("[club-registration] notifySecretariesOfNewRegistration", error);
      }
    })
  );
}
