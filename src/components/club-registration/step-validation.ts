import { isAtLeast40At, isMinorAt } from "@/lib/club-registration/age";
import type { RegistrationStepId } from "@/lib/club-registration/field-to-step";
import {
  effectiveHadFfttLicense,
  isMedicalAdminStepComplete,
} from "@/lib/club-registration/medical-dossier";
import { isValidFrenchPhoneSurface } from "@/lib/club-registration/phone-fr";
import type { RegistrationDraft } from "./registration-defaults";

export type StepValidationResult =
  | { valid: true }
  | { valid: false; message: string; focusSelector: string | null };

function invalid(
  message: string,
  focusSelector: string | null
): StepValidationResult {
  return { valid: false, message, focusSelector };
}

function getMedicalFocusSelector(draft: RegistrationDraft): string {
  const atLeast40 = isAtLeast40At(draft.birthDate);
  const hasVerified = Boolean(draft.ffttLicenseLookup?.licence);
  const hadLicense = effectiveHadFfttLicense(
    draft.medicalVeteranPath,
    hasVerified
  );

  if (!atLeast40) {
    if (!draft.medicalQuestionnaire.summary) {
      return "#medical-questionnaire-label";
    }
    return "#medical-dossier-section";
  }

  if (!hasVerified && draft.medicalVeteranPath.hadFfttLicense === "") {
    return "#medical-first-label";
  }
  if (hadLicense === "yes" && draft.medicalVeteranPath.categoryChanged === "") {
    return "#medical-category-label";
  }
  if (
    hadLicense === "yes" &&
    draft.medicalVeteranPath.categoryChanged === "no" &&
    !draft.medicalQuestionnaire.summary
  ) {
    return "#medical-questionnaire-veteran-label";
  }
  return "#medical-dossier-section";
}

