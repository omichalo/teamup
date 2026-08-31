import { z } from "zod";
import {
  containsFirebaseSpecialCharacter,
  FIREBASE_SPECIAL_CHARACTER_ERROR_MESSAGE,
} from "@/lib/auth/password-policy";

export const emailSchema = z.string().email("Email invalide");

// Règles de mot de passe Firebase :
// - Longueur minimale : 12 caractères
// - Au moins une majuscule
// - Au moins une minuscule
// - Au moins un chiffre
// - Au moins un caractère spécial parmi la liste Firebase
export const passwordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
  .refine(containsFirebaseSpecialCharacter, {
    message: FIREBASE_SPECIAL_CHARACTER_ERROR_MESSAGE,
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Le mot de passe est requis"),
});

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Les mots de passe ne correspondent pas",
  });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Les mots de passe ne correspondent pas",
  });

