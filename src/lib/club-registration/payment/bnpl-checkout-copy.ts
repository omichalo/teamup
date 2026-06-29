/** Textes utilisateur — paiement fractionné (BNPL) via Stripe Checkout (Alma, Klarna, etc.). */

/** Message adhérent après choix « carte bancaire » (wizard). */
export const BNPL_ADHERENT_WIZARD_MESSAGE =
  "Après validation de votre dossier, un lien de paiement Stripe vous sera envoyé par e-mail. Sur la page sécurisée Stripe, vous pourrez régler en une fois par carte bancaire ou en plusieurs fois sans frais via un partenaire de paiement fractionné proposé par Stripe (selon votre éligibilité).";

/** Paragraphe e-mail de demande de paiement (HTML + texte). */
export const BNPL_PAYMENT_REQUEST_PARAGRAPH =
  "Sur la page de paiement, vous pourrez régler en une fois par carte bancaire ou en plusieurs fois sans frais via un partenaire BNPL proposé par Stripe (selon votre éligibilité).";

/** Notice courte e-mail de demande de paiement (HTML). */
export const BNPL_PAYMENT_REQUEST_NOTICE =
  "Carte bancaire ou paiement en plusieurs fois (BNPL) sur Stripe.";

/** Ligne texte brut e-mail de demande de paiement. */
export const BNPL_PAYMENT_REQUEST_TEXT_LINE =
  "Paiement sécurisé Stripe (carte ou BNPL selon éligibilité) :";

/** Instructions carte (e-mail hors lien auto — HTML). */
export const BNPL_INSTRUCTIONS_CARD_HTML =
  "Le secrétariat vous enverra un lien de paiement Stripe ; vous pourrez régler en une fois ou en plusieurs fois sans frais via un partenaire BNPL (selon éligibilité).";

/** Instructions carte (e-mail — texte brut). */
export const BNPL_INSTRUCTIONS_CARD_TEXT =
  "Sur la page Stripe, vous pourrez payer en une fois ou en plusieurs fois sans frais via un partenaire BNPL (selon éligibilité).";

/** Alert secrétariat — demandes d'adhésion. */
export const BNPL_SECRETARIAT_ALERT =
  "L'adhérent pourra payer en une fois ou en plusieurs fois sans frais via un partenaire BNPL sur la page Stripe, selon son éligibilité.";

/** Tooltip bouton « Valider et demander le paiement ». */
export const BNPL_SECRETARIAT_PAYMENT_TOOLTIP =
  "Enregistre le dossier puis envoie un e-mail au contact avec un lien sécurisé Stripe (carte ou BNPL sur Checkout).";

/** Sous-titre page secrétariat — demandes d'adhésion. */
export const BNPL_SECRETARIAT_PAGE_SUBTITLE =
  "Relisez le dossier, vérifiez le montant, puis demandez le paiement : un e-mail avec lien Stripe part pour la carte bancaire (une fois ou BNPL sur la page Stripe, selon éligibilité). Les autres modes sont suivis manuellement dans le tableau ci-dessous.";

/** Chaîne attendue dans les tests e-mail (repère stable). */
export const BNPL_COPY_TEST_MARKER = "BNPL";

/** Validité d'un lien Stripe Checkout. */
export const CHECKOUT_LINK_VALIDITY_NOTICE =
  "Ce lien de paiement est valable 24 heures.";

/** Validité du lien Stripe ouvert depuis Mes dossiers. */
export const CHECKOUT_LINK_VALIDITY_FROM_MES_DOSSIERS_NOTICE =
  "Sur Mes dossiers, le lien Stripe ouvert via « Payer en ligne » est valable 24 heures.";

/** Bouton principal e-mail demande de paiement. */
export const PAYMENT_EMAIL_CTA_LABEL = "Finaliser mon adhésion";

/** E-mail — instruction après le détail du devis. */
export const PAYMENT_EMAIL_HUB_INSTRUCTION_HTML =
  "Connectez-vous à votre espace <strong>Mes dossiers</strong>, puis cliquez sur <strong>Payer en ligne</strong> pour accéder à la page sécurisée Stripe.";

/** E-mail — instruction (texte brut). */
export const PAYMENT_EMAIL_HUB_INSTRUCTION_TEXT =
  "Connectez-vous à Mes dossiers sur TeamUp, puis cliquez sur « Payer en ligne » pour régler sur Stripe.";

/** Alerte Mes dossiers — arrivée depuis l'e-mail de paiement. */
export const ADHERENT_PAYMENT_EMAIL_LANDING_ALERT =
  "Votre dossier est prêt à être réglé. Utilisez le bouton « Payer en ligne » sur la fiche ci-dessous.";

/** E-mail demande de paiement — alternative Mes dossiers (HTML). */
export const SELF_SERVICE_MES_INSCRIPTIONS_EMAIL_HTML =
  "Vous pouvez aussi payer depuis votre espace <strong>Mes dossiers</strong> sur TeamUp.";

/** E-mail demande de paiement — alternative Mes dossiers (texte). */
export const SELF_SERVICE_MES_INSCRIPTIONS_EMAIL_TEXT =
  "Vous pouvez aussi payer depuis Mes dossiers sur TeamUp :";

/** Bouton adhérent — Mes dossiers. */
export const ADHERENT_PAY_ONLINE_BUTTON_LABEL = "Payer en ligne";

/** Aide sous le bouton adhérent. */
export const ADHERENT_PAY_ONLINE_HELPER =
  "Paiement sécurisé Stripe. Carte ou paiement en plusieurs fois (BNPL) selon éligibilité.";

/** Dossier en attente hors carte bancaire. */
export const ADHERENT_NON_CARD_PAYMENT_HINT =
  "Les instructions de règlement vous ont été envoyées par e-mail.";

/** Alerte liste Mes dossiers — paiement en attente. */
export const ADHERENT_PAYMENT_PENDING_ALERT =
  "Un ou plusieurs dossiers attendent votre règlement pour finaliser l'inscription.";

/** Bouton secrétariat — premier envoi. */
export const SECRETARIAT_INITIAL_PAYMENT_BUTTON = "Valider et demander le paiement";

/** Bouton secrétariat — renvoi lien. */
export const SECRETARIAT_RESEND_PAYMENT_BUTTON = "Renvoyer le lien de paiement";

/** Tooltip secrétariat — renvoi. */
export const SECRETARIAT_RESEND_PAYMENT_TOOLTIP =
  "Génère un nouveau lien Stripe (valable 24 h) et renvoie l'e-mail de paiement au contact du dossier.";

/** Liste secrétariat — action rapide renvoi. */
export const SECRETARIAT_QUICK_RESEND_PAYMENT_LABEL = "Renvoyer le lien";

/** Contexte secrétariat — self-service adhérent. */
export const SECRETARIAT_SELF_SERVICE_HINT =
  "L'adhérent peut aussi payer depuis Mes dossiers sur TeamUp sans intervention du secrétariat.";
