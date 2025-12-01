import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdminWithEmailVerified } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";
import { validateString, validateId } from "@/lib/api/validation-helpers";
import { withRateLimit } from "@/lib/api/rate-limit-middleware";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminWithEmailVerified(req);
    if (auth instanceof Response) return auth;

    const locationsRef = adminDb.collection("locations");
    const snapshot = await locationsRef.orderBy("name", "asc").get();

    const locations = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name as string,
      createdAt:
        doc.data().createdAt?.toDate?.()?.toISOString() ||
        new Date().toISOString(),
      updatedAt:
        doc.data().updatedAt?.toDate?.()?.toISOString() ||
        new Date().toISOString(),
    }));

    return createSecureResponse({ success: true, locations });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/admin/locations",
      defaultMessage: "Erreur lors de la récupération des lieux",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminWithEmailVerified(req);
    if (auth instanceof Response) return auth;

    // Rate limiting par utilisateur (10 requêtes par minute)
    const rateLimitError = withRateLimit({
      key: `admin-locations-post:${auth.uid}`,
      maxRequests: 10,
      windowMs: 60 * 1000,
      errorMessage: "Trop de requêtes. Veuillez patienter avant de réessayer.",
    });
    if (rateLimitError) return rateLimitError;

    const { name } = await req.json();

    const validatedName = validateString(name, "name");
    if (validatedName instanceof Response) return validatedName;

    const locationsRef = adminDb.collection("locations");
    const now = new Date();

    // Vérifier si le lieu existe déjà
    const existingSnapshot = await locationsRef
      .where("name", "==", validatedName)
      .get();

    if (!existingSnapshot.empty) {
      return createErrorResponse("Ce lieu existe déjà", 400);
    }

    const docRef = await locationsRef.add({
      name: validatedName,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });

    return createSecureResponse({
      success: true,
      location: {
        id: docRef.id,
        name: validatedName,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/admin/locations",
      defaultMessage: "Erreur lors de l'ajout du lieu",
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdminWithEmailVerified(req);
    if (auth instanceof Response) return auth;

    // Rate limiting par utilisateur (10 requêtes par minute)
    const rateLimitError = withRateLimit({
      key: `admin-locations-delete:${auth.uid}`,
      maxRequests: 10,
      windowMs: 60 * 1000,
      errorMessage: "Trop de requêtes. Veuillez patienter avant de réessayer.",
    });
    if (rateLimitError) return rateLimitError;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return createErrorResponse("L'ID du lieu est requis", 400);
    }

    const idError = validateId(id, "id");
    if (idError) return idError;

    const locationRef = adminDb.collection("locations").doc(id);
    await locationRef.delete();

    return createSecureResponse({ success: true });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/admin/locations",
      defaultMessage: "Erreur lors de la suppression du lieu",
    });
  }
}
