import { z } from "zod";
import {
  getAllSlotIds,
  getEnabledCompetitionIds,
  getEnabledReductionIds,
  getEnabledSectionIds,
  getSchoolPickupSlotIds,
} from "@/lib/club-registration-config/helpers";
import { getToggleAidRules } from "@/lib/club-registration-config/aid-rules";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { preprocessRegistrationPayloadInput } from "./reduction-reference-codes";
import { isAtLeast40At, isMinorAt } from "./age";
import {
  createEmptyMedicalVeteranPath,
  deriveMedicalCertificateDeclaration,
  effectiveHadFfttLicense,
  type MedicalQuestionnaire,
  type MedicalVeteranPath,
} from "./medical-dossier";
import { APPLICANT_NOTES_MAX_LENGTH } from "./applicant-notes";
import {
  paymentPayloadFieldsSchema,
  refinePaymentPayload,
} from "./payment-payload-schema";
import { isValidFrenchPhoneSurface, normalizeFrenchPhoneInput } from "./phone-fr";
import { calculateQuoteFromConfig } from "@/lib/club-registration-config/pricing-engine";
import { isValidVoluntaryDonationCents, getMembershipNetCents, computeInvoiceTotalCents } from "@/lib/pricing/donation-discount";
import { buildPricingContext } from "@/lib/pricing/build-context";
import {
  adherentRoleSchema,
  ffttLicenseLookupSchema,
  medicalQuestionnaireSchema,
  medicalVeteranPathSchema,
  lastNameFieldSchema,
  representativeSchema,
} from "./schema-base";

const frenchPhoneRequired = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine(isValidFrenchPhoneSurface, {
    message:
      "Numéro de téléphone français invalide (10 chiffres commençant par 0, ou format +33).",
  })
  .transform((s) => normalizeFrenchPhoneInput(s)!);

const frenchPhoneOptional = z
  .union([z.literal(""), z.string().trim().max(40)])
  .optional()
  .refine((v) => v === undefined || v === "" || isValidFrenchPhoneSurface(v), {
    message:
      "Numéro de téléphone français invalide (10 chiffres commençant par 0, ou format +33).",
  })
  .transform((v) => {
    if (v === undefined || v === "") return undefined;
    return normalizeFrenchPhoneInput(v)!;
  });

function asNonEmptyTuple(ids: string[]): [string, ...string[]] {
  if (ids.length === 0) {
    return ["__invalid__"];
  }
  return ids as [string, ...string[]];
}

