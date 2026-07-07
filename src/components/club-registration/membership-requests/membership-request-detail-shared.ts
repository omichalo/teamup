import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { getEnabledSites } from "@/lib/club-registration-config/helpers";
import { formatRegistrationSiteLabel } from "@/lib/club-registration-config/site-display";
import {
  syncPaymentAidsWithReductionTypes,
} from "@/lib/club-registration/payment/payment-draft-helpers";
import {
  stripUnselectedReductionReferenceCodes,
} from "@/lib/club-registration/reduction-reference-codes";
import { validateAdminAids } from "@/lib/club-registration/validate-admin-aids";
import {
  MEDICAL_CERTIFICATE_STATUS_LABELS,
  MEDICAL_CERTIFICATE_STATUS_VALUES,
} from "@/lib/club-registration/medical-certificate";
import {
  REGISTRATION_STATUS_COLORS,
  REGISTRATION_STATUS_LABELS,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";
import type { Representative } from "@/lib/club-registration/schema";
import { buildPricingContext, type FamilyRegistrationOrder } from "@/lib/pricing";
import { MEDICAL_CERTIFICATE_DECLARATION_VALUES } from "@/lib/club-registration/medical-dossier";
import { MEDICAL_CERTIFICATE_DECLARATION_LABELS } from "@/lib/club-registration/medical-declaration-labels";
import type { EditableRegistration } from "./types";

export const ADHERENT_ROLE_OPTIONS = [
  { value: "self", label: "L'adhérent lui-même" },
  { value: "minor_dependent", label: "Mineur représenté légalement" },
  { value: "other_adult", label: "Autre adulte" },
] as const;

export const SEX_OPTIONS = [
  { value: "female", label: "Femme" },
  { value: "male", label: "Homme" },
  { value: "other", label: "Autre / Ne pas préciser" },
] as const;

export const REPRESENTATIVE_ROLE_OPTIONS = [
  { value: "mother", label: "Mère" },
  { value: "father", label: "Père" },
  { value: "guardian", label: "Tuteur / Tutrice" },
  { value: "self", label: "Adhérent(e) lui/elle-même" },
  { value: "other", label: "Autre" },
] as const;

export const MEDICAL_OPTIONS = MEDICAL_CERTIFICATE_DECLARATION_VALUES.map(
  (value) => ({
    value,
    label: MEDICAL_CERTIFICATE_DECLARATION_LABELS[value] ?? value,
  })
);

export const MEDICAL_CERTIFICATE_STATUS_OPTIONS = MEDICAL_CERTIFICATE_STATUS_VALUES.map(
  (value) => ({
    value,
    label: MEDICAL_CERTIFICATE_STATUS_LABELS[value],
  })
);

export const FAMILY_ORDER_OPTIONS = [
  { value: "none", label: "Première inscription dans la famille" },
  { value: "second", label: "Deuxième inscription dans la famille" },
  { value: "third_or_more", label: "Troisième inscription ou plus" },
] as const;

export const BOOLEAN_CONSENT_OPTIONS = [
  { value: "yes", label: "Oui" },
  { value: "not_applicable_adult", label: "Non applicable adulte" },
] as const;

export function buildSlotOptions(config: RegistrationConfigV1) {
  return getEnabledSites(config).flatMap((site) =>
    site.slots
      .filter((slot) => slot.enabled)
      .map((slot) => ({
        value: slot.id,
        label: `${formatRegistrationSiteLabel(site)} — ${slot.label}`,
      }))
  );
}

export function formatRegistrationDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-FR");
}

export function createEmptyRepresentative(): Representative {
  return {
    role: "mother",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  };
}

export function formToPricingInput(form: EditableRegistration) {
  const input: Parameters<typeof buildPricingContext>[0] = {
    birthDate: form.birthDate,
    mainSectionId: form.mainSectionId,
    slotIds: form.slotIds,
    additionalSectionIds: form.additionalSectionIds,
    wantsCompetitorExtras: form.wantsCompetitorExtras,
    wantsOptionalJersey: form.wantsCompetitorExtras ? false : form.wantsOptionalJersey,
    competitionIds: form.competitionIds,
    familyRegistrationOrder: form.familyRegistrationOrder as FamilyRegistrationOrder,
    sex: form.sex,
    reductionTypes: form.reductionTypes,
  };

  if (form.firstFemaleRegistrationSqy !== undefined) {
    input.firstFemaleRegistrationSqy = form.firstFemaleRegistrationSqy;
  }
  return input;
}

export function parseAmountCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function buildEditableReductionTypesUpdate(
  form: EditableRegistration,
  reductionTypes: string[],
  config: RegistrationConfigV1
): Pick<EditableRegistration, "reductionTypes" | "paymentAids" | "reductionReferenceCodes"> {
  const labelsByType = Object.fromEntries(config.aidRules.map((rule) => [rule.id, rule.label]));
  return {
    reductionTypes,
    paymentAids: syncPaymentAidsWithReductionTypes(
      form.paymentAids,
      reductionTypes,
      labelsByType
    ),
    reductionReferenceCodes: stripUnselectedReductionReferenceCodes(
      form.reductionReferenceCodes,
      new Set(reductionTypes)
    ),
  };
}

export function validateEditableRegistrationAids(
  form: EditableRegistration,
  config: RegistrationConfigV1
): string | null {
  const issue = validateAdminAids(
    {
      birthDate: form.birthDate,
      mainSectionId: form.mainSectionId,
      slotIds: form.slotIds,
      additionalSectionIds: form.additionalSectionIds,
      wantsCompetitorExtras: form.wantsCompetitorExtras,
      wantsOptionalJersey: form.wantsOptionalJersey,
      competitionIds: form.competitionIds,
      familyRegistrationOrder: form.familyRegistrationOrder as FamilyRegistrationOrder,
      sex: form.sex,
      firstFemaleRegistrationSqy: form.firstFemaleRegistrationSqy,
      reductionTypes: form.reductionTypes,
      paymentAids: form.paymentAids,
    },
    config
  );
  return issue?.message ?? null;
}

export function registrationStatusChipProps(status: string | undefined): {
  label: string;
  color: "default" | "info" | "warning" | "success" | "error";
} {
  if (status && status in REGISTRATION_STATUS_LABELS) {
    const known = status as RegistrationStatus;
    return {
      label: REGISTRATION_STATUS_LABELS[known],
      color: REGISTRATION_STATUS_COLORS[known],
    };
  }
  return { label: status ?? "Statut inconnu", color: "default" };
}
