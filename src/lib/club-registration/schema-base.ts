import { z } from "zod";
import { normalizeLastName } from "@/lib/shared/person-name-format";
import { isValidFrenchPhoneSurface, normalizeFrenchPhoneInput } from "./phone-fr";

export const lastNameFieldSchema = z
  .string()
  .trim()
  .min(1, "Le nom est obligatoire")
  .max(120)
  .transform(normalizeLastName);

const medicalYesNoSchema = z.enum(["yes", "no"]);

/** Représentant légal (mère, père, tuteur, autre). 0 à 2 par dossier. */
export const representativeSchema = z.object({
  role: z.enum(["mother", "father", "guardian", "self", "other"]),
  firstName: z.string().trim().min(1, "Le prénom est obligatoire").max(120),
  lastName: lastNameFieldSchema,
  email: z.string().trim().email("Adresse e-mail invalide"),
  phone: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .refine(isValidFrenchPhoneSurface, {
      message:
        "Numéro de téléphone français invalide (10 chiffres commençant par 0, ou format +33).",
    })
    .transform((s) => normalizeFrenchPhoneInput(s)!),
});

export type Representative = z.infer<typeof representativeSchema>;

export const adherentRoleSchema = z.enum([
  "self",
  "minor_dependent",
  "other_adult",
]);
export type AdherentRole = z.infer<typeof adherentRoleSchema>;

export const medicalQuestionnaireSchema = z.object({
  summary: z
    .enum(["all_no", "has_yes", "pps_declared", "certificate_choice"])
    .optional(),
  answers: z.record(z.string(), medicalYesNoSchema).default({}),
});

export const medicalVeteranPathSchema = z.object({
  hadFfttLicense: medicalYesNoSchema,
  categoryChanged: medicalYesNoSchema.optional(),
});

export type MedicalQuestionnairePayload = z.infer<typeof medicalQuestionnaireSchema>;
export type MedicalVeteranPathPayload = z.infer<typeof medicalVeteranPathSchema>;

export const ffttLicenseLookupSchema = z.object({
  licence: z.string().regex(/^[0-9]{5,12}$/),
  nom: z.optional(z.string().trim().max(120).transform(normalizeLastName)),
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
