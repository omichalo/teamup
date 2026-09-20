"use client";

import { useEffect, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import { readJsonResponse } from "@/lib/http/read-json-response";
import {
  SUGGESTION_EMAIL_PREFERENCE_LABELS,
  SUGGESTION_EMAIL_PREFERENCES,
  type SuggestionEmailPreference,
} from "@/lib/app-suggestions/email-preferences";

type Props = {
  disabled?: boolean;
};

export function SuggestionEmailPreferenceSelect({ disabled = false }: Props) {
  const [preference, setPreference] =
    useState<SuggestionEmailPreference>("all");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/club/suggestions/preferences", {
          credentials: "include",
        });
        const payload = await readJsonResponse<{
          preference?: SuggestionEmailPreference;
        }>(response);
        if (!cancelled && response.ok && payload.preference) {
          setPreference(payload.preference);
        }
      } catch {
        // conserve la valeur par défaut
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = async (event: SelectChangeEvent) => {
    const next = event.target.value as SuggestionEmailPreference;
    setPreference(next);
    setSaving(true);
    try {
      await fetch("/api/club/suggestions/preferences", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference: next }),
      });
    } catch {
      // ignore — la prochaine ouverture rechargera
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 260 } }}>
      <InputLabel id="suggestion-email-pref-label">E-mails</InputLabel>
      <Select
        labelId="suggestion-email-pref-label"
        label="E-mails"
        value={preference}
        onChange={(event) => void handleChange(event)}
        disabled={disabled || saving}
        sx={{ bgcolor: "background.paper" }}
      >
        {SUGGESTION_EMAIL_PREFERENCES.map((value) => (
          <MenuItem key={value} value={value}>
            {SUGGESTION_EMAIL_PREFERENCE_LABELS[value]}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
