export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      response.ok
        ? "Réponse serveur invalide"
        : text.startsWith("<")
          ? `Erreur HTTP ${response.status}`
          : text.slice(0, 200)
    );
  }
}
