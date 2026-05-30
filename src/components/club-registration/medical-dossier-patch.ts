import {
  deriveMedicalCertificateDeclaration,
  type MedicalQuestionnaire,
  type MedicalVeteranPath,
} from "@/lib/club-registration/medical-dossier";
import type { RegistrationDraft } from "./registration-defaults";

export function buildMedicalDossierPatch(
  draft: Pick<
    RegistrationDraft,
    | "birthDate"
    | "ffttLicenseLookup"
    | "medicalQuestionnaire"
    | "medicalVeteranPath"
  >,
  patch: {
    questionnaire?: Partial<MedicalQuestionnaire>;
    veteranPath?: Partial<MedicalVeteranPath>;
  }
): Pick<
  RegistrationDraft,
  "medicalQuestionnaire" | "medicalVeteranPath" | "medicalCertificateDeclaration"
> {
  const medicalQuestionnaire = {
    ...draft.medicalQuestionnaire,
    ...patch.questionnaire,
  };
  const medicalVeteranPath = {
    ...draft.medicalVeteranPath,
    ...patch.veteranPath,
  };
  const hasVerifiedFfttLicense = Boolean(draft.ffttLicenseLookup?.licence);
  const medicalCertificateDeclaration = deriveMedicalCertificateDeclaration({
    birthDate: draft.birthDate,
    questionnaire: medicalQuestionnaire,
    veteranPath: medicalVeteranPath,
    hasVerifiedFfttLicense,
  });
  return {
    medicalQuestionnaire,
    medicalVeteranPath,
    medicalCertificateDeclaration,
  };
}
