export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { resolveSuggestionSession } from "@/lib/app-suggestions/api-auth";
import { uploadSuggestionImage } from "@/lib/app-suggestions/upload-image";
import { deleteSuggestionImagesForUid } from "@/lib/app-suggestions/suggestion-image-storage";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";

const cleanupImagesSchema = z.object({
  urls: z.array(z.string().url()).max(25),
});

/** POST /api/club/suggestions/images — upload d'une image pour une description riche. */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  const rateLimitResult = checkRateLimit(
    `app-suggestion-image:${auth.session.uid}`,
    20,
    60 * 60 * 1000
  );
  if (!rateLimitResult.allowed) {
    return jsonNoStore({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonNoStore({ error: "Fichier image requis" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadSuggestionImage({
      uid: auth.session.uid,
      buffer,
      contentType: file.type,
    });

    return jsonNoStore({ url }, { status: 201 });
  } catch (error) {
    console.error("[api/club/suggestions/images POST]", error);
    const message = formatSuggestionImageUploadError(error);
    return jsonNoStore({ error: message }, { status: 400 });
  }
}

function formatSuggestionImageUploadError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Impossible d'envoyer l'image";
  }

  if (error.message.includes("Bucket Firebase Storage non configuré")) {
    return "Stockage d'images non configuré côté serveur";
  }

  if (error.message.includes("Le bucket Storage n'existe pas")) {
    return error.message;
  }

  if (error.message.includes("bucket does not exist")) {
    return "Le bucket Storage n'existe pas. Activez Firebase Storage dans la console ou définissez FIREBASE_STORAGE_BUCKET.";
  }

  return error.message || "Impossible d'envoyer l'image";
}

/** DELETE /api/club/suggestions/images — supprime des images orphelines du brouillon. */
export async function DELETE(req: Request) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = cleanupImagesSchema.safeParse(body);
  if (!parsed.success) {
    return jsonNoStore({ error: "Données invalides" }, { status: 400 });
  }

  try {
    await deleteSuggestionImagesForUid(auth.session.uid, parsed.data.urls);
    return jsonNoStore({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[api/club/suggestions/images DELETE]", error);
    return jsonNoStore({ error: "Impossible de supprimer les images" }, { status: 500 });
  }
}
