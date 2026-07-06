import { isAtLeast65At, isMinorAt } from "./age";
import type { ClubRegistrationPayload } from "./schema";

export const MEDICAL_YES_NO_VALUES = ["yes", "no"] as const;
export type MedicalYesNo = (typeof MEDICAL_YES_NO_VALUES)[number];

export const MEDICAL_QUESTIONNAIRE_SUMMARY_VALUES = [
  "all_no",
  "has_yes",
  "pps_declared",
  "certificate_choice",
] as const;
export type MedicalQuestionnaireSummary =
  (typeof MEDICAL_QUESTIONNAIRE_SUMMARY_VALUES)[number];

export const MEDICAL_CERTIFICATE_DECLARATION_VALUES = [
  "minor_all_no",
  "minor_yes_certificate_required",
  "adult_pps_declared",
  "adult_certificate_required",
  "senior_certificate_required",
  // Rétrocompatibilité dossiers antérieurs (saison ≤ 2025/2026)
  "under_40_all_no",
  "over_40_cert_unchanged_all_no",
  "over_40_first_or_changed_certificate_required",
  "questionnaire_yes_certificate_required",
] as const;

export type MedicalQuestionnaire = {
  /** Résultat agrégé du parcours médical (questionnaire mineur ou PPS adulte). */
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
 * Dérive la déclaration agrégée à partir du dossier médical détaillé.
 * Saison 2026/2027 : PPS pour les adultes ; parcours vétéran à partir de 65 ans.
 */
export function deriveMedicalCertificateDeclaration(params: {
  birthDate: string;
  questionnaire: MedicalQuestionnaire;
  veteranPath: MedicalVeteranPath;
  hasVerifiedFfttLicense: boolean;
}): MedicalCertificateDeclaration | "" {
  const { summary } = params.questionnaire;

  if (isMinorAt(params.birthDate)) {
    if (summary === "all_no") return "minor_all_no";
    if (summary === "has_yes") return "minor_yes_certificate_required";
    return "";
  }

  if (isAtLeast65At(params.birthDate)) {
    const hadLicense = effectiveHadFfttLicense(
      params.veteranPath,
      params.hasVerifiedFfttLicense
    );
    const { categoryChanged } = params.veteranPath;

    if (!params.hasVerifiedFfttLicense && hadLicense === "no") {
      return "senior_certificate_required";
    }
    if (hadLicense !== "yes") return "";

    if (categoryChanged === "yes") {
      return "senior_certificate_required";
    }
    if (categoryChanged !== "no") return "";

    if (summary === "pps_declared") return "adult_pps_declared";
    if (summary === "certificate_choice") return "adult_certificate_required";
    return "";
  }

  if (summary === "pps_declared") return "adult_pps_declared";
  if (summary === "certificate_choice") return "adult_certificate_required";
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

  const senior = isAtLeast65At(birthDate);

  switch (declaration) {
    case "minor_all_no":
    case "under_40_all_no":
      questionnaire.summary = "all_no";
      break;
    case "minor_yes_certificate_required":
    case "questionnaire_yes_certificate_required":
      questionnaire.summary = isMinorAt(birthDate) ? "has_yes" : "certificate_choice";
      break;
    case "adult_pps_declared":
      questionnaire.summary = "pps_declared";
      break;
    case "adult_certificate_required":
      questionnaire.summary = "certificate_choice";
      break;
    case "senior_certificate_required":
    case "over_40_first_or_changed_certificate_required":
      if (senior) {
        veteranPath.hadFfttLicense = "no";
      } else {
        questionnaire.summary = "certificate_choice";
      }
      break;
    case "over_40_cert_unchanged_all_no":
      veteranPath.hadFfttLicense = "yes";
      veteranPath.categoryChanged = "no";
      questionnaire.summary = senior ? "pps_declared" : "all_no";
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
  return deriveMedicalCertificateDeclaration(params) !== "";
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

/** True si le parcours vétéran (licence / catégorie) s’applique à cette date de naissance. */
export function isSeniorMedicalVeteranPath(birthDate: string): boolean {
  return isAtLeast65At(birthDate);
}

/** True si l’adhérent doit choisir PPS ou certificat (adulte sans obligation certificat vétéran). */
export function needsAdultPpsOrCertificateChoice(params: {
  birthDate: string;
  questionnaire: MedicalQuestionnaire;
  veteranPath: MedicalVeteranPath;
  hasVerifiedFfttLicense: boolean;
}): boolean {
  if (isMinorAt(params.birthDate)) return false;
  if (!isAtLeast65At(params.birthDate)) return true;

  const hadLicense = effectiveHadFfttLicense(
    params.veteranPath,
    params.hasVerifiedFfttLicense
  );
  if (!params.hasVerifiedFfttLicense && hadLicense === "no") return false;
  if (hadLicense !== "yes") return false;
  if (params.veteranPath.categoryChanged === "yes") return false;
  return params.veteranPath.categoryChanged === "no";
}
