export const SUGGESTION_DESCRIPTION_HTML_MAX_LENGTH = 100_000;
export const SUGGESTION_COMMENT_HTML_MAX_LENGTH = 20_000;
export const SUGGESTION_DESCRIPTION_MIN_TEXT_LENGTH = 10;
export const SUGGESTION_COMMENT_MIN_TEXT_LENGTH = 1;
export const SUGGESTION_DESCRIPTION_EXCERPT_LENGTH = 180;
export const SUGGESTION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const SUGGESTION_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type SuggestionRichTextFormat = "html" | "plain";

export function isAllowedSuggestionImageSrc(value: string): boolean {
  if (!value.trim()) {
    return false;
  }
  if (value.startsWith("/")) {
    return true;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "firebasestorage.googleapis.com" ||
        url.hostname === "storage.googleapis.com" ||
        url.hostname.endsWith(".firebasestorage.app"))
    );
  } catch {
    return false;
  }
}

/** Extraction texte côté client (sans dépendance serveur). */
export function stripSuggestionHtmlText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function getSuggestionDescriptionExcerpt(
  description: string,
  format: SuggestionRichTextFormat
): string {
  const text =
    format === "html" ? stripSuggestionHtmlText(description) : description.trim();

  if (text.length <= SUGGESTION_DESCRIPTION_EXCERPT_LENGTH) {
    return text;
  }

  return `${text.slice(0, SUGGESTION_DESCRIPTION_EXCERPT_LENGTH - 1)}…`;
}
