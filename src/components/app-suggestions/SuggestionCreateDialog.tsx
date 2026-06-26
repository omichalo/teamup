"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { SUGGESTION_CATEGORIES, type SuggestionCategory } from "@/lib/app-suggestions/types";
import { SUGGESTION_CATEGORY_LABELS } from "@/lib/app-suggestions/status";
import { stripSuggestionHtmlText } from "@/lib/app-suggestions/rich-text";
import { SuggestionRichTextEditor } from "@/components/app-suggestions/rich-text/SuggestionRichTextEditor";
import { cleanupAllDraftSuggestionImages } from "@/components/app-suggestions/rich-text/draft-image-cleanup";

type SuggestionCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    description: string;
    category: SuggestionCategory;
  }) => Promise<void>;
};

export function SuggestionCreateDialog({
  open,
  onClose,
  onSubmit,
}: SuggestionCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("<p></p>");
  const [category, setCategory] = useState<SuggestionCategory>("autre");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setDescriptionHtml("<p></p>");
    setCategory("autre");
    setError(null);
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }
    const draftHtml = descriptionHtml;
    reset();
    onClose();
    void cleanupAllDraftSuggestionImages(draftHtml).catch(() => undefined);
  };

  const descriptionTextLength = stripSuggestionHtmlText(descriptionHtml).length;
  const canSubmit = title.trim().length >= 3 && descriptionTextLength >= 10;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title,
        description: descriptionHtml,
        category,
      });
      reset();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible de créer l'idée"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Nouvelle idée d&apos;amélioration</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Rédigez librement votre idée. Vous pouvez mettre en forme le texte,
            ajouter des emojis et insérer des images.
          </Typography>

          <TextField
            label="Titre"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            fullWidth
            autoFocus
          />

          <TextField
            select
            label="Catégorie"
            value={category}
            onChange={(event) => setCategory(event.target.value as SuggestionCategory)}
            fullWidth
          >
            {SUGGESTION_CATEGORIES.map((value) => (
              <MenuItem key={value} value={value}>
                {SUGGESTION_CATEGORY_LABELS[value]}
              </MenuItem>
            ))}
          </TextField>

          <Stack spacing={0.75}>
            <Typography variant="subtitle2">Description</Typography>
            <SuggestionRichTextEditor
              value={descriptionHtml}
              onChange={setDescriptionHtml}
              disabled={submitting}
            />
            <Typography variant="caption" color="text.secondary">
              {descriptionTextLength} caractères (10 minimum hors mise en forme)
            </Typography>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={submitting || !canSubmit}
        >
          Envoyer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
