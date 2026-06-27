import { formatSuggestionCategoryLabel, SUGGESTION_STATUS_LABELS } from "@/lib/app-suggestions/status";
import { buildSuggestionDetailUrl } from "@/lib/app-suggestions/suggestion-url";
import type {
  SuggestionCategory,
  SuggestionKind,
  SuggestionStatus,
} from "@/lib/app-suggestions/types";
import { SQYPING_EMAIL_APP_NAME } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildSqyPingEmailLayout,
  emailMutedParagraph,
  emailParagraph,
} from "@/lib/email/layout";

type SuggestionEmailBase = {
  title: string;
  suggestionId: string;
  appOrigin: string;
};

function suggestionAction(base: SuggestionEmailBase) {
  const url = buildSuggestionDetailUrl(base.appOrigin, base.suggestionId);
  return {
    url,
    label: "Voir le retour",
  };
}

const CREATED_EMAIL_COPY: Record<
  SuggestionKind,
  {
    intro: string;
    layoutTitle: string;
    preheaderPrefix: string;
    subjectPrefix: string;
    textVerb: string;
  }
> = {
  improvement: {
    intro: "a déposé une nouvelle idée d'amélioration",
    layoutTitle: "Nouvelle idée d'amélioration",
    preheaderPrefix: "Nouvelle idée",
    subjectPrefix: "Nouvelle idée",
    textVerb: "a déposé une nouvelle idée",
  },
  problem: {
    intro: "a signalé un nouveau problème",
    layoutTitle: "Nouvelle remontée de problème",
    preheaderPrefix: "Nouveau problème",
    subjectPrefix: "Nouveau problème",
    textVerb: "a signalé un problème",
  },
};

export function buildSuggestionCreatedMaintainerEmail(options: {
  title: string;
  suggestionId: string;
  appOrigin: string;
  kind: SuggestionKind;
  category: SuggestionCategory;
  submitterDisplayName: string | null;
  descriptionExcerpt: string;
}): { html: string; text: string; subject: string } {
  const copy = CREATED_EMAIL_COPY[options.kind];
  const safeTitle = escapeHtml(options.title);
  const author = escapeHtml(options.submitterDisplayName || "Un membre du staff");
  const category = escapeHtml(formatSuggestionCategoryLabel(options.category));
  const excerpt = escapeHtml(options.descriptionExcerpt);
  const action = suggestionAction(options);

  const bodyHtml = [
    emailParagraph("Bonjour,"),
    emailParagraph(
      `<strong>${author}</strong> ${copy.intro} sur <strong>${escapeHtml(SQYPING_EMAIL_APP_NAME)}</strong>.`
    ),
    emailParagraph(`<strong>${safeTitle}</strong> · ${category}`),
    emailMutedParagraph(excerpt),
  ].join("");

  const html = buildSqyPingEmailLayout({
    title: copy.layoutTitle,
    preheader: `${copy.preheaderPrefix} : ${options.title}`,
    bodyHtml,
    appOrigin: options.appOrigin,
    primaryAction: action,
    fallbackLink: action.url,
  });

  const text = [
    "Bonjour,",
    "",
    `${options.submitterDisplayName || "Un membre du staff"} ${copy.textVerb} : ${options.title} (${formatSuggestionCategoryLabel(options.category)}).`,
    options.descriptionExcerpt,
    "",
    `${action.label} : ${action.url}`,
  ].join("\n");

  return {
    html,
    text,
    subject: `${copy.subjectPrefix} — ${options.title}`,
  };
}

