import { z } from "zod";
import { sanitizeSuggestionHtml } from "@/lib/app-suggestions/sanitize-suggestion-html.server";
import {
  SUGGESTION_COMMENT_HTML_MAX_LENGTH,
  SUGGESTION_COMMENT_MIN_TEXT_LENGTH,
  SUGGESTION_DESCRIPTION_HTML_MAX_LENGTH,
  SUGGESTION_DESCRIPTION_MIN_TEXT_LENGTH,
  stripSuggestionHtmlText,
} from "@/lib/app-suggestions/rich-text";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_PRIORITIES,
  SUGGESTION_STATUSES,
} from "@/lib/app-suggestions/types";

const titleSchema = z
  .string()
  .trim()
  .min(3, "Le titre doit contenir au moins 3 caractères")
  .max(120, "Le titre ne peut pas dépasser 120 caractères");

function buildRichHtmlSchema(options: {
  maxLength: number;
  minTextLength: number;
  tooLongMessage: string;
  tooShortMessage: string;
}) {
  return z
    .string()
    .max(options.maxLength, options.tooLongMessage)
    .transform((value) => sanitizeSuggestionHtml(value))
    .refine((value) => stripSuggestionHtmlText(value).length >= options.minTextLength, {
      message: options.tooShortMessage,
    });
}

const richDescriptionSchema = buildRichHtmlSchema({
  maxLength: SUGGESTION_DESCRIPTION_HTML_MAX_LENGTH,
  minTextLength: SUGGESTION_DESCRIPTION_MIN_TEXT_LENGTH,
  tooLongMessage: "La description est trop longue",
  tooShortMessage: `La description doit contenir au moins ${SUGGESTION_DESCRIPTION_MIN_TEXT_LENGTH} caractères`,
});

const richCommentBodySchema = buildRichHtmlSchema({
  maxLength: SUGGESTION_COMMENT_HTML_MAX_LENGTH,
  minTextLength: SUGGESTION_COMMENT_MIN_TEXT_LENGTH,
  tooLongMessage: "Le commentaire est trop long",
  tooShortMessage: "Le commentaire ne peut pas être vide",
});

const plainDescriptionSchema = z
  .string()
  .trim()
  .min(
    SUGGESTION_DESCRIPTION_MIN_TEXT_LENGTH,
    `La description doit contenir au moins ${SUGGESTION_DESCRIPTION_MIN_TEXT_LENGTH} caractères`
  )
  .max(8000, "La description ne peut pas dépasser 8000 caractères");

const categorySchema = z.enum(SUGGESTION_CATEGORIES);

const githubIssueUrlSchema = z
  .string()
  .trim()
  .url("Lien GitHub invalide")
  .max(500)
  .nullable();

const maintainerNoteSchema = z
  .string()
  .trim()
  .max(2000, "La note ne peut pas dépasser 2000 caractères")
  .nullable();

export const suggestionCreateSchema = z.object({
  title: titleSchema,
  description: richDescriptionSchema,
  category: categorySchema,
});

export type SuggestionCreateInput = z.infer<typeof suggestionCreateSchema>;

export const suggestionAuthorPatchSchema = z
  .object({
    title: titleSchema.optional(),
    description: richDescriptionSchema.optional(),
    category: categorySchema.optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.category !== undefined,
    { message: "Aucune modification fournie" }
  );

export type SuggestionAuthorPatchInput = z.infer<
  typeof suggestionAuthorPatchSchema
>;

export const suggestionMaintainerPatchSchema = z
  .object({
    status: z.enum(SUGGESTION_STATUSES).optional(),
    priority: z.enum(SUGGESTION_PRIORITIES).optional(),
    maintainerNote: maintainerNoteSchema.optional(),
    githubIssueUrl: githubIssueUrlSchema.optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.priority !== undefined ||
      value.maintainerNote !== undefined ||
      value.githubIssueUrl !== undefined,
    { message: "Aucune modification fournie" }
  );

export type SuggestionMaintainerPatchInput = z.infer<
  typeof suggestionMaintainerPatchSchema
>;

export const suggestionCommentCreateSchema = z.object({
  body: richCommentBodySchema,
});

export type SuggestionCommentCreateInput = z.infer<
  typeof suggestionCommentCreateSchema
>;

export { plainDescriptionSchema };
