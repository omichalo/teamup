/** Libellés des déclarations médicales agrégées (export, récap, secrétariat). */

export const MEDICAL_CERTIFICATE_DECLARATION_LABELS: Record<string, string> = {
  // Saison 2026/2027 — PPS
  minor_all_no: "Mineur : aucune réponse « Oui » au questionnaire",
  minor_yes_certificate_required:
    "Mineur : au moins une réponse « Oui » — certificat requis",
  adult_pps_declared:
    "Adulte : PPS à compléter sur l’espace licencié FFTT",
  adult_certificate_required:
    "Adulte : certificat médical en cours de validité",
  senior_certificate_required:
    "65 ans et plus : première licence ou changement de catégorie vétéran — certificat requis",
  // Rétrocompatibilité dossiers antérieurs
  under_40_all_no: "Moins de 40 ans : aucune réponse « Oui » (ancien régime)",
  over_40_cert_unchanged_all_no:
    "40 ans et plus, certificat inchangé : aucune réponse « Oui » (ancien régime)",
  over_40_first_or_changed_certificate_required:
    "40 ans et plus : certificat requis (ancien régime)",
  questionnaire_yes_certificate_required:
    "Au moins une réponse « Oui » : certificat requis (ancien régime)",
};

export const MEDICAL_QUESTIONNAIRE_SUMMARY_LABELS: Record<string, string> = {
  all_no: "Toutes les réponses sont « Non »",
  has_yes: "Au moins une réponse « Oui »",
  pps_declared: "PPS sur l’espace licencié FFTT",
  certificate_choice: "Certificat médical en cours de validité",
};
