import { readJsonResponse } from "@/lib/http/read-json-response";

export async function uploadSuggestionImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/club/suggestions/images", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const payload = await readJsonResponse<{ url?: string; error?: string }>(
    response
  );
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "Impossible d'envoyer l'image");
  }

  return payload.url;
}
