import { sanitizeSuggestionHtml } from "@/lib/app-suggestions/sanitize-suggestion-html.server";
import { stripSuggestionHtmlText } from "@/lib/app-suggestions/rich-text";

describe("sanitize-suggestion-html.server", () => {
  it("sanitizes unsafe html", () => {
    const sanitized = sanitizeSuggestionHtml(
      '<p>Hello</p><script>alert("x")</script><img src="javascript:evil" />'
    );
    expect(sanitized).toContain("<p>Hello</p>");
    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("javascript:");
  });

  it("keeps allowed firebase image urls", () => {
    const sanitized = sanitizeSuggestionHtml(
      '<img src="https://firebasestorage.googleapis.com/v0/b/demo/o/img.png?alt=media&token=abc" alt="capture" />'
    );
    expect(sanitized).toContain("firebasestorage.googleapis.com");
  });

  it("strips tags for plain text extraction", () => {
    expect(stripSuggestionHtmlText("<p>Bonjour <strong>club</strong></p>")).toBe(
      "Bonjour club"
    );
  });
});
