import { SQYPING_EMAIL_LOGO_CID } from "@/lib/email/logo-attachment";

/** Chemin relatif depuis `emails/preview/` vers le logo public. */
export const EMAIL_PREVIEW_LOGO_SRC = "../../public/sqyping-logo.jpg";

export const EMAIL_PREVIEW_APP_ORIGIN = "https://teamup.sqyping.fr";

export type EmailPreviewVariant = {
  id: string;
  label: string;
  filename: string;
  description: string;
};

export const EMAIL_PREVIEW_VARIANTS: EmailPreviewVariant[] = [
  {
    id: "registration-submitted",
    label: "Confirmation de soumission",
    filename: "registration-submitted.html",
    description: "Envoyé à l'adhérent après envoi du dossier.",
  },
  {
    id: "registration-created-secretary",
    label: "Nouveau dossier (secrétariat)",
    filename: "registration-created-secretary.html",
    description: "Envoyé aux secrétaires lorsqu'un dossier est à relire.",
  },
  {
    id: "verification",
    label: "Vérification e-mail",
    filename: "verification.html",
    description: "Envoyé à l'inscription ou au renvoi de vérification.",
  },
  {
    id: "password-reset",
    label: "Réinitialisation mot de passe",
    filename: "password-reset.html",
    description: "Envoyé depuis la page « mot de passe oublié ».",
  },
  {
    id: "payment-instructions-cheque",
    label: "Instructions de règlement (chèque)",
    filename: "payment-instructions-cheque.html",
    description: "Envoyé hors Stripe — règlement par chèque.",
  },
  {
    id: "payment-instructions-holiday",
    label: "Instructions de règlement (chèques vacances)",
    filename: "payment-instructions-holiday.html",
    description: "Envoyé hors Stripe — chèques vacances + complément.",
  },
  {
    id: "payment-instructions-card",
    label: "Instructions de règlement (carte / BNPL)",
    filename: "payment-instructions-card.html",
    description: "Hors Stripe automatique — rappel carte avec lien Stripe et option BNPL.",
  },
  {
    id: "payment-confirmed-stripe",
    label: "Paiement enregistré (Stripe)",
    filename: "payment-confirmed-stripe.html",
    description: "Envoyé après paiement CB en ligne (webhook Stripe).",
  },
  {
    id: "payment-confirmed-secretariat",
    label: "Paiement enregistré (secrétariat)",
    filename: "payment-confirmed-secretariat.html",
    description: "Envoyé quand le secrétariat marque le dossier comme entièrement payé.",
  },
  {
    id: "payment-detailed",
    label: "Demande de paiement (devis détaillé)",
    filename: "payment-detailed.html",
    description: "Envoyé par le secrétariat avec lignes de tarif.",
  },
  {
    id: "payment-legacy",
    label: "Demande de paiement (montant unique)",
    filename: "payment-legacy.html",
    description: "Variante sans détail de devis (mode legacy).",
  },
];

/** Remplace le CID SMTP par un chemin fichier pour prévisualisation locale. */
export function adaptEmailHtmlForFilePreview(
  html: string,
  logoSrc: string = EMAIL_PREVIEW_LOGO_SRC
): string {
  return html.replaceAll(`cid:${SQYPING_EMAIL_LOGO_CID}`, logoSrc);
}

export function buildEmailPreviewIndexHtml(variants: EmailPreviewVariant[]): string {
  const items = variants
    .map(
      (variant) => `
        <li>
          <a href="./${variant.filename}">${variant.label}</a>
          <p>${variant.description}</p>
        </li>
      `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Prévisualisation e-mails SQY Ping</title>
  <style>
    body {
      font-family: "Figtree", system-ui, sans-serif;
      margin: 0;
      padding: 40px 24px;
      background: #f6f7fb;
      color: #1f2233;
    }
    main {
      max-width: 640px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
    }
    h1 { margin-top: 0; color: #28306d; }
    ul { padding-left: 1.25rem; }
    li { margin-bottom: 1.25rem; }
    a { color: #28306d; font-weight: 600; text-decoration: none; }
    a:hover { text-decoration: underline; }
    p { margin: 0.35rem 0 0; color: #525871; font-size: 0.95rem; }
    code { background: #f6f7fb; padding: 2px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <main>
    <h1>Prévisualisation des e-mails transactionnels</h1>
    <p>Généré localement via <code>npm run email:preview</code>. Aucun e-mail n'est envoyé.</p>
    <ul>${items}</ul>
  </main>
</body>
</html>`;
}
