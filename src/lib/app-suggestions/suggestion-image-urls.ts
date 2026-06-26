const IMG_SRC_RE = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const SUGGESTION_IMAGE_PREFIX = "app-suggestions/";

/** Extrait les URLs d'images d'un HTML de description ou commentaire. */
export function extractSuggestionImageUrlsFromHtml(html: string): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(IMG_SRC_RE)) {
    const src = match[1]?.trim();
    if (src) {
      urls.add(src);
    }
  }
  return [...urls];
}

/** Chemin objet GCS pour une URL d'image d'idée hébergée par l'app. */
export function resolveSuggestionImageObjectPath(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "firebasestorage.googleapis.com") {
      const match = /^\/v0\/b\/[^/]+\/o\/(.+)$/.exec(parsed.pathname);
      if (!match?.[1]) {
        return null;
      }
      return decodeURIComponent(match[1]);
    }

    if (parsed.hostname === "storage.googleapis.com") {
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length < 2) {
        return null;
      }
      return segments.slice(1).join("/");
    }
  } catch {
    return null;
  }

  return null;
}

export function isSuggestionImageOwnedByUid(
  imageUrl: string,
  ownerUid: string
): boolean {
  const objectPath = resolveSuggestionImageObjectPath(imageUrl);
  if (!objectPath?.startsWith(SUGGESTION_IMAGE_PREFIX)) {
    return false;
  }
  return objectPath.startsWith(`${SUGGESTION_IMAGE_PREFIX}${ownerUid}/`);
}

/** Images présentes avant mais absentes après édition (orphelines potentielles). */
export function collectOrphanedSuggestionImageUrls(
  previousHtml: string,
  nextHtml: string
): string[] {
  const nextUrls = new Set(extractSuggestionImageUrlsFromHtml(nextHtml));
  return extractSuggestionImageUrlsFromHtml(previousHtml).filter(
    (url) => !nextUrls.has(url)
  );
}
