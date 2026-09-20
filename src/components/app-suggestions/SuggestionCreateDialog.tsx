"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type {
  SuggestionCategory,
  SuggestionDomain,
  SuggestionKind,
} from "@/lib/app-suggestions/types";
import { isValidSuggestionCategory } from "@/lib/app-suggestions/categories";
import { stripSuggestionHtmlText } from "@/lib/app-suggestions/rich-text";
import { SuggestionCategoryField } from "@/components/app-suggestions/SuggestionCategoryField";
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
    domain: SuggestionDomain;
    category: SuggestionCategory;
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
    title: "Nouvelle idée",
    intro:
      "Décrivez ce que vous aimeriez pouvoir faire, pourquoi c’est utile, et éventuellement comment vous l’imaginez.",
    titleLabel: "Titre de l'idée",
    titlePlaceholder: "Ex. Export Excel des adhésions",
    submitError: "Impossible de créer l'idée",
  },
  problem: {
    title: "Signaler un problème",
    intro:
      "Expliquez ce qui ne fonctionne pas, ce que vous essayiez de faire, le résultat attendu et celui obtenu. Une capture d’écran aide souvent.",
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
  const [domain, setDomain] = useState<SuggestionDomain>("app");
  const [category, setCategory] = useState("autre");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = DIALOG_COPY[kind];

  const reset = () => {
    setTitle("");
    setDescriptionHtml("<p></p>");
    setDomain("app");
    setCategory("autre");
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
        domain,
        category,
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

          <FormControl>
            <FormLabel id="suggestion-domain-label">Concerne</FormLabel>
            <RadioGroup
              aria-labelledby="suggestion-domain-label"
              row
              value={domain}
              onChange={(event) =>
                setDomain(event.target.value as SuggestionDomain)
              }
            >
              <FormControlLabel
                value="app"
                control={<Radio />}
                label="L'application TeamUp"
                disabled={submitting}
              />
              <FormControlLabel
                value="club"
                control={<Radio />}
                label="La vie du club"
                disabled={submitting}
              />
            </RadioGroup>
          </FormControl>

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
            allowCustom={false}
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
