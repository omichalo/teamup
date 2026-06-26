import { extractSuggestionImageUrlsFromHtml } from "@/lib/app-suggestions/suggestion-image-urls";
import { cleanupSuggestionImages } from "@/components/app-suggestions/rich-text/cleanup-suggestion-images";

/** Supprime les images de brouillon absentes du HTML de référence. */
export async function cleanupDraftSuggestionImages(
  draftHtml: string,
  referenceHtml: string
): Promise<void> {
  const referenceUrls = new Set(extractSuggestionImageUrlsFromHtml(referenceHtml));
  const orphanUrls = extractSuggestionImageUrlsFromHtml(draftHtml).filter(
    (url) => !referenceUrls.has(url)
  );
  if (orphanUrls.length === 0) {
    return;
  }
  await cleanupSuggestionImages(orphanUrls);
}

/** Supprime toutes les images hébergées présentes dans un brouillon annulé. */
export async function cleanupAllDraftSuggestionImages(
  draftHtml: string
): Promise<void> {
  const urls = extractSuggestionImageUrlsFromHtml(draftHtml);
  if (urls.length === 0) {
    return;
  }
  await cleanupSuggestionImages(urls);
}
