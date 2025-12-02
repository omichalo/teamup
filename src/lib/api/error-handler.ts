import { NextResponse } from "next/server";

/**
 * Options pour la gestion d'erreurs
 */
export interface ErrorHandlerOptions {
  /**
   * Contexte de l'erreur (nom de la route, action, etc.)
   */
  context?: string;
  /**
   * Message d'erreur générique à afficher à l'utilisateur
   */
  defaultMessage?: string;
  /**
   * Si true, inclut les détails de l'erreur dans la réponse (déconseillé en production)
   */
  includeDetails?: boolean;
  /**
   * Status HTTP par défaut pour les erreurs non gérées
   */
  defaultStatus?: number;
}

/**
 * Gère les erreurs de manière standardisée et retourne une réponse HTTP appropriée.
 * 
 * @param error - L'erreur à gérer
 * @param options - Options de gestion d'erreurs
 * @returns NextResponse avec l'erreur formatée
 */
export function handleApiError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): NextResponse {
  const {
    context = "API",
    defaultMessage = "Une erreur est survenue",
    includeDetails = process.env.NODE_ENV === "development",
    defaultStatus = 500,
  } = options;

  // Logger l'erreur
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(`❌ [${context}] Erreur:`, errorMessage);
  if (errorStack && includeDetails) {
    console.error(`[${context}] Stack:`, errorStack);
  }

  // Déterminer le status HTTP
  let status = defaultStatus;
  let message = defaultMessage;

  // Gérer les erreurs spécifiques
  if (error instanceof Error) {
    // Erreurs de validation
    if (error.message.includes("invalid") || error.message.includes("missing")) {
      status = 400;
      message = "Données invalides";
    }
    // Erreurs d'authentification
    else if (
      error.message.includes("session") ||
      error.message.includes("auth") ||
      error.message.includes("unauthorized")
    ) {
      status = 401;
      message = "Authentification requise";
    }
    // Erreurs d'autorisation
    else if (
      error.message.includes("permission") ||
      error.message.includes("forbidden") ||
      error.message.includes("access denied")
    ) {
      status = 403;
      message = "Accès refusé";
    }
    // Erreurs de ressource non trouvée
    else if (
      error.message.includes("not found") ||
      error.message.includes("does not exist")
    ) {
      status = 404;
      message = "Ressource non trouvée";
    }
  }

  // Construire la réponse
  const response: {
    error: string;
    message: string;
    details?: string;
  } = {
    error: message,
    message: defaultMessage,
  };

  // Ajouter les détails uniquement en développement ou si explicitement demandé
  if (includeDetails && errorMessage) {
    response.details = errorMessage;
  }

  return NextResponse.json(response, { status });
}

/**
 * Crée une réponse d'erreur formatée.
 * 
 * @param message - Message d'erreur à afficher
 * @param status - Status HTTP (défaut: 400)
 * @param details - Détails supplémentaires (optionnel, masqué en production)
 * @returns NextResponse avec l'erreur formatée
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  details?: string
): NextResponse {
  const response: {
    error: string;
    message: string;
    details?: string;
  } = {
    error: message,
    message,
  };

  // Ajouter les détails uniquement en développement
  if (details && process.env.NODE_ENV === "development") {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Crée une réponse de succès formatée.
 * 
 * @param data - Données à retourner
 * @param status - Status HTTP (défaut: 200)
 * @returns NextResponse avec les données
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status });
}

