import { z } from "zod";
import {
  ALL_SLOT_IDS,
  COMPETITION_OPTIONS,
  JERSEY_SIZES,
  REDUCTION_OPTIONS,
  SECTION_PRINCIPALE_OPTIONS,
} from "./constants";
import { isValidFrenchPhoneSurface, normalizeFrenchPhoneInput } from "./phone-fr";
import { isMinorAt } from "./age";

const sectionIds = SECTION_PRINCIPALE_OPTIONS.map((s) => s.id) as [
  string,
  ...string[],
];

const competitionIds = COMPETITION_OPTIONS.map((c) => c.id) as [
  string,
  ...string[],
];

const reductionIds = REDUCTION_OPTIONS.map((r) => r.id) as [string, ...string[]];

/**
 * Sous-schéma téléphone FR : surface acceptée puis normalisée (10 chiffres commençant par 0).
 */
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

/** Représentant légal (mère, père, tuteur, autre). 0 à 2 par dossier. */
export const representativeSchema = z.object({
  role: z.enum(["mother", "father", "guardian", "self", "other"]),
  firstName: z.string().trim().min(1, "Le prénom est obligatoire").max(120),
  lastName: z.string().trim().min(1, "Le nom est obligatoire").max(120),
  email: z.string().trim().email("Adresse e-mail invalide"),
  phone: frenchPhoneRequired,
});

export type Representative = z.infer<typeof representativeSchema>;

/** Rôle du soumettant vis-à-vis de l'adhérent (qui remplit le formulaire et pour qui). */
export const adherentRoleSchema = z.enum([
  "self",
  "minor_dependent",
  "other_adult",
]);
export type AdherentRole = z.infer<typeof adherentRoleSchema>;

export const clubRegistrationPayloadSchema = z
  .object({
    /* Bloc adhérent ----------------------------------------------------- */
    adherentRole: adherentRoleSchema,
    firstName: z.string().trim().min(1, "Le prénom est obligatoire").max(120),
    lastName: z.string().trim().min(1, "Le nom est obligatoire").max(120),
    sex: z.enum(["female", "male", "other"]),
    birthCity: z.string().trim().min(1, "La ville de naissance est obligatoire").max(120),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)"),
    adherentEmail: z
      .union([z.literal(""), z.string().trim().email("Adresse e-mail invalide")])
      .optional(),
    adherentPhonePrimary: frenchPhoneRequired,
    adherentPhoneSecondary: frenchPhoneOptional,

    /* Adresse postale --------------------------------------------------- */
    addressLine1: z.string().trim().min(1, "L’adresse est obligatoire").max(200),
    addressLine2: z.union([z.literal(""), z.string().trim().max(200)]).optional(),
    postalCode: z
      .string()
      .trim()
      .regex(/^[0-9]{5}$/, "Code postal français attendu (5 chiffres)"),
    city: z.string().trim().min(1, "La ville est obligatoire").max(120),

    /* Représentants légaux (0..2) -------------------------------------- */
    representatives: z.array(representativeSchema).max(2, "Maximum 2 représentants légaux").default([]),

    /* Sections / créneaux ---------------------------------------------- */
    mainSectionId: z.enum(sectionIds),
    additionalSectionIds: z.array(z.enum(sectionIds)).default([]),
    slotIds: z.array(z.string()).min(1, "Sélectionnez au moins un créneau"),

    /* Médical / aides -------------------------------------------------- */
    medicalCertificateDeclaration: z.enum([
      "under_40_all_no",
      "over_40_cert_unchanged_all_no",
      "questionnaire_yes_certificate_required",
    ]),
    wantsRegistrationCertificate: z.boolean(),
    familyRegistrationOrder: z.enum(["none", "second", "third_or_more"]),
    reductionTypes: z.array(z.enum(reductionIds)).default([]),
    passSportCode: z.union([z.literal(""), z.string().trim().max(80)]).optional(),
    firstFemaleRegistrationSqy: z.boolean().optional(),

    /* Autorisations ---------------------------------------------------- */
    photoConsent: z.enum(["accept", "refuse"]),
    emergencyMedicalAuthorization: z.enum(["yes", "not_applicable_adult"]),
    supervisionAcknowledgement: z.enum(["yes", "not_applicable_adult"]),
    internalRulesAccepted: z.literal(true),

    /* Section compétiteur --------------------------------------------- */
    wantsCompetitorExtras: z.boolean(),
    competitionJerseySize: z.enum(JERSEY_SIZES).optional(),
    competitionIds: z.array(z.enum(competitionIds)).default([]),
  })
  .superRefine((data, ctx) => {
    /* Créneaux connus */
    for (const id of data.slotIds) {
      if (!ALL_SLOT_IDS.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Créneau inconnu",
          path: ["slotIds"],
        });
        return;
      }
    }

    /* Sections additionnelles ne reprennent pas la principale */
    const uniqueAdditional = new Set(data.additionalSectionIds);
    if (uniqueAdditional.has(data.mainSectionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Les autres sections ne peuvent pas reprendre la section principale",
        path: ["additionalSectionIds"],
      });
    }

    /* Femme : préciser si première inscription féminine au club */
    if (data.sex === "female" && data.firstFemaleRegistrationSqy === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indiquez s’il s’agit de votre première inscription au club",
        path: ["firstFemaleRegistrationSqy"],
      });
    }

    /* Compétiteur : taille de maillot obligatoire */
    if (data.wantsCompetitorExtras && !data.competitionJerseySize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Taille de maillot obligatoire pour la section compétiteur",
        path: ["competitionJerseySize"],
      });
    }

    /* Mineur dépendant : au moins un représentant légal */
    if (data.adherentRole === "minor_dependent" && data.representatives.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Au moins un représentant légal est requis pour l'inscription d'un mineur",
        path: ["representatives"],
      });
    }

    /* Adulte (self / other_adult) : pas de représentants légaux */
    if (data.adherentRole !== "minor_dependent" && data.representatives.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Les représentants légaux ne s'appliquent qu'à l'inscription d'un mineur",
        path: ["representatives"],
      });
    }

    /* Cohérence âge / rôle */
    const minor = isMinorAt(data.birthDate);
    if (minor && data.adherentRole === "self") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "La date de naissance correspond à un mineur : indiquez un représentant légal et passez en mode \"mineur\".",
        path: ["adherentRole"],
      });
    }
    if (minor && data.adherentRole === "minor_dependent" && data.representatives.length === 0) {
      // déjà couvert plus haut, pas de doublon ici
    }

    /* Emails distincts entre les représentants */
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
  });

export type ClubRegistrationPayload = z.infer<typeof clubRegistrationPayloadSchema>;