export function buildSuggestionStatusChangedEmail(options: {
  title: string;
  suggestionId: string;
  appOrigin: string;
  previousStatus: SuggestionStatus;
  newStatus: SuggestionStatus;
  maintainerDisplayName: string | null;
}): { html: string; text: string; subject: string } {
  const safeTitle = escapeHtml(options.title);
  const by = escapeHtml(options.maintainerDisplayName || "L'équipe technique");
  const previous = escapeHtml(SUGGESTION_STATUS_LABELS[options.previousStatus]);
  const next = escapeHtml(SUGGESTION_STATUS_LABELS[options.newStatus]);
  const action = suggestionAction(options);

  const bodyHtml = [
    emailParagraph("Bonjour,"),
    emailParagraph(
      `Le suivi de votre idée <strong>${safeTitle}</strong> a été mis à jour sur <strong>${escapeHtml(SQYPING_EMAIL_APP_NAME)}</strong>.`
    ),
    emailParagraph(`Statut : <strong>${previous}</strong> → <strong>${next}</strong>`),
    emailMutedParagraph(`Mise à jour par ${by}.`),
  ].join("");

  const html = buildSqyPingEmailLayout({
    title: "Mise à jour de votre idée",
    preheader: `${options.title} : ${SUGGESTION_STATUS_LABELS[options.newStatus]}`,
    bodyHtml,
    appOrigin: options.appOrigin,
    primaryAction: action,
    fallbackLink: action.url,
  });

  const text = [
    "Bonjour,",
    "",
    `Votre idée « ${options.title} » est passée de « ${SUGGESTION_STATUS_LABELS[options.previousStatus]} » à « ${SUGGESTION_STATUS_LABELS[options.newStatus]} ».`,
    `Mise à jour par ${options.maintainerDisplayName || "l'équipe technique"}.`,
    "",
    `${action.label} : ${action.url}`,
  ].join("\n");

  return {
    html,
    text,
    subject: `Idée mise à jour — ${options.title}`,
  };
}

export function buildSuggestionMaintainerNoteEmail(options: {
  title: string;
  suggestionId: string;
  appOrigin: string;
  maintainerNote: string;
  maintainerDisplayName: string | null;
}): { html: string; text: string; subject: string } {
  const safeTitle = escapeHtml(options.title);
  const by = escapeHtml(options.maintainerDisplayName || "L'équipe technique");
  const note = escapeHtml(options.maintainerNote);
  const action = suggestionAction(options);

  const bodyHtml = [
    emailParagraph("Bonjour,"),
    emailParagraph(
      `L'équipe technique a ajouté une note sur votre idée <strong>${safeTitle}</strong>.`
    ),
    emailParagraph(`<em>${note}</em>`),
    emailMutedParagraph(`Note de ${by}.`),
  ].join("");

  const html = buildSqyPingEmailLayout({
    title: "Réponse de l'équipe technique",
    preheader: `Note sur votre idée : ${options.title}`,
    bodyHtml,
    appOrigin: options.appOrigin,
    primaryAction: action,
    fallbackLink: action.url,
  });

  const text = [
    "Bonjour,",
    "",
    `Note de l'équipe sur « ${options.title} » :`,
    options.maintainerNote,
    "",
    `Par ${options.maintainerDisplayName || "l'équipe technique"}.`,
    "",
    `${action.label} : ${action.url}`,
  ].join("\n");

  return {
    html,
    text,
    subject: `Réponse équipe — ${options.title}`,
  };
}

export function buildSuggestionCommentEmail(options: {
  title: string;
  suggestionId: string;
  appOrigin: string;
  authorDisplayName: string | null;
  commentExcerpt: string;
}): { html: string; text: string; subject: string } {
  const safeTitle = escapeHtml(options.title);
  const author = escapeHtml(options.authorDisplayName || "Un membre du staff");
  const excerpt = escapeHtml(options.commentExcerpt);
  const action = suggestionAction(options);

  const bodyHtml = [
    emailParagraph("Bonjour,"),
    emailParagraph(
      `<strong>${author}</strong> a commenté votre idée <strong>${safeTitle}</strong>.`
    ),
    emailMutedParagraph(excerpt),
  ].join("");

  const html = buildSqyPingEmailLayout({
    title: "Nouveau commentaire",
    preheader: `Commentaire sur ${options.title}`,
    bodyHtml,
    appOrigin: options.appOrigin,
    primaryAction: action,
    fallbackLink: action.url,
  });

  const text = [
    "Bonjour,",
    "",
    `${options.authorDisplayName || "Un membre du staff"} a commenté votre idée « ${options.title} ».`,
    options.commentExcerpt,
    "",
    `${action.label} : ${action.url}`,
  ].join("\n");

  return {
    html,
    text,
    subject: `Nouveau commentaire — ${options.title}`,
  };
}