export function buildRegistrationPayloadSchema(config: RegistrationConfigV1) {
  const sectionIds = asNonEmptyTuple(getEnabledSectionIds(config));
  const competitionIds = asNonEmptyTuple(getEnabledCompetitionIds(config));
  const reductionIds = asNonEmptyTuple(getEnabledReductionIds(config));
  const jerseySizes = asNonEmptyTuple(config.uiCopy.jerseySizes);
  const allSlotIds = getAllSlotIds(config);
  const schoolPickupSlotIds = getSchoolPickupSlotIds(config);
  const toggleAidRules = getToggleAidRules(config);

  return z.preprocess(
    preprocessRegistrationPayloadInput,
    z
    .object({
      adherentRole: adherentRoleSchema,
      wasSqyMemberLastYear: z.boolean(),
      ffttLicense: z
        .union([
          z.literal(""),
          z.string().trim().regex(/^[0-9]{5,12}$/, "Numéro de licence invalide"),
        ])
        .optional(),
      ffttLicenseLookup: ffttLicenseLookupSchema.optional(),
      firstName: z.string().trim().min(1, "Le prénom est obligatoire").max(120),
      lastName: lastNameFieldSchema,
      sex: z.enum(["female", "male", "other"]),
      birthCity: z.string().trim().min(1, "La ville de naissance est obligatoire").max(120),
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)"),
      adherentEmail: z
        .union([z.literal(""), z.string().trim().email("Adresse e-mail invalide")])
        .optional(),
      adherentPhonePrimary: frenchPhoneRequired,
      adherentPhoneSecondary: frenchPhoneOptional,
      addressLine1: z.string().trim().min(1, "L’adresse est obligatoire").max(200),
      addressLine2: z.union([z.literal(""), z.string().trim().max(200)]).optional(),
      postalCode: z
        .string()
        .trim()
        .regex(/^[0-9]{5}$/, "Code postal français attendu (5 chiffres)"),
      city: z.string().trim().min(1, "La ville est obligatoire").max(120),
      representatives: z
        .array(representativeSchema)
        .max(2, "Maximum 2 représentants légaux")
        .default([]),
      mainSectionId: z.enum(sectionIds),
      additionalSectionIds: z.array(z.enum(sectionIds)).default([]),
      slotIds: z.array(z.string()).min(1, "Sélectionnez au moins un créneau"),
      schoolPickupSlotIds: z.array(z.string()).default([]),
      medicalQuestionnaire: medicalQuestionnaireSchema,
      medicalVeteranPath: medicalVeteranPathSchema.optional(),
      medicalCertificateDeclaration: z.enum([
        "under_40_all_no",
        "over_40_cert_unchanged_all_no",
        "over_40_first_or_changed_certificate_required",
        "questionnaire_yes_certificate_required",
      ]),
      wantsRegistrationCertificate: z.boolean(),
      familyRegistrationOrder: z.enum(["none", "second", "third_or_more"]),
      reductionTypes: z.array(z.enum(reductionIds)).default([]),
      reductionReferenceCodes: z.record(z.string(), z.string()).default({}),
      firstFemaleRegistrationSqy: z.boolean().optional(),
      photoConsent: z.enum(["accept", "refuse"]),
      emergencyMedicalAuthorization: z.enum(["yes", "not_applicable_adult"]),
      supervisionAcknowledgement: z.enum(["yes", "not_applicable_adult"]),
      internalRulesAccepted: z.literal(true),
      wantsCompetitorExtras: z.boolean(),
      competitionJerseySize: z.enum(jerseySizes).optional(),
      wantsOptionalJersey: z.boolean().default(false),
      optionalJerseySize: z.enum(jerseySizes).optional(),
      competitionIds: z.array(z.enum(competitionIds)).default([]),
      applicantNotes: z.preprocess(
        (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
        z.string().trim().max(APPLICANT_NOTES_MAX_LENGTH).optional()
      ),
      ...paymentPayloadFieldsSchema,
    })
    .superRefine((data, ctx) => {
      for (const id of data.slotIds) {
        if (!allSlotIds.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Créneau inconnu",
            path: ["slotIds"],
          });
          return;
        }
      }

      const selectedSlots = new Set(data.slotIds);
      for (const id of data.schoolPickupSlotIds) {
        if (!schoolPickupSlotIds.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Créneau de récupération scolaire inconnu",
            path: ["schoolPickupSlotIds"],
          });
          return;
        }
        if (!selectedSlots.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "La récupération à la sortie de l’école ne peut être demandée que pour un créneau sélectionné",
            path: ["schoolPickupSlotIds"],
          });
          return;
        }
      }

      const uniqueAdditional = new Set(data.additionalSectionIds);
      if (uniqueAdditional.has(data.mainSectionId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Les autres sections ne peuvent pas reprendre la section principale",
          path: ["additionalSectionIds"],
        });
      }

      if (data.sex === "female" && data.firstFemaleRegistrationSqy === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Indiquez s’il s’agit de votre première inscription au club",
          path: ["firstFemaleRegistrationSqy"],
        });
      }

      if (data.sex !== "female" && data.firstFemaleRegistrationSqy !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Le champ « première inscription féminine » n’est applicable qu’au sexe féminin",
          path: ["firstFemaleRegistrationSqy"],
        });
      }

      if (data.wantsCompetitorExtras && !data.competitionJerseySize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Taille de maillot obligatoire pour la section compétiteur",
          path: ["competitionJerseySize"],
        });
      }

      if (data.wantsCompetitorExtras && data.wantsOptionalJersey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Le maillot optionnel ne s'applique pas avec l'inscription en section compétiteur",
          path: ["wantsOptionalJersey"],
        });
      }

      if (!data.wantsCompetitorExtras && data.wantsOptionalJersey && !data.optionalJerseySize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Indiquez une taille de maillot pour la commande",
          path: ["optionalJerseySize"],
        });
      }

      if (!data.wantsOptionalJersey && data.optionalJerseySize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La taille de maillot optionnel ne s'applique pas sans commande de maillot",
          path: ["optionalJerseySize"],
        });
      }

      if (data.adherentRole === "minor_dependent" && data.representatives.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Au moins un représentant légal est requis pour l'inscription d'un mineur",
          path: ["representatives"],
        });
      }

      if (data.adherentRole !== "minor_dependent" && data.representatives.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Les représentants légaux ne s'appliquent qu'à l'inscription d'un mineur",
          path: ["representatives"],
        });
      }

      const atLeast40 = isAtLeast40At(data.birthDate);
      const decl = data.medicalCertificateDeclaration;
      const hasVerifiedFfttLicense = Boolean(data.ffttLicenseLookup?.licence);
      const veteranPath: MedicalVeteranPath = data.medicalVeteranPath
        ? {
            hadFfttLicense: data.medicalVeteranPath.hadFfttLicense,
            categoryChanged: data.medicalVeteranPath.categoryChanged ?? "",
          }
        : createEmptyMedicalVeteranPath();
      const questionnaire: MedicalQuestionnaire = {
        summary: data.medicalQuestionnaire.summary ?? "",
        answers: data.medicalQuestionnaire.answers,
      };
      const derivedDecl = deriveMedicalCertificateDeclaration({
        birthDate: data.birthDate,
        questionnaire,
        veteranPath,
        hasVerifiedFfttLicense,
      });
      if (derivedDecl !== decl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "La déclaration médicale ne correspond pas aux réponses du dossier médical.",
          path: ["medicalCertificateDeclaration"],
        });
      }
      if (atLeast40 && !data.medicalVeteranPath) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Complétez le parcours médical vétéran (licence).",
          path: ["medicalVeteranPath"],
        });
      }

      const needsQuestionnaireSummary =
        !atLeast40 ||
        (effectiveHadFfttLicense(veteranPath, hasVerifiedFfttLicense) === "yes" &&
          veteranPath.categoryChanged === "no");
      if (needsQuestionnaireSummary && !data.medicalQuestionnaire.summary) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Indiquez le résultat de votre questionnaire de santé.",
          path: ["medicalQuestionnaire", "summary"],
        });
      }

      if (
        atLeast40 &&
        data.medicalVeteranPath &&
        effectiveHadFfttLicense(veteranPath, hasVerifiedFfttLicense) === "yes" &&
        data.medicalVeteranPath.categoryChanged === undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Indiquez si votre catégorie vétéran a changé.",
          path: ["medicalVeteranPath", "categoryChanged"],
        });
      }

      if (!atLeast40 && data.medicalVeteranPath) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Le parcours licence vétéran ne s'applique pas aux moins de 40 ans.",
          path: ["medicalVeteranPath"],
        });
      }
      if (
        !atLeast40 &&
        (decl === "over_40_cert_unchanged_all_no" ||
          decl === "over_40_first_or_changed_certificate_required")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Cette option est réservée aux adhérents de 40 ans et plus ; choisissez l'option < 40 ans appropriée.",
          path: ["medicalCertificateDeclaration"],
        });
      }
      if (atLeast40 && decl === "under_40_all_no") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "L'option « moins de 40 ans » n'est pas applicable à votre date de naissance.",
          path: ["medicalCertificateDeclaration"],
        });
      }

      const minor = isMinorAt(data.birthDate);
      if (!minor && !data.adherentEmail?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "L'e-mail de contact est obligatoire pour un adhérent majeur.",
          path: ["adherentEmail"],
        });
      }
      if (minor) {
        if (data.emergencyMedicalAuthorization !== "yes") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "L'autorisation d'actes médicaux d'urgence est obligatoire pour un mineur.",
            path: ["emergencyMedicalAuthorization"],
          });
        }
        if (data.supervisionAcknowledgement !== "yes") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "L'engagement de prise en charge à l'heure des cours est obligatoire pour un mineur.",
            path: ["supervisionAcknowledgement"],
          });
        }
      } else {
        if (data.emergencyMedicalAuthorization !== "not_applicable_adult") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "L'autorisation d'actes médicaux d'urgence ne s'applique pas à un adhérent majeur.",
            path: ["emergencyMedicalAuthorization"],
          });
        }
        if (data.supervisionAcknowledgement !== "not_applicable_adult") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "L'engagement de prise en charge à l'heure des cours ne s'applique pas à un adhérent majeur.",
            path: ["supervisionAcknowledgement"],
          });
        }
      }

      if (minor && data.adherentRole === "self") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "La date de naissance correspond à un mineur : indiquez un représentant légal et passez en mode \"mineur\".",
          path: ["adherentRole"],
        });
      }

      if (data.representatives.length === 2) {
        const a = data.representatives[0].email.trim().toLowerCase();
        const b = data.representatives[1].email.trim().toLowerCase();
        if (a && b && a === b) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Les deux représentants doivent avoir des emails distincts",
            path: ["representatives"],
          });
        }
      }

      for (const rule of toggleAidRules) {
        if (!data.reductionTypes.includes(rule.id)) continue;
        const code = data.reductionReferenceCodes[rule.id]?.trim() ?? "";
        const maxLength = rule.form.referenceCode.maxLength ?? 80;
        if (code.length > maxLength) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${rule.form.referenceCode.label} : ${maxLength} caractères maximum`,
            path: ["reductionReferenceCodes", rule.id],
          });
        }
      }

      const pricingCtx = buildPricingContext({
        birthDate: data.birthDate,
        mainSectionId: data.mainSectionId,
        slotIds: data.slotIds,
        additionalSectionIds: data.additionalSectionIds,
        wantsCompetitorExtras: data.wantsCompetitorExtras,
        wantsOptionalJersey: data.wantsOptionalJersey,
        competitionIds: data.competitionIds,
        familyRegistrationOrder: data.familyRegistrationOrder,
        sex: data.sex,
        firstFemaleRegistrationSqy: data.firstFemaleRegistrationSqy,
        reductionTypes: data.reductionTypes,
      });
      const quote = calculateQuoteFromConfig(pricingCtx, config);

      if (!isValidVoluntaryDonationCents(data.voluntaryDonationCents)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le don libre doit être de 0 € ou d'au moins 1 €.",
          path: ["voluntaryDonationCents"],
        });
      }

      const membershipNet = getMembershipNetCents(quote);
      const invoiceTotalCents = computeInvoiceTotalCents(
        quote.totalCents,
        data.voluntaryDonationCents,
        membershipNet
      );
      refinePaymentPayload(data, ctx, invoiceTotalCents);
    })
  );
}

export type ClubRegistrationPayload = z.infer<
  ReturnType<typeof buildRegistrationPayloadSchema>
>;
