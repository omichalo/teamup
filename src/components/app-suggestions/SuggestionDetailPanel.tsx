"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { OpenInNew as OpenInNewIcon } from "@mui/icons-material";
import type { AppSuggestionDetail, SuggestionCategory } from "@/lib/app-suggestions/types";
import {
  formatSuggestionCategoryLabel,
  SUGGESTION_KIND_COLORS,
  SUGGESTION_KIND_LABELS,
  SUGGESTION_STATUS_COLORS,
  SUGGESTION_STATUS_LABELS,
  isAuthorEditableStatus,
} from "@/lib/app-suggestions/status";
import { isValidSuggestionCategory } from "@/lib/app-suggestions/categories";
import { SuggestionCategoryField } from "@/components/app-suggestions/SuggestionCategoryField";
import { formatSuggestionDate } from "@/components/app-suggestions/format-utils";
import { SuggestionDetailEmptyState } from "@/components/app-suggestions/SuggestionDetailEmptyState";
import { SuggestionDetailCommentsSection } from "@/components/app-suggestions/SuggestionDetailCommentsSection";
import { suggestionContentSurfaceSx } from "@/components/app-suggestions/suggestions-surface-styles";
import { cleanupDraftSuggestionImages } from "@/components/app-suggestions/rich-text/draft-image-cleanup";
import { SuggestionMaintainerTriageSection } from "@/components/app-suggestions/SuggestionMaintainerTriageSection";
import { SuggestionStatusHistorySection } from "@/components/app-suggestions/SuggestionStatusHistorySection";
import { SuggestionRichTextEditor } from "@/components/app-suggestions/rich-text/SuggestionRichTextEditor";
import { SuggestionRichTextContent } from "@/components/app-suggestions/rich-text/SuggestionRichTextContent";
import { stripSuggestionHtmlText } from "@/lib/app-suggestions/rich-text";

type SuggestionDetailPanelProps = {
  detail: AppSuggestionDetail | null;
  loading: boolean;
  error: string | null;
  isMaintainer: boolean;
  canEditContent: boolean;
  viewerUid: string | null;
  onAddComment: (body: string) => Promise<void>;
  onPatchAuthor: (
    patch: Partial<{
      title: string;
      description: string;
      category: SuggestionCategory;
    }>
  ) => Promise<void>;
  onPatchMaintainer: (
    patch: Partial<{
      status: AppSuggestionDetail["status"];
      priority: AppSuggestionDetail["priority"];
      maintainerNote: string | null;
      githubIssueUrl: string | null;
    }>
  ) => Promise<void>;
};

