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
