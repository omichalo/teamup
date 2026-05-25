/**
 * Mapping nom de champ ↔ étape du wizard d'inscription club.
 *
 * Le wizard expose une séquence d'étapes dont une (`representatives`) est
 * conditionnelle (présente uniquement pour les inscriptions de mineurs). Pour
 * éviter de coder en dur des indices numériques qui se décalent selon la
 * configuration, on mappe chaque champ à un **identifiant symbolique** d'étape.
 * Le wizard convertit l'ID en index numérique en s'appuyant sur la séquence
 * active courante.
 *
 * Utilisé pour :
 * - Sur une erreur serveur (`fieldErrors` Zod), sauter automatiquement à la
 *   première étape qui porte une erreur (la plus en amont, pour ne pas
 *   désorienter l'utilisateur).
 * - Construire un résumé lisible des étapes en erreur dans l'Alert global du
 *   wizard.
 *
 * Toute clé non listée tombe sur la 1ʳᵉ étape de la séquence par défaut.
 */

import { resolveRegistrationFieldStepKey } from "./reduction-reference-codes";

export type RegistrationStepId =
  | "audience"
  | "adherent"
  | "representatives"
  | "practice"
  | "admin"
  | "engagements"
  | "recap";

export const REGISTRATION_FIELD_TO_STEP_ID: Readonly<
  Record<string, RegistrationStepId>
> = {
  /* Étape 1 — Pour qui ? */
  adherentRole: "audience",
  ffttLicense: "audience",
  ffttLicenseLookup: "audience",
  birthDate: "audience",

  /* Étape 2 — L'adhérent */
  firstName: "adherent",
  lastName: "adherent",
  sex: "adherent",
  firstFemaleRegistrationSqy: "adherent",
  birthCity: "adherent",
  adherentEmail: "adherent",
  adherentPhonePrimary: "adherent",
  adherentPhoneSecondary: "adherent",
  addressLine1: "adherent",
  addressLine2: "adherent",
  postalCode: "adherent",
  city: "adherent",

  /* Étape 3 — Représentants légaux (conditionnelle mineur) */
  representatives: "representatives",

  /* Étape 4 — Pratique sportive */
  mainSectionId: "practice",
  additionalSectionIds: "practice",
  slotIds: "practice",
  schoolPickupSlotIds: "practice",
  wantsCompetitorExtras: "practice",
  competitionJerseySize: "practice",
  competitionIds: "practice",

  /* Étape 5 — Dossier administratif */
  medicalCertificateDeclaration: "admin",
  medicalQuestionnaire: "admin",
  medicalVeteranPath: "admin",
  wantsRegistrationCertificate: "admin",
  familyRegistrationOrder: "admin",
  reductionTypes: "admin",
  reductionReferenceCodes: "admin",

  /* Étape 6 — Engagements à signer */
  photoConsent: "engagements",
  emergencyMedicalAuthorization: "engagements",
  supervisionAcknowledgement: "engagements",
  internalRulesAccepted: "engagements",
};

function resolveFieldStepId(fieldKey: string, sequence: ReadonlyArray<RegistrationStepId>): RegistrationStepId {
  const mappedKey = resolveRegistrationFieldStepKey(fieldKey);
  return REGISTRATION_FIELD_TO_STEP_ID[mappedKey] ?? sequence[0] ?? "audience";
}

/**
 * Retourne l'index (dans la séquence fournie) de la 1ʳᵉ étape qui contient une
 * erreur, ou `null` si aucun champ n'est en erreur. Les clés inconnues
 * tombent sur l'index 0 (1ʳᵉ étape de la séquence).
 */
export function firstStepWithError(
  fieldErrors: Record<string, string[] | undefined> | null | undefined,
  sequence: ReadonlyArray<RegistrationStepId>
): number | null {
  if (!fieldErrors) return null;
  let best: number | null = null;
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (!messages || messages.length === 0) continue;
    const stepId = resolveFieldStepId(key, sequence);
    const idx = sequence.indexOf(stepId);
    const resolved = idx === -1 ? 0 : idx;
    if (best === null || resolved < best) {
      best = resolved;
    }
  }
  return best;
}

/**
 * Liste des étapes (uniques, triées) sur lesquelles porte au moins une erreur.
 * Utilisé pour afficher un résumé compact « Erreurs sur les étapes 2 et 5 ».
 */
export function stepsWithError(
  fieldErrors: Record<string, string[] | undefined> | null | undefined,
  sequence: ReadonlyArray<RegistrationStepId>
): number[] {
  if (!fieldErrors) return [];
  const set = new Set<number>();
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (!messages || messages.length === 0) continue;
    const stepId = resolveFieldStepId(key, sequence);
    const idx = sequence.indexOf(stepId);
    set.add(idx === -1 ? 0 : idx);
  }
  return Array.from(set).sort((a, b) => a - b);
}