export function validateStep(
  stepId: RegistrationStepId,
  draft: RegistrationDraft
): StepValidationResult {
  if (stepId === "audience") {
    if (!draft.birthDate) {
      return invalid("Indiquez la date de naissance.", '[data-field="birthDate"]');
    }
    const minor = isMinorAt(draft.birthDate);
    if (minor && draft.adherentRole === "self") {
      return invalid(
        "La date de naissance correspond à un mineur : passez en mode « mineur dont je suis le représentant légal ».",
        '[data-field="birthDate"]'
      );
    }
    return { valid: true };
  }

  if (stepId === "adherent") {
    if (!draft.firstName.trim()) {
      return invalid("Indiquez le prénom de l’adhérent.", '[data-field="firstName"]');
    }
    if (!draft.lastName.trim()) {
      return invalid("Indiquez le nom de l’adhérent.", '[data-field="lastName"]');
    }
    if (!draft.sex) {
      return invalid("Indiquez le sexe de l’adhérent.", "#sex-label");
    }
    if (!draft.birthCity.trim()) {
      return invalid(
        "Indiquez la ville de naissance.",
        '[data-field="birthCity"]'
      );
    }

    const minor = isMinorAt(draft.birthDate);
    if (!minor && !draft.adherentEmail?.trim()) {
      return invalid(
        "Indiquez l’e-mail de contact de l’adhérent.",
        '[data-field="adherentEmail"]'
      );
    }
    if (draft.adherentEmail && draft.adherentEmail.trim() !== "") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.adherentEmail.trim())) {
        return invalid(
          "L’adresse e-mail de contact est invalide.",
          '[data-field="adherentEmail"]'
        );
      }
    }

    if (!draft.adherentPhonePrimary.trim()) {
      return invalid(
        "Indiquez un téléphone principal.",
        '[data-field="adherentPhonePrimary"]'
      );
    }
    if (!isValidFrenchPhoneSurface(draft.adherentPhonePrimary)) {
      return invalid(
        "Le téléphone principal doit être un numéro français valide (10 chiffres ou +33).",
        '[data-field="adherentPhonePrimary"]'
      );
    }
    const sec = draft.adherentPhoneSecondary?.trim();
    if (sec && !isValidFrenchPhoneSurface(sec)) {
      return invalid(
        "Le téléphone secondaire doit être un numéro français valide.",
        '[data-field="adherentPhoneSecondary"]'
      );
    }

    const addr1 = draft.addressLine1.trim();
    const pc = draft.postalCode.trim();
    const city = draft.city.trim();
    if (!addr1 || !pc || !city) {
      return invalid(
        "Veuillez sélectionner une adresse ou saisir l’adresse manuellement.",
        '[data-field="addressLine1"]'
      );
    }
    if (!/^[0-9]{5}$/.test(pc)) {
      return invalid("Code postal français à 5 chiffres.", '[data-field="postalCode"]');
    }
    return { valid: true };
  }

  if (stepId === "representatives") {
    if (draft.representatives.length === 0) {
      return invalid(
        "Au moins un représentant légal est obligatoire pour l’inscription d’un mineur.",
        "#representatives-section"
      );
    }
    for (let i = 0; i < draft.representatives.length; i++) {
      const r = draft.representatives[i];
      const isFirstRequired = i === 0;
      if (isFirstRequired) {
        if (!r.firstName.trim() || !r.lastName.trim()) {
          return invalid(
            `Représentant ${i + 1} : prénom et nom obligatoires.`,
            `#representative-${i}`
          );
        }
        if (!r.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) {
          return invalid(
            `Représentant ${i + 1} : adresse e-mail invalide.`,
            `#representative-${i}`
          );
        }
        if (!r.phone.trim() || !isValidFrenchPhoneSurface(r.phone)) {
          return invalid(
            `Représentant ${i + 1} : téléphone invalide.`,
            `#representative-${i}`
          );
        }
      } else if (
        r.firstName.trim() ||
        r.lastName.trim() ||
        r.email.trim() ||
        r.phone.trim()
      ) {
        if (!r.firstName.trim() || !r.lastName.trim()) {
          return invalid(
            `Représentant ${i + 1} : prénom et nom obligatoires si vous le renseignez.`,
            `#representative-${i}`
          );
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) {
          return invalid(
            `Représentant ${i + 1} : adresse e-mail invalide.`,
            `#representative-${i}`
          );
        }
        if (!isValidFrenchPhoneSurface(r.phone)) {
          return invalid(
            `Représentant ${i + 1} : téléphone invalide.`,
            `#representative-${i}`
          );
        }
      }
    }
    if (draft.representatives.length === 2) {
      const a = draft.representatives[0].email.trim().toLowerCase();
      const b = draft.representatives[1].email.trim().toLowerCase();
      if (a && b && a === b) {
        return invalid(
          "Les deux représentants doivent avoir des adresses e-mail différentes.",
          "#representative-1"
        );
      }
    }
    return { valid: true };
  }

  if (stepId === "practice") {
    if (draft.slotIds.length === 0) {
      return invalid("Sélectionnez au moins un créneau.", '[data-field="slotIds"]');
    }
    if (draft.wantsCompetitorExtras && !draft.competitionJerseySize) {
      return invalid(
        "Indiquez une taille de maillot pour la section compétiteur.",
        '[name="competitionJerseySize"]'
      );
    }
    return { valid: true };
  }

  if (stepId === "admin") {
    const atLeast40 = isAtLeast40At(draft.birthDate);
    const decl = draft.medicalCertificateDeclaration;
    if (
      !decl ||
      !isMedicalAdminStepComplete({
        birthDate: draft.birthDate,
        questionnaire: draft.medicalQuestionnaire,
        veteranPath: draft.medicalVeteranPath,
        hasVerifiedFfttLicense: Boolean(draft.ffttLicenseLookup?.licence),
      })
    ) {
      return invalid(
        "Répondez aux questions de la déclaration médicale.",
        getMedicalFocusSelector(draft)
      );
    }
    if (
      !atLeast40 &&
      (decl === "over_40_cert_unchanged_all_no" ||
        decl === "over_40_first_or_changed_certificate_required")
    ) {
      return invalid(
        "La déclaration médicale sélectionnée est réservée aux 40 ans et plus.",
        "#medical-dossier-section"
      );
    }
    if (atLeast40 && decl === "under_40_all_no") {
      return invalid(
        "La déclaration médicale « moins de 40 ans » n’est pas applicable à votre date de naissance.",
        "#medical-dossier-section"
      );
    }
    return { valid: true };
  }

  if (stepId === "engagements") {
    if (!draft.photoConsent) {
      return invalid(
        "Indiquez si vous acceptez ou refusez la diffusion d’images.",
        '[name="photoConsent"]'
      );
    }
    if (isMinorAt(draft.birthDate)) {
      if (draft.emergencyMedicalAuthorization !== "yes") {
        return invalid(
          "Cochez l’autorisation médicale d’urgence pour votre enfant (obligatoire pour un mineur).",
          '[data-field="emergencyMedicalAuthorization"]'
        );
      }
      if (draft.supervisionAcknowledgement !== "yes") {
        return invalid(
          "Cochez l’engagement de prise en charge à l’heure des cours (obligatoire pour un mineur).",
          '[data-field="supervisionAcknowledgement"]'
        );
      }
    }
    if (!draft.rulesAccepted) {
      return invalid(
        "Cochez la case pour approuver le règlement intérieur et la transmission des données à la FFTT.",
        '[data-field="internalRulesAccepted"]'
      );
    }
    return { valid: true };
  }

  if (stepId === "recap") return { valid: true };
  return { valid: true };
}

/** Message d’erreur uniquement (compatibilité). */
export function validateStepById(
  stepId: RegistrationStepId,
  draft: RegistrationDraft
): string | null {
  const result = validateStep(stepId, draft);
  return result.valid ? null : result.message;
}
