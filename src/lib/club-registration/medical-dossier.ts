import { isAtLeast40At } from "./age";
import type { ClubRegistrationPayload } from "./schema";

export const MEDICAL_YES_NO_VALUES = ["yes", "no"] as const;
export type MedicalYesNo = (typeof MEDICAL_YES_NO_VALUES)[number];

export const MEDICAL_QUESTIONNAIRE_SUMMARY_VALUES = [
  "all_no",
  "has_yes",
] as const;
export type MedicalQuestionnaireSummary =
  (typeof MEDICAL_QUESTIONNAIRE_SUMMARY_VALUES)[number];

export type MedicalQuestionnaire = {
  /** Résultat agrégé du questionnaire FFTT (UI actuelle). */
  summary: MedicalQuestionnaireSummary | "";
  /** Réponses individuelles (Q1, Q2, …) — extensible ; vide tant que l’UI ne les collecte pas. */
  answers: Record<string, MedicalYesNo>;
};

export type MedicalVeteranPath = {
  hadFfttLicense: MedicalYesNo | "";
  categoryChanged: MedicalYesNo | "";
};

export type MedicalCertificateDeclaration =
  ClubRegistrationPayload["medicalCertificateDeclaration"];

export function createEmptyMedicalQuestionnaire(): MedicalQuestionnaire {
  return { summary: "", answers: {} };
}

export function createEmptyMedicalVeteranPath(): MedicalVeteranPath {
  return { hadFfttLicense: "", categoryChanged: "" };
}

export function effectiveHadFfttLicense(
  veteranPath: MedicalVeteranPath,
  hasVerifiedFfttLicense: boolean
): MedicalYesNo | "" {
  if (hasVerifiedFfttLicense) return "yes";
  return veteranPath.hadFfttLicense;
}

/**
 * Dérive la déclaration agrégée (enum historique) à partir du dossier médical détaillé.
 * Aligné sur le parcours AdminStep (âge, licence vérifiée, parcours vétéran).
 */
export function deriveMedicalCertificateDeclaration(params: {
  birthDate: string;
  questionnaire: MedicalQuestionnaire;
  veteranPath: MedicalVeteranPath;
  hasVerifiedFfttLicense: boolean;
}): MedicalCertificateDeclaration | "" {
  const atLeast40 = isAtLeast40At(params.birthDate);
  const { summary } = params.questionnaire;

  if (!atLeast40) {
    if (summary === "all_no") return "under_40_all_no";
    if (summary === "has_yes") return "questionnaire_yes_certificate_required";
    return "";
  }

  const hadLicense = effectiveHadFfttLicense(
    params.veteranPath,
    params.hasVerifiedFfttLicense
  );
  const { categoryChanged } = params.veteranPath;

  if (!params.hasVerifiedFfttLicense && hadLicense === "no") {
    return "over_40_first_or_changed_certificate_required";
  }
  if (hadLicense !== "yes") return "";

  if (categoryChanged === "yes") {
    return "over_40_first_or_changed_certificate_required";
  }
  if (categoryChanged !== "no") return "";

  if (summary === "all_no") return "over_40_cert_unchanged_all_no";
  if (summary === "has_yes") return "questionnaire_yes_certificate_required";
  return "";
}

/** Reconstruit le dossier détaillé à partir de la déclaration agrégée (rétrocompatibilité). */
export function inferMedicalDossierFromDeclaration(
  declaration: MedicalCertificateDeclaration | "" | null | undefined,
  birthDate: string
): { questionnaire: MedicalQuestionnaire; veteranPath: MedicalVeteranPath } {
  const questionnaire = createEmptyMedicalQuestionnaire();
  const veteranPath = createEmptyMedicalVeteranPath();
  if (!declaration) {
    return { questionnaire, veteranPath };
  }

  const atLeast40 = isAtLeast40At(birthDate);

  switch (declaration) {
    case "under_40_all_no":
      questionnaire.summary = "all_no";
      break;
    case "questionnaire_yes_certificate_required":
      questionnaire.summary = "has_yes";
      break;
    case "over_40_first_or_changed_certificate_required":
      if (atLeast40) {
        veteranPath.hadFfttLicense = "no";
      } else {
        questionnaire.summary = "has_yes";
      }
      break;
    case "over_40_cert_unchanged_all_no":
      veteranPath.hadFfttLicense = "yes";
      veteranPath.categoryChanged = "no";
      questionnaire.summary = "all_no";
      break;
    default:
      break;
  }

  return { questionnaire, veteranPath };
}

export function isMedicalAdminStepComplete(params: {
  birthDate: string;
  questionnaire: MedicalQuestionnaire;
  veteranPath: MedicalVeteranPath;
  hasVerifiedFfttLicense: boolean;
}): boolean {
  return (
    deriveMedicalCertificateDeclaration(params) !== ""
  );
}

export function syncMedicalCertificateDeclaration<
  T extends {
    birthDate: string;
    medicalQuestionnaire: MedicalQuestionnaire;
    medicalVeteranPath: MedicalVeteranPath;
    ffttLicenseLookup?: { licence?: string } | undefined;
    medicalCertificateDeclaration: MedicalCertificateDeclaration | "";
  },
>(draft: T): T {
  const declaration = deriveMedicalCertificateDeclaration({
    birthDate: draft.birthDate,
    questionnaire: draft.medicalQuestionnaire,
    veteranPath: draft.medicalVeteranPath,
    hasVerifiedFfttLicense: Boolean(draft.ffttLicenseLookup?.licence),
  });
  if (declaration === draft.medicalCertificateDeclaration) {
    return draft;
  }
  return { ...draft, medicalCertificateDeclaration: declaration };
}
