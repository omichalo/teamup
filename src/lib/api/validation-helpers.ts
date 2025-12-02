import { createErrorResponse } from "@/lib/api/error-handler";
import { NextResponse } from "next/server";

/**
 * Valide qu'une valeur est une string non vide (après trim).
 * Retourne la string validée (trimmed) ou une erreur 400.
 * 
 * @param value - La valeur à valider
 * @param fieldName - Nom du champ
 * @param minLength - Longueur minimale (défaut: 1)
 * @param maxLength - Longueur maximale (optionnel)
 * @returns La string validée (trimmed) ou NextResponse avec erreur 400
 */
export function validateString(
  value: unknown,
  fieldName: string,
  minLength: number = 1,
  maxLength?: number
): string | NextResponse {
  if (!value || typeof value !== "string") {
    return createErrorResponse(`${fieldName} requis et doit être une chaîne de caractères`, 400);
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return createErrorResponse(
      `${fieldName} doit contenir au moins ${minLength} caractère${minLength > 1 ? "s" : ""}`,
      400
    );
  }

  if (maxLength && trimmed.length > maxLength) {
    return createErrorResponse(
      `${fieldName} ne doit pas dépasser ${maxLength} caractères`,
      400
    );
  }

  return trimmed;
}

/**
 * Valide le format d'un email
 * 
 * @param email - L'email à valider
 * @returns true si l'email est valide, false sinon
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valide qu'un email est présent et au bon format.
 * Retourne une erreur 400 si invalide.
 * 
 * @param email - L'email à valider
 * @param fieldName - Nom du champ (par défaut: "email")
 * @returns null si valide, NextResponse avec erreur 400 si invalide
 */
export function validateEmail(
  email: unknown,
  fieldName: string = "email"
): ReturnType<typeof createErrorResponse> | null {
  if (!email || typeof email !== "string") {
    return createErrorResponse(`${fieldName} requis`, 400);
  }

  if (!isValidEmail(email)) {
    return createErrorResponse(`Format d'${fieldName} invalide`, 400);
  }

  return null;
}

/**
 * Valide qu'un ID est présent et au bon format (alphanumérique, tirets, underscores).
 * Retourne une erreur 400 si invalide.
 * 
 * @param id - L'ID à valider
 * @param fieldName - Nom du champ (ex: "teamId", "userId")
 * @returns null si valide, NextResponse avec erreur 400 si invalide
 */
export function validateId(
  id: unknown,
  fieldName: string
): ReturnType<typeof createErrorResponse> | null {
  if (!id || typeof id !== "string") {
    return createErrorResponse(`${fieldName} requis`, 400);
  }

  // Format valide : alphanumérique, tirets, underscores
  const validIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validIdPattern.test(id)) {
    return createErrorResponse(`Format de ${fieldName} invalide`, 400);
  }

  return null;
}

/**
 * Valide qu'une valeur est présente (non null, non undefined, non vide si string).
 * Retourne une erreur 400 si invalide.
 * 
 * @param value - La valeur à valider
 * @param fieldName - Nom du champ
 * @returns null si valide, NextResponse avec erreur 400 si invalide
 */
export function validateRequired(
  value: unknown,
  fieldName: string
): ReturnType<typeof createErrorResponse> | null {
  if (value === null || value === undefined) {
    return createErrorResponse(`${fieldName} requis`, 400);
  }

  if (typeof value === "string" && value.trim() === "") {
    return createErrorResponse(`${fieldName} requis`, 400);
  }

  return null;
}

/**
 * Valide plusieurs champs requis en une seule fois.
 * Retourne la première erreur trouvée, ou null si tout est valide.
 * 
 * @param fields - Objet avec les champs à valider { fieldName: value }
 * @returns null si tout est valide, NextResponse avec erreur 400 si invalide
 */
export function validateRequiredFields(
  fields: Record<string, unknown>
): ReturnType<typeof createErrorResponse> | null {
  for (const [fieldName, value] of Object.entries(fields)) {
    const error = validateRequired(value, fieldName);
    if (error) return error;
  }
  return null;
}

/**
 * Valide qu'un nombre est un entier positif.
 * Retourne une erreur 400 si invalide.
 * 
 * @param value - La valeur à valider
 * @param fieldName - Nom du champ
 * @returns null si valide, NextResponse avec erreur 400 si invalide
 */
export function validatePositiveInteger(
  value: unknown,
  fieldName: string
): ReturnType<typeof createErrorResponse> | null {
  if (value === null || value === undefined) {
    return createErrorResponse(`${fieldName} requis`, 400);
  }

  const num = typeof value === "string" ? parseInt(value, 10) : Number(value);
  if (Number.isNaN(num) || !Number.isInteger(num) || num < 0) {
    return createErrorResponse(`${fieldName} doit être un entier positif`, 400);
  }

  return null;
}

