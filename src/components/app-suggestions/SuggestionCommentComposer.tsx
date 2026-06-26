"use client";

import { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { stripSuggestionHtmlText } from "@/lib/app-suggestions/rich-text";
import { extractSuggestionImageUrlsFromHtml } from "@/lib/app-suggestions/suggestion-image-urls";
import { SuggestionRichTextEditor } from "@/components/app-suggestions/rich-text/SuggestionRichTextEditor";
import { cleanupAllDraftSuggestionImages } from "@/components/app-suggestions/rich-text/draft-image-cleanup";

type SuggestionCommentComposerProps = {
  disabled?: boolean;
  onSubmit: (bodyHtml: string) => Promise<void>;
};

export function SuggestionCommentComposer({
  disabled = false,
  onSubmit,
}: SuggestionCommentComposerProps) {
  const [bodyHtml, setBodyHtml] = useState("<p></p>");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textLength = stripSuggestionHtmlText(bodyHtml).length;
  const canSubmit = textLength >= 1;
  const hasDraft =
    canSubmit || extractSuggestionImageUrlsFromHtml(bodyHtml).length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(bodyHtml);
      setBodyHtml("<p></p>");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible d'ajouter le commentaire"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    const draftHtml = bodyHtml;
    setBodyHtml("<p></p>");
    setError(null);
    void cleanupAllDraftSuggestionImages(draftHtml).catch(() => undefined);
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
      }}
    >
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={600}>
          Ajouter un commentaire
        </Typography>
        <SuggestionRichTextEditor
          value={bodyHtml}
          onChange={setBodyHtml}
          disabled={disabled || submitting}
          minHeight={120}
          placeholder="Réagissez, précisez un besoin, ajoutez une capture…"
        />
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={disabled || submitting || !canSubmit}
          >
            Publier
          </Button>
          <Button
            variant="text"
            onClick={handleClear}
            disabled={disabled || submitting || !hasDraft}
          >
            Effacer
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
