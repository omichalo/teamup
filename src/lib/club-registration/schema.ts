import { z } from "zod";
import {
  ALL_SLOT_IDS,
  COMPETITION_ID_VALUES,
  JERSEY_SIZES,
  REDUCTION_OPTIONS,
  SECTION_PRINCIPALE_OPTIONS,
} from "./constants";
import { isValidFrenchPhoneSurface, normalizeFrenchPhoneInput } from "./phone-fr";
import { isAtLeast40At, isMinorAt } from "./age";
import {
  createEmptyMedicalVeteranPath,
  deriveMedicalCertificateDeclaration,
  effectiveHadFfttLicense,
  type MedicalQuestionnaire,
  type MedicalVeteranPath,
} from "./medical-dossier";

const sectionIds = SECTION_PRINCIPALE_OPTIONS.map((s) => s.id) as [
  string,
  ...string[],
];

const competitionIds = [...COMPETITION_ID_VALUES] as [string, ...string[]];

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

const medicalYesNoSchema = z.enum(["yes", "no"]);

export const medicalQuestionnaireSchema = z.object({
  /** Obligatoire lorsque le parcours UI affiche le questionnaire (cf. superRefine). */
  summary: z.enum(["all_no", "has_yes"]).optional(),
  answers: z.record(z.string(), medicalYesNoSchema).default({}),
});

export const medicalVeteranPathSchema = z.object({
  hadFfttLicense: medicalYesNoSchema,
  /** Absent ou omis lorsque `hadFfttLicense` vaut `no` (première licence). */
  categoryChanged: medicalYesNoSchema.optional(),
});

export type MedicalQuestionnairePayload = z.infer<typeof medicalQuestionnaireSchema>;
export type MedicalVeteranPathPayload = z.infer<typeof medicalVeteranPathSchema>;

const ffttLicenseLookupSchema = z.object({
  licence: z.string().regex(/^[0-9]{5,12}$/),
  nom: z.string().trim().max(120).optional(),
  prenom: z.string().trim().max(120).optional(),
  isHomme: z.boolean().optional(),
  numClub: z.string().trim().max(40).optional(),
  nomClub: z.string().trim().max(160).optional(),
  categorie: z.string().trim().max(40).optional(),
  typeLicence: z.string().trim().max(20).nullable().optional(),
  certificat: z.string().trim().max(20).optional(),
  nationalite: z.string().trim().max(20).optional(),
  pointsLicence: z.number().nullable().optional(),
});

export const clubRegistrationPayloadSchema = z
  .object({
    /* Bloc adhérent ----------------------------------------------------- */
    adherentRole: adherentRoleSchema,
    ffttLicense: z
      .union([
        z.literal(""),
        z.string().trim().regex(/^[0-9]{5,12}$/, "Numéro de licence FFTT invalide"),
      ])
      .optional(),
    ffttLicenseLookup: ffttLicenseLookupSchema.optional(),
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

    /** Obligatoire si `mainSectionId === "handisport"`. */
    handisportPracticeLevel: z.enum(["leisure", "competition"]).optional(),
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

    /* Valeur orpheline : firstFemaleRegistrationSqy n'a de sens que si sex==="female".
       Côté UI le reducer remet déjà undefined quand on change de sexe, mais on
       refuse défensivement les payloads incohérents reçus par l'API. */
    if (data.sex !== "female" && data.firstFemaleRegistrationSqy !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Le champ « première inscription féminine » n’est applicable qu’au sexe féminin",
        path: ["firstFemaleRegistrationSqy"],
      });
    }

    /* Handisport : type de pratique obligatoire pour la tarification */
    if (data.mainSectionId === "handisport" && !data.handisportPracticeLevel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indiquez si la pratique handisport est en loisir ou en compétition",
        path: ["handisportPracticeLevel"],
      });
    }

    if (data.mainSectionId !== "handisport" && data.handisportPracticeLevel !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Le type de pratique handisport n’est applicable que pour la section handisport",
        path: ["handisportPracticeLevel"],
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

    /* Cohérence section / extension compétiteur : la section compétiteur classique
       (taille de maillot, championnats fédéraux) n'a pas de sens pour handisport
       et sport adapté qui ont leur propre option dédiée dans `competitionIds`. */
    if (
      data.wantsCompetitorExtras &&
      (data.mainSectionId === "handisport" || data.mainSectionId === "sport-adapte")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "La section compétiteur ne s'applique pas aux sections handisport et sport adapté",
        path: ["wantsCompetitorExtras"],
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

    /* Cohérence âge / déclaration médicale : on ne propose pas les options « 40+ »
       à un adhérent qui a moins de 40 ans, et inversement. Le questionnaire « Oui »
       (certificat médical requis) reste disponible quel que soit l'âge. */
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
        message: "Complétez le parcours médical vétéran (licence FFTT).",
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
          "Le parcours licence FFTT vétéran ne s'applique pas aux moins de 40 ans.",
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

    /* Cohérence âge / autorisations légales : seuls les mineurs sont concernés par
       les autorisations « actes médicaux d'urgence » et « prise en charge à l'heure
       des cours ». L'UI les masque pour les majeurs et les exige (case cochée) pour
       les mineurs. Côté serveur on refuse les combinaisons incohérentes. */
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

    /* Cohérence âge / rôle */
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
