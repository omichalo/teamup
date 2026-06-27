import type { Firestore } from "firebase-admin/firestore";
import type {
  SuggestionCategory,
  SuggestionKind,
  SuggestionStatus,
} from "@/lib/app-suggestions/types";
import { getSuggestionDescriptionExcerpt } from "@/lib/app-suggestions/rich-text";
import {
  getUserEmailByUid,
  listAppMaintainerEmails,
} from "@/lib/app-suggestions/user-email";
import {
  buildSuggestionCommentEmail,
  buildSuggestionCreatedMaintainerEmail,
  buildSuggestionMaintainerNoteEmail,
  buildSuggestionStatusChangedEmail,
} from "@/lib/email/suggestion-emails";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import { sendMail } from "@/lib/mailer";
import { getAppBaseUrl } from "@/lib/club-registration/stripe";

async function sendSuggestionMail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  logContext: string;
}): Promise<void> {
  try {
    await sendMail({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: [getSqyPingLogoAttachment()],
    });
  } catch (error) {
    console.error(`[app-suggestions] ${options.logContext}`, error);
  }
}

export async function notifyMaintainersOfNewSuggestion(params: {
  db: Firestore;
  req: Request;
  suggestionId: string;
  title: string;
  category: SuggestionCategory;
  kind: SuggestionKind;
  description: string;
  descriptionFormat?: "html" | "plain";
  submitterUid: string;
  submitterDisplayName: string | null;
}): Promise<void> {
  const appOrigin = getAppBaseUrl(params.req);
  const maintainerEmails = await listAppMaintainerEmails(params.db);
  if (maintainerEmails.length === 0) {
    return;
  }

  const submitterEmail = await getUserEmailByUid(params.submitterUid);
  const submitterEmailLower = submitterEmail?.toLowerCase() ?? null;

  const mail = buildSuggestionCreatedMaintainerEmail({
    title: params.title,
    suggestionId: params.suggestionId,
    appOrigin,
    kind: params.kind,
    category: params.category,
    submitterDisplayName: params.submitterDisplayName,
    descriptionExcerpt: getSuggestionDescriptionExcerpt(
      params.description,
      params.descriptionFormat === "html" ? "html" : "plain"
    ),
  });

  await Promise.all(
    maintainerEmails
      .filter(
        (email) =>
          submitterEmailLower === null ||
          email.toLowerCase() !== submitterEmailLower
      )
      .map((to) =>
        sendSuggestionMail({
          to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          logContext: "notifyMaintainersOfNewSuggestion",
        })
      )
  );
}

export async function notifyAuthorOfMaintainerUpdate(params: {
  req: Request;
  submitterUid: string;
  title: string;
  suggestionId: string;
  previousStatus: SuggestionStatus;
  newStatus: SuggestionStatus;
  previousMaintainerNote: string | null;
  newMaintainerNote: string | null;
  maintainerDisplayName: string | null;
  maintainerUid: string;
}): Promise<void> {
  if (params.maintainerUid === params.submitterUid) {
    return;
  }

  const authorEmail = await getUserEmailByUid(params.submitterUid);
  if (!authorEmail) {
    return;
  }

  const appOrigin = getAppBaseUrl(params.req);
  const tasks: Promise<void>[] = [];

  if (params.newStatus !== params.previousStatus) {
    const mail = buildSuggestionStatusChangedEmail({
      title: params.title,
      suggestionId: params.suggestionId,
      appOrigin,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      maintainerDisplayName: params.maintainerDisplayName,
    });
    tasks.push(
      sendSuggestionMail({
        to: authorEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        logContext: "notifyAuthorOfMaintainerUpdate:status",
      })
    );
  }

  const previousNote = (params.previousMaintainerNote ?? "").trim();
  const newNote = (params.newMaintainerNote ?? "").trim();
  if (newNote.length > 0 && newNote !== previousNote) {
    const mail = buildSuggestionMaintainerNoteEmail({
      title: params.title,
      suggestionId: params.suggestionId,
      appOrigin,
      maintainerNote: newNote,
      maintainerDisplayName: params.maintainerDisplayName,
    });
    tasks.push(
      sendSuggestionMail({
        to: authorEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        logContext: "notifyAuthorOfMaintainerUpdate:note",
      })
    );
  }

  await Promise.all(tasks);
}

export async function notifyAuthorOfNewComment(params: {
  req: Request;
  submitterUid: string;
  authorUid: string;
  title: string;
  suggestionId: string;
  authorDisplayName: string | null;
  commentBody: string;
  commentBodyFormat?: "html" | "plain";
}): Promise<void> {
  if (params.authorUid === params.submitterUid) {
    return;
  }

  const authorEmail = await getUserEmailByUid(params.submitterUid);
  if (!authorEmail) {
    return;
  }

  const appOrigin = getAppBaseUrl(params.req);
  const mail = buildSuggestionCommentEmail({
    title: params.title,
    suggestionId: params.suggestionId,
    appOrigin,
    authorDisplayName: params.authorDisplayName,
    commentExcerpt: getSuggestionDescriptionExcerpt(
      params.commentBody,
      params.commentBodyFormat === "html" ? "html" : "plain"
    ),
  });

  await sendSuggestionMail({
    to: authorEmail,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    logContext: "notifyAuthorOfNewComment",
  });
}
