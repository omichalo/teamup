"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardActionArea,
  CardContent,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";
import { LicenseValidationLineSecondaryText } from "@/components/license-validation/LicenseValidationLineSecondaryText";

type Props = {
  selectedId: string | null;
  onSelectRegistration: (id: string) => void;
};

export function LicenseValidationPaymentSearchPanel({
  selectedId,
  onSelectRegistration,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LicenseValidationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 2) {
      setError("Saisissez au moins 2 caractères (nom ou numéro de licence).");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch("/api/club/license-validations/search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 12 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Recherche impossible");
      }
      setResults((json.registrations ?? []) as LicenseValidationListItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Rechercher par licence ou nom"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        fullWidth
        size="medium"
        autoFocus
        placeholder="Ex. Dupont, 1234567"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            void handleSearch();
          }
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <Button
        variant="contained"
        size="large"
        onClick={() => void handleSearch()}
        disabled={loading}
        fullWidth
      >
        {loading ? "Recherche…" : "Rechercher un adhérent"}
      </Button>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {searched && !loading && results.length === 0 ? (
        <Typography color="text.secondary">Aucun dossier correspondant.</Typography>
      ) : null}

      {results.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            {results.length} résultat{results.length > 1 ? "s" : ""}
          </Typography>
          {results.map((registration) => {
            const name = [registration.firstName, registration.lastName]
              .filter(Boolean)
              .join(" ");
            const selected = registration.id === selectedId;
            return (
              <Card
                key={registration.id}
                variant="outlined"
                sx={{
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "action.selected" : "background.paper",
                }}
              >
                <CardActionArea onClick={() => onSelectRegistration(registration.id)}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {name || "Adhérent"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <LicenseValidationLineSecondaryText
                        registration={registration}
                      />
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      ) : null}
    </Stack>
  );
}
