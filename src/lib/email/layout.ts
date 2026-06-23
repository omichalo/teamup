import {
  SQYPING_COLORS,
  SQYPING_EMAIL_APP_NAME,
  SQYPING_EMAIL_TAGLINE,
  SQYPING_GRADIENT,
  SQYPING_SECRETARIAT_EMAIL,
} from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import { SQYPING_EMAIL_LOGO_CID } from "@/lib/email/logo-attachment";

const FONT_STACK =
  '"Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export type EmailPrimaryAction = {
  label: string;
  url: string;
};

export type EmailNoticeVariant = "info" | "warning";

export type BuildSqyPingEmailLayoutOptions = {
  /** Titre affiché dans la balise <title> et le <h1>. */
  title: string;
  /** Texte de prévisualisation (inbox). */
  preheader?: string;
  /** Corps HTML (paragraphes, listes, tableaux…). */
  bodyHtml: string;
  /** URL publique de l'application (footer + liens). */
  appOrigin: string;
  /** Source du logo (défaut : CID pour envoi SMTP). */
  logoSrc?: string;
  /** Bouton d'action principal. */
  primaryAction?: EmailPrimaryAction;
  /** Lien brut affiché sous le bouton (auth). */
  fallbackLink?: string;
  /** Encart d'information ou d'avertissement. */
  noticeHtml?: string;
  noticeVariant?: EmailNoticeVariant;
};

function noticeStyles(variant: EmailNoticeVariant): {
  background: string;
  border: string;
  color: string;
} {
  if (variant === "warning") {
    return {
      background: "rgba(241, 134, 31, 0.10)",
      border: `4px solid ${SQYPING_COLORS.secondary.main}`,
      color: SQYPING_COLORS.text.primary,
    };
  }

  return {
    background: "rgba(40, 48, 109, 0.06)",
    border: `4px solid ${SQYPING_COLORS.primary.main}`,
    color: SQYPING_COLORS.text.primary,
  };
}

function renderPrimaryAction(action: EmailPrimaryAction): string {
  const label = escapeHtml(action.label);
  const url = escapeHtml(action.url);

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <a href="${url}" style="display: inline-block; padding: 14px 28px; background-color: ${SQYPING_COLORS.primary.main}; color: ${SQYPING_COLORS.primary.contrastText}; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 6px rgba(40, 48, 109, 0.25);">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function renderFallbackLink(link: string): string {
  const safeLink = escapeHtml(link);

  return `
    <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.6; color: ${SQYPING_COLORS.text.secondary};">
      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:
    </p>
    <p style="margin: 8px 0 0 0; font-size: 12px; line-height: 1.6; color: ${SQYPING_COLORS.primary.main}; word-break: break-all;">
      ${safeLink}
    </p>
  `;
}

function renderNotice(noticeHtml: string, variant: EmailNoticeVariant): string {
  const styles = noticeStyles(variant);

  return `
    <div style="margin: 28px 0; padding: 16px 18px; background-color: ${styles.background}; border-left: ${styles.border}; border-radius: 12px;">
      ${noticeHtml}
    </div>
  `;
}

/**
 * Enveloppe HTML commune à tous les e-mails transactionnels SQY Ping.
 * Couleurs et typo alignées sur `src/theme/sqyping-theme.ts`.
 */
export function buildSqyPingEmailLayout(
  options: BuildSqyPingEmailLayoutOptions
): string {
  const {
    title,
    preheader,
    bodyHtml,
    appOrigin,
    logoSrc = `cid:${SQYPING_EMAIL_LOGO_CID}`,
    primaryAction,
    fallbackLink,
    noticeHtml,
    noticeVariant = "info",
  } = options;

  const safeTitle = escapeHtml(title);
  const safeOrigin = escapeHtml(appOrigin.replace(/\/$/, ""));
  const year = new Date().getFullYear();
  const preheaderBlock = preheader
    ? `<span style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(preheader)}</span>`
    : "";

  const actionBlock = primaryAction ? renderPrimaryAction(primaryAction) : "";
  const fallbackBlock = fallbackLink ? renderFallbackLink(fallbackLink) : "";
  const noticeBlock = noticeHtml ? renderNotice(noticeHtml, noticeVariant) : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} - ${escapeHtml(SQYPING_EMAIL_APP_NAME)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&amp;display=swap" rel="stylesheet" />
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${SQYPING_COLORS.surface.background}; font-family: ${FONT_STACK}; color: ${SQYPING_COLORS.text.primary};">
  ${preheaderBlock}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${SQYPING_COLORS.surface.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: ${SQYPING_COLORS.surface.paper}; border-radius: 16px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); overflow: hidden;">
          <tr>
            <td style="height: 4px; background: ${SQYPING_GRADIENT}; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="padding: 36px 24px 20px 24px; background-color: ${SQYPING_COLORS.primary.main};">
              <img src="${logoSrc}" alt="SQY Ping" width="112" height="112" style="display: block; border-radius: 12px; background-color: rgba(255, 255, 255, 0.96); padding: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);" />
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h1 style="margin: 0 0 20px 0; font-size: 26px; font-weight: 700; line-height: 1.3; color: ${SQYPING_COLORS.primary.main}; text-align: center;">
                ${safeTitle}
              </h1>
              ${bodyHtml}
              ${actionBlock}
              ${fallbackBlock}
              ${noticeBlock}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: ${SQYPING_COLORS.surface.background}; border-top: 1px solid ${SQYPING_COLORS.surface.divider};">
              <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; color: ${SQYPING_COLORS.text.secondary}; text-align: center;">
                <strong style="color: ${SQYPING_COLORS.text.primary};">${escapeHtml(SQYPING_EMAIL_APP_NAME)}</strong><br />
                ${escapeHtml(SQYPING_EMAIL_TAGLINE)}
              </p>
              <p style="margin: 12px 0 0 0; font-size: 12px; line-height: 1.6; color: ${SQYPING_COLORS.text.secondary}; text-align: center;">
                © ${year} SQY Ping. Tous droits réservés.<br />
                <a href="${safeOrigin}" style="color: ${SQYPING_COLORS.primary.main}; text-decoration: none;">${safeOrigin}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="height: 4px; background: ${SQYPING_GRADIENT}; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailParagraph(html: string): string {
  return `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.65; color: ${SQYPING_COLORS.text.primary};">${html}</p>`;
}

export function emailMutedParagraph(html: string): string {
  return `<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${SQYPING_COLORS.text.secondary};">${html}</p>`;
}

export function emailSectionTitle(label: string): string {
  return `<p style="margin: 24px 0 12px 0; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${SQYPING_COLORS.text.secondary};">${escapeHtml(label)}</p>`;
}

/** Lien mailto vers le secrétariat (HTML e-mail). */
export function emailSecretariatMailtoLink(): string {
  const safeEmail = escapeHtml(SQYPING_SECRETARIAT_EMAIL);

  return `<a href="mailto:${safeEmail}" style="color: ${SQYPING_COLORS.primary.main}; text-decoration: none;">${safeEmail}</a>`;
}

/** Phrase standard de contact secrétariat (HTML). */
export function emailSecretariatContactHtml(
  prefix = "Pour toute question, contactez le secrétariat par e-mail à"
): string {
  return `${prefix}&nbsp;${emailSecretariatMailtoLink()}.`;
}

/** Phrase standard de contact secrétariat (texte brut). */
export function emailSecretariatContactText(
  prefix = "Pour toute question, contactez le secrétariat par e-mail à"
): string {
  return `${prefix} ${SQYPING_SECRETARIAT_EMAIL}.`;
}