export function SuggestionDetailPanel({
  detail,
  loading,
  error,
  isMaintainer,
  canEditContent,
  viewerUid,
  onAddComment,
  onPatchAuthor,
  onPatchMaintainer,
}: SuggestionDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescriptionHtml, setEditDescriptionHtml] = useState("<p></p>");
  const [editCategory, setEditCategory] = useState("");
  const [authorSubmitting, setAuthorSubmitting] = useState(false);
  const [authorError, setAuthorError] = useState<string | null>(null);
  const [authorSuccess, setAuthorSuccess] = useState<string | null>(null);
  const detailId = detail?.id ?? null;

  useEffect(() => {
    if (!detail || isEditing) {
      return;
    }
    setEditTitle(detail.title);
    setEditDescriptionHtml(detail.description || "<p></p>");
    setEditCategory(detail.category);
  }, [detail, isEditing]);

  useEffect(() => {
    if (!detailId) {
      setIsEditing(false);
      setAuthorError(null);
      setAuthorSuccess(null);
      return;
    }
    setIsEditing(false);
    setAuthorError(null);
    setAuthorSuccess(null);
  }, [detailId]);

  if (loading && !detail) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!detail) {
    return <SuggestionDetailEmptyState />;
  }

  const handleAuthorSubmit = async () => {
    setAuthorSubmitting(true);
    setAuthorError(null);
    setAuthorSuccess(null);
    try {
      await onPatchAuthor({
        title: editTitle,
        description: editDescriptionHtml,
        category: editCategory,
      });
      setIsEditing(false);
      setAuthorSuccess("Modifications enregistrées.");
    } catch (submitError) {
      setAuthorError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible de mettre à jour l'idée"
      );
    } finally {
      setAuthorSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    if (!detail) {
      return;
    }
    const draftHtml = editDescriptionHtml;
    const referenceHtml = detail.description || "<p></p>";
    setEditTitle(detail.title);
    setEditDescriptionHtml(referenceHtml);
    setEditCategory(detail.category);
    setAuthorError(null);
    setIsEditing(false);
    void cleanupDraftSuggestionImages(draftHtml, referenceHtml).catch(() => undefined);
  };

  const editDescriptionTextLength = stripSuggestionHtmlText(editDescriptionHtml).length;
  const canSaveAuthorEdit =
    editTitle.trim().length >= 3 &&
    editDescriptionTextLength >= 10 &&
    isValidSuggestionCategory(editCategory);

  const isAuthor =
    viewerUid !== null && detail.submitterUid === viewerUid;
  const showAuthorLockedNotice =
    isAuthor &&
    !isMaintainer &&
    !canEditContent &&
    !isAuthorEditableStatus(detail.status);

  return (
    <Stack spacing={3}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          {isEditing ? (
            <TextField
              label="Titre"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              required
              fullWidth
              sx={{ flex: 1 }}
            />
          ) : (
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
              {detail.title}
            </Typography>
          )}
          <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
            {!isEditing && canEditContent ? (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsEditing(true)}
              >
                Modifier
              </Button>
            ) : null}
            <Chip
              label={SUGGESTION_STATUS_LABELS[detail.status]}
              color={SUGGESTION_STATUS_COLORS[detail.status]}
              sx={{ fontWeight: 600 }}
            />
          </Stack>
        </Stack>
        {isEditing ? (
          <SuggestionCategoryField
            value={editCategory}
            onChange={setEditCategory}
            required
            disabled={authorSubmitting}
          />
        ) : (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Chip
              label={SUGGESTION_KIND_LABELS[detail.kind]}
              size="small"
              color={SUGGESTION_KIND_COLORS[detail.kind]}
            />
            <Chip
              label={formatSuggestionCategoryLabel(detail.category)}
              size="small"
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              {detail.submitterDisplayName || "Utilisateur"} ·{" "}
              {formatSuggestionDate(detail.createdAt)}
            </Typography>
          </Stack>
        )}
      </Stack>

      {isEditing ? (
        <Stack spacing={1.5}>
          <Alert severity="info">
            Modifiez le titre, la catégorie ou la description puis cliquez sur
            « Enregistrer ». « Annuler » restaure la version affichée.
          </Alert>
          <Typography variant="subtitle2" fontWeight={600}>
            Description
          </Typography>
          <SuggestionRichTextEditor
            value={editDescriptionHtml}
            onChange={setEditDescriptionHtml}
            disabled={authorSubmitting}
          />
          <Typography variant="caption" color="text.secondary">
            {editDescriptionTextLength} caractères (10 minimum hors mise en forme)
          </Typography>
          {authorError ? <Alert severity="error">{authorError}</Alert> : null}
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={() => void handleAuthorSubmit()}
              disabled={authorSubmitting || !canSaveAuthorEdit}
            >
              Enregistrer
            </Button>
            <Button onClick={handleCancelEdit} disabled={authorSubmitting}>
              Annuler
            </Button>
          </Stack>
        </Stack>
      ) : (
        <>
          <Box sx={suggestionContentSurfaceSx}>
            <SuggestionRichTextContent
              html={detail.description}
              format={detail.descriptionFormat}
            />
          </Box>
          {showAuthorLockedNotice ? (
            <Alert severity="info">
              Ce retour est en cours de traitement. Pour une correction, ajoutez un
              commentaire ou contactez un mainteneur.
            </Alert>
          ) : null}
          {authorSuccess ? <Alert severity="success">{authorSuccess}</Alert> : null}
        </>
      )}

      {detail.maintainerNote ? (
        <Alert
          severity="info"
          sx={{
            alignItems: "flex-start",
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Note de l&apos;équipe technique
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {detail.maintainerNote}
          </Typography>
        </Alert>
      ) : null}

      {detail.githubIssueUrl ? (
        <Link
          href={detail.githubIssueUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            fontWeight: 600,
          }}
        >
          Suivi GitHub
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </Link>
      ) : null}

      <SuggestionDetailCommentsSection
        comments={detail.comments}
        onAddComment={onAddComment}
      />

      <SuggestionStatusHistorySection
        currentStatus={detail.status}
        history={detail.statusHistory}
        statusUpdatedAt={detail.statusUpdatedAt}
        statusUpdatedByDisplayName={detail.statusUpdatedByDisplayName}
      />

      {isMaintainer ? (
        <SuggestionMaintainerTriageSection
          detail={detail}
          onPatchMaintainer={onPatchMaintainer}
        />
      ) : null}
    </Stack>
  );
}
