"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { AppSuggestionDetail } from "@/lib/app-suggestions/types";
import { SUGGESTION_STATUSES } from "@/lib/app-suggestions/types";
import { SUGGESTION_STATUS_LABELS } from "@/lib/app-suggestions/status";
import { SuggestionPriorityField } from "@/components/app-suggestions/SuggestionPriorityField";

type Props = {
  detail: AppSuggestionDetail;
  onPatchMaintainer: (
    patch: Partial<{
      status: AppSuggestionDetail["status"];
      priority: AppSuggestionDetail["priority"];
      maintainerNote: string | null;
      githubIssueUrl: string | null;
    }>
  ) => Promise<void>;
};

export function SuggestionMaintainerTriageSection({
  detail,
  onPatchMaintainer,
}: Props) {
  const [maintainerNote, setMaintainerNote] = useState("");
  const [githubIssueUrl, setGithubIssueUrl] = useState("");
  const [status, setStatus] = useState<AppSuggestionDetail["status"]>("received");
  const [priority, setPriority] = useState<AppSuggestionDetail["priority"]>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMaintainerNote(detail.maintainerNote ?? "");
    setGithubIssueUrl(detail.githubIssueUrl ?? "");
    setStatus(detail.status);
    setPriority(detail.priority);
    setError(null);
    setSuccess(null);
  }, [detail]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await onPatchMaintainer({
        status,
        priority,
        maintainerNote: maintainerNote.trim().length > 0 ? maintainerNote : null,
        githubIssueUrl: githubIssueUrl.trim().length > 0 ? githubIssueUrl : null,
      });
      setSuccess("Mise à jour enregistrée.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible de mettre à jour le triage"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Divider />
      <Stack spacing={1.5}>
        <Typography variant="h6" component="h3">
          Triage mainteneur
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            select
            label="Statut"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AppSuggestionDetail["status"])
            }
            fullWidth
          >
            {SUGGESTION_STATUSES.map((value) => (
              <MenuItem key={value} value={value}>
                {SUGGESTION_STATUS_LABELS[value]}
              </MenuItem>
            ))}
          </TextField>
          <SuggestionPriorityField
            value={priority}
            onChange={setPriority}
            disabled={submitting}
          />
        </Stack>
        <TextField
          label="Note officielle (équipe technique)"
          value={maintainerNote}
          onChange={(event) => setMaintainerNote(event.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
        <TextField
          label="Lien GitHub (optionnel)"
          value={githubIssueUrl}
          onChange={(event) => setGithubIssueUrl(event.target.value)}
          fullWidth
        />
        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}
        <Box>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            Enregistrer le triage
          </Button>
        </Box>
      </Stack>
    </>
  );
}
