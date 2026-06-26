import {
  collectOrphanedSuggestionImageUrls,
  extractSuggestionImageUrlsFromHtml,
  isSuggestionImageOwnedByUid,
  resolveSuggestionImageObjectPath,
} from "@/lib/app-suggestions/suggestion-image-urls";

describe("suggestion-image-urls", () => {
  it("extrait les src des balises img", () => {
    expect(
      extractSuggestionImageUrlsFromHtml(
        '<p>Test</p><img src="https://storage.googleapis.com/bucket/app-suggestions/u1/a.jpg" />'
      )
    ).toEqual(["https://storage.googleapis.com/bucket/app-suggestions/u1/a.jpg"]);
  });

  it("résout un chemin storage.googleapis.com", () => {
    expect(
      resolveSuggestionImageObjectPath(
        "https://storage.googleapis.com/my-bucket/app-suggestions/uid-1/photo.png"
      )
    ).toBe("app-suggestions/uid-1/photo.png");
  });

  it("détecte la propriété par uid", () => {
    const url =
      "https://storage.googleapis.com/my-bucket/app-suggestions/user-a/file.jpg";
    expect(isSuggestionImageOwnedByUid(url, "user-a")).toBe(true);
    expect(isSuggestionImageOwnedByUid(url, "user-b")).toBe(false);
  });

  it("liste les images retirées du HTML", () => {
    const previous =
      '<img src="https://storage.googleapis.com/b/a/app-suggestions/u1/old.jpg" /><img src="https://storage.googleapis.com/b/a/app-suggestions/u1/keep.jpg" />';
    const next =
      '<img src="https://storage.googleapis.com/b/a/app-suggestions/u1/keep.jpg" />';

    expect(collectOrphanedSuggestionImageUrls(previous, next)).toEqual([
      "https://storage.googleapis.com/b/a/app-suggestions/u1/old.jpg",
    ]);
  });
});
