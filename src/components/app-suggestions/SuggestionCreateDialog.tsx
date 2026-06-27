"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { SuggestionCategory, SuggestionKind, SuggestionPriority } from "@/lib/app-suggestions/types";
import { isValidSuggestionCategory } from "@/lib/app-suggestions/categories";
import { stripSuggestionHtmlText } from "@/lib/app-suggestions/rich-text";
import { SuggestionCategoryField } from "@/components/app-suggestions/SuggestionCategoryField";
import { SuggestionPriorityField } from "@/components/app-suggestions/SuggestionPriorityField";
import { SuggestionRichTextEditor } from "@/components/app-suggestions/rich-text/SuggestionRichTextEditor";
import { cleanupAllDraftSuggestionImages } from "@/components/app-suggestions/rich-text/draft-image-cleanup";

type SuggestionCreateDialogProps = {
  open: boolean;
  kind: SuggestionKind;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    description: string;
    kind: SuggestionKind;
    category: SuggestionCategory;
    priority: SuggestionPriority;
  }) => Promise<void>;
};

const DIALOG_COPY: Record<
  SuggestionKind,
  {
    title: string;
    intro: string;
    titleLabel: string;
    titlePlaceholder: string;
    submitError: string;
  }
> = {
  improvement: {
    title: "Nouvelle idée d'amélioration",
    intro:
      "Proposez une évolution de l'application. Vous pouvez mettre en forme le texte, ajouter des emojis et insérer des images.",
    titleLabel: "Titre de l'idée",
    titlePlaceholder: "Ex. Export Excel des adhésions",
    submitError: "Impossible de créer l'idée",
  },
  problem: {
    title: "Signaler un problème",
    intro:
      "Décrivez le dysfonctionnement rencontré (écran, action, message d'erreur…). Des captures d'écran aident l'équipe à reproduire le cas.",
    titleLabel: "Résumé du problème",
    titlePlaceholder: "Ex. Le bouton Enregistrer ne répond plus",
    submitError: "Impossible d'envoyer la remontée",
  },
};

export function SuggestionCreateDialog({
  open,
  kind,
  onClose,
  onSubmit,
}: SuggestionCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("<p></p>");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<SuggestionPriority>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = DIALOG_COPY[kind];

  const reset = () => {
    setTitle("");
    setDescriptionHtml("<p></p>");
    setCategory("");
    setPriority("medium");
    setError(null);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    reset();
  }, [open, kind]);

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
  const canSubmit =
    title.trim().length >= 3 &&
    descriptionTextLength >= 10 &&
    isValidSuggestionCategory(category);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title,
        description: descriptionHtml,
        kind,
        category,
        priority,
      });
      reset();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : copy.submitError
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>{copy.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {copy.intro}
          </Typography>

          <TextField
            label={copy.titleLabel}
            placeholder={copy.titlePlaceholder}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            fullWidth
            autoFocus
          />

          <SuggestionCategoryField
            value={category}
            onChange={setCategory}
            required
            disabled={submitting}
          />

          <SuggestionPriorityField
            value={priority}
            onChange={setPriority}
            disabled={submitting}
            required
          />

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
