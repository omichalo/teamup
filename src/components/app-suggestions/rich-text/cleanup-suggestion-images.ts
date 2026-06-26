import { readJsonResponse } from "@/lib/http/read-json-response";

/** Supprime des images uploadées mais non utilisées (annulation de brouillon). */
export async function cleanupSuggestionImages(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return;
  }

  const response = await fetch("/api/club/suggestions/images", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls: unique }),
  });

  if (!response.ok) {
    const payload = await readJsonResponse<{ error?: string }>(response);
    throw new Error(payload.error || "Impossible de nettoyer les images");
  }
}
