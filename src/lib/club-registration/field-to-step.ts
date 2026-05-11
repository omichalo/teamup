/**
 * Mapping nom de champ ↔ index d'étape du wizard d'inscription club.
 *
 * Utilisé pour :
 * - Sur une erreur serveur (`fieldErrors` Zod), sauter automatiquement à la 1ʳᵉ étape
 *   qui porte une erreur (la plus proche du début pour ne pas désorienter l'utilisateur).
 * - Construire un résumé lisible des étapes en erreur dans l'Alert global du wizard.
 *
 * Les indices doivent rester alignés avec `STEPS` dans `ClubRegistrationWizard.tsx` :
 *   0: Identité et coordonnées
 *   1: Sections et créneaux
 *   2: Certificat et aides
 *   3: Consentements et compétition
 *   4: Récapitulatif (lecture seule)
 *
 * Toute clé non listée tombe sur l'étape 0 par défaut (préférence à corriger côté
 * client plutôt qu'à laisser l'utilisateur deviner).
 */

export const REGISTRATION_FIELD_TO_STEP: Readonly<Record<string, number>> = {
  /* Étape 0 — Identité et coordonnées */
  adherentRole: 0,
  firstName: 0,
  lastName: 0,
  sex: 0,
  firstFemaleRegistrationSqy: 0,
  birthCity: 0,
  birthDate: 0,
  adherentEmail: 0,
  adherentPhonePrimary: 0,
  adherentPhoneSecondary: 0,
  addressLine1: 0,
  addressLine2: 0,
  postalCode: 0,
  city: 0,
  representatives: 0,

  /* Étape 1 — Sections et créneaux */
  mainSectionId: 1,
  additionalSectionIds: 1,
  slotIds: 1,

  /* Étape 2 — Certificat et aides */
  medicalCertificateDeclaration: 2,
  wantsRegistrationCertificate: 2,
  familyRegistrationOrder: 2,
  reductionTypes: 2,
  passSportCode: 2,

  /* Étape 3 — Consentements et compétition */
  photoConsent: 3,
  emergencyMedicalAuthorization: 3,
  supervisionAcknowledgement: 3,
  internalRulesAccepted: 3,
  wantsCompetitorExtras: 3,
  competitionJerseySize: 3,
  competitionIds: 3,
};

/**
 * Retourne l'index de la 1ʳᵉ étape qui contient une erreur (chaîne ou tableau non vide),
 * ou null si aucun champ n'est en erreur. La 1ʳᵉ clé sans mapping connu tombe sur 0.
 */
export function firstStepWithError(
  fieldErrors: Record<string, string[] | undefined> | null | undefined
): number | null {
  if (!fieldErrors) return null;
  let best: number | null = null;
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (!messages || messages.length === 0) continue;
    const step = REGISTRATION_FIELD_TO_STEP[key] ?? 0;
    if (best === null || step < best) {
      best = step;
    }
  }
  return best;
}

/**
 * Liste des étapes (uniques, triées) sur lesquelles porte au moins une erreur. Utilisé
 * pour afficher un résumé compact « Erreurs sur les étapes 1 et 3 ».
 */
export function stepsWithError(
  fieldErrors: Record<string, string[] | undefined> | null | undefined
): number[] {
  if (!fieldErrors) return [];
  const set = new Set<number>();
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (!messages || messages.length === 0) continue;
    set.add(REGISTRATION_FIELD_TO_STEP[key] ?? 0);
  }
  return Array.from(set).sort((a, b) => a - b);
}
