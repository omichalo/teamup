import { isMinorAt } from "@/lib/club-registration/age";
import type { RegistrationStepId } from "@/lib/club-registration/field-to-step";
import type { RegistrationDraft } from "./registration-defaults";
import { validateStepById } from "./step-validation";

export const STEP_TITLES: Record<RegistrationStepId, string> = {
  audience: "Pour qui ?",
  adherent: "L’adhérent",
  representatives: "Représentants légaux",
  practice: "Pratique sportive",
  admin: "Dossier administratif",
  engagements: "Engagements à signer",
  payment: "Paiement",
  recap: "Récapitulatif",
};

export const STEP_SHORT_LABELS: Record<RegistrationStepId, string> = {
  audience: "Profil",
  adherent: "Adhérent",
  representatives: "Représentants",
  practice: "Pratique",
  admin: "Dossier",
  engagements: "Engagements",
  payment: "Paiement",
  recap: "Récap",
};

export const STEP_DESCRIPTIONS: Record<RegistrationStepId, string> = {
  audience:
    "Indiquez pour qui est l’inscription et, si vous en avez une, votre licence FFTT.",
  adherent:
    "Identité, contact et adresse postale de la personne qui pratiquera au club.",
  representatives:
    "Coordonnées du ou des représentants légaux (un obligatoire, un second facultatif).",
  practice:
    "Lieu principal, lieux complémentaires, créneaux et extension compétiteur si vous le souhaitez.",
  admin:
    "Déclaration médicale, inscription familiale, Pass Sport et autres aides, demande d’attestation.",
  engagements:
    "Diffusion d’images, autorisations légales pour les mineurs et acceptation du règlement intérieur.",
  payment:
    "Montant, aides déclarées et mode de règlement souhaité (validés par le secrétariat).",
  recap:
    "Vérifiez votre dossier, ajoutez éventuellement des précisions pour le club, puis envoyez.",
};

/** Étape conditionnelle pour les inscriptions de mineurs uniquement. */
export function buildRegistrationWizardSequence(
  draft: RegistrationDraft
): RegistrationStepId[] {
  const needsRepresentatives =
    draft.adherentRole === "minor_dependent" || isMinorAt(draft.birthDate);
  const base: RegistrationStepId[] = ["audience", "adherent"];
  if (needsRepresentatives) base.push("representatives");
  base.push("practice", "admin", "engagements", "payment", "recap");
  return base;
}

/**
 * Permet d'accéder à l'étape cible : retour libre ; étapes suivantes seulement
 * si les étapes intermédiaires sont valides.
 */
export function canNavigateToRegistrationStep(
  targetIndex: number,
  activeStep: number,
  sequence: ReadonlyArray<RegistrationStepId>,
  draft: RegistrationDraft
): boolean {
  if (targetIndex <= activeStep) return true;
  for (let s = activeStep; s < targetIndex; s++) {
    if (validateStepById(sequence[s], draft) !== null) return false;
  }
  return true;
}
