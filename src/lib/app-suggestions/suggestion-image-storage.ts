import { getStorageBucketAdmin } from "@/lib/firebase-admin";
import {
  collectOrphanedSuggestionImageUrls,
  extractSuggestionImageUrlsFromHtml,
  isSuggestionImageOwnedByUid,
  resolveSuggestionImageObjectPath,
} from "@/lib/app-suggestions/suggestion-image-urls";

export {
  collectOrphanedSuggestionImageUrls,
  extractSuggestionImageUrlsFromHtml,
  isSuggestionImageOwnedByUid,
  resolveSuggestionImageObjectPath,
};

export async function deleteSuggestionImagesForUid(
  uid: string,
  imageUrls: string[]
): Promise<void> {
  const bucket = getStorageBucketAdmin();
  const deletions = imageUrls
    .filter((url) => isSuggestionImageOwnedByUid(url, uid))
    .map(async (url) => {
      const objectPath = resolveSuggestionImageObjectPath(url);
      if (!objectPath) {
        return;
      }
      try {
        await bucket.file(objectPath).delete({ ignoreNotFound: true });
      } catch (error) {
        if (process.env.NODE_ENV === "development" && process.env.DEBUG === "true") {
          console.log("[suggestion-image-storage] delete skipped", { objectPath });
        }
        console.error("[suggestion-image-storage] delete failed", error);
      }
    });

  await Promise.all(deletions);
}
