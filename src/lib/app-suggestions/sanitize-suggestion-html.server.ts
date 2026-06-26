import "server-only";

import sanitizeHtml from "sanitize-html";
import {
  isAllowedSuggestionImageSrc,
  SUGGESTION_IMAGE_ALLOWED_TYPES,
} from "@/lib/app-suggestions/rich-text";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "blockquote",
  "h2",
  "h3",
  "span",
];

export function sanitizeSuggestionHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title"],
      span: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["https"],
    },
    transformTags: {
      img: (_tagName, attribs) => {
        const src = attribs.src ?? "";
        if (!isAllowedSuggestionImageSrc(src)) {
          return { tagName: "", attribs: {} };
        }
        return {
          tagName: "img",
          attribs: {
            src,
            alt: attribs.alt ?? "",
          },
        };
      },
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          href: attribs.href ?? "",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
  }).trim();
}

export { SUGGESTION_IMAGE_ALLOWED_TYPES };