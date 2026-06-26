import type { AdherentRole } from "@/lib/club-registration/schema";
import { buildRegistrationManagerDetailUrl } from "@/lib/club-registration/registration-manager-url";
import { SQYPING_EMAIL_APP_NAME } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildSqyPingEmailLayout,
  emailMutedParagraph,
  emailParagraph,
  emailSectionTitle,
} from "@/lib/email/layout";

const ADHERENT_ROLE_LABELS: Record<AdherentRole, string> = {
  self: "L'adhérent lui-même",
  minor_dependent: "Mineur représenté légalement",
  other_adult: "Autre adulte",
};

export type RegistrationCreatedSecretaryEmailContent = {
  adherentName: string;
  birthDate: string;
  adherentRole: AdherentRole;
  sectionLabel: string;
  contactEmail: string | null;
  contactPhone: string;
  ffttLicense: string | null;
  isMinor: boolean;
  submitterAccountEmail: string | null;
  applicantNotes: string | null;
  registrationId: string;
  appOrigin: string;
};

function formatBirthDateFr(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    return isoDate;
  }
  return `${day}/${month}/${year}`;
}

function emailInfoLine(label: string, value: string): string {
  return emailParagraph(
    `<strong>${escapeHtml(label)}</strong>&nbsp;: ${escapeHtml(value)}`
  );
}

function buildInfoLines(options: RegistrationCreatedSecretaryEmailContent): string[] {
  const lines: string[] = [
    emailInfoLine("Nom", options.adherentName),
    emailInfoLine("Date de naissance", formatBirthDateFr(options.birthDate)),
    emailInfoLine("Situation", ADHERENT_ROLE_LABELS[options.adherentRole]),
    emailInfoLine("Section", options.sectionLabel),
    emailInfoLine("Téléphone", options.contactPhone),
    emailInfoLine("Mineur", options.isMinor ? "Oui" : "Non"),
  ];

  if (options.contactEmail) {
    lines.push(emailInfoLine("E-mail de contact", options.contactEmail));
  }
  if (options.ffttLicense) {
    lines.push(emailInfoLine("Licence FFTT", options.ffttLicense));
  }
  if (options.submitterAccountEmail) {
    lines.push(emailInfoLine("Compte ayant envoyé le dossier", options.submitterAccountEmail));
  }

  lines.push(emailInfoLine("Référence dossier", options.registrationId));
  return lines;
}

export function buildRegistrationCreatedSecretaryEmail(
  options: RegistrationCreatedSecretaryEmailContent
): { html: string; text: string; subject: string } {
  const dossierUrl = buildRegistrationManagerDetailUrl(
    options.appOrigin,
    options.registrationId
  );
  const safeName = escapeHtml(options.adherentName);
  const notes = options.applicantNotes?.trim() ?? "";

  const bodyHtml = [
    emailParagraph("Bonjour,"),
    emailParagraph(
      `Un nouveau dossier d'adhésion pour <strong>${safeName}</strong> vient d'être déposé sur <strong>${escapeHtml(SQYPING_EMAIL_APP_NAME)}</strong> et attend une relecture.`
    ),
    emailSectionTitle("Informations de l'adhérent"),
    ...buildInfoLines(options),
    ...(notes.length > 0
      ? [
          emailSectionTitle("Précisions de l'inscrit"),
          emailMutedParagraph(escapeHtml(notes)),
        ]
      : []),
    emailMutedParagraph(
      "Connectez-vous pour vérifier le tarif, les pièces et le mode de paiement avant de valider le dossier."
    ),
  ].join("");

  const textLines = [
    "Bonjour,",
    "",
    `Nouveau dossier d'adhésion pour ${options.adherentName} — à relire.`,
    "",
    `Nom : ${options.adherentName}`,
    `Date de naissance : ${formatBirthDateFr(options.birthDate)}`,
    `Situation : ${ADHERENT_ROLE_LABELS[options.adherentRole]}`,
    `Section : ${options.sectionLabel}`,
    `Téléphone : ${options.contactPhone}`,
    `Mineur : ${options.isMinor ? "Oui" : "Non"}`,
  ];

  if (options.contactEmail) {
    textLines.push(`E-mail de contact : ${options.contactEmail}`);
  }
  if (options.ffttLicense) {
    textLines.push(`Licence FFTT : ${options.ffttLicense}`);
  }
  if (options.submitterAccountEmail) {
    textLines.push(`Compte ayant envoyé le dossier : ${options.submitterAccountEmail}`);
  }
  textLines.push(`Référence dossier : ${options.registrationId}`);

  if (notes.length > 0) {
    textLines.push("", "Précisions de l'inscrit :", notes);
  }

  textLines.push("", `Ouvrir le dossier : ${dossierUrl}`, "", SQYPING_EMAIL_APP_NAME);

  const html = buildSqyPingEmailLayout({
    title: "Nouveau dossier à relire",
    preheader: `Nouvelle adhésion : ${options.adherentName}`,
    bodyHtml,
    appOrigin: options.appOrigin,
    primaryAction: {
      label: "Ouvrir le dossier",
      url: dossierUrl,
    },
    fallbackLink: dossierUrl,
  });

  return {
    html,
    text: textLines.join("\n"),
    subject: `Nouveau dossier à relire — ${options.adherentName}`,
  };
}
