import { useCallback, useRef } from "react";
import { collectOrphanedSuggestionImageUrls } from "@/lib/app-suggestions/suggestion-image-urls";
import { cleanupSuggestionImages } from "@/components/app-suggestions/rich-text/cleanup-suggestion-images";

/** Supprime les images retirées du HTML pendant l'édition (upload puis suppression). */
export function useSuggestionEditorImageCleanup(onChange: (html: string) => void) {
  const previousHtmlRef = useRef("<p></p>");

  const syncHtml = useCallback((html: string) => {
    previousHtmlRef.current = html;
  }, []);

  const handleChange = useCallback(
    (nextHtml: string) => {
      const orphanedUrls = collectOrphanedSuggestionImageUrls(
        previousHtmlRef.current,
        nextHtml
      );
      previousHtmlRef.current = nextHtml;
      onChange(nextHtml);

      if (orphanedUrls.length > 0) {
        void cleanupSuggestionImages(orphanedUrls).catch(() => undefined);
      }
    },
    [onChange]
  );

  return { handleChange, syncHtml };
}
